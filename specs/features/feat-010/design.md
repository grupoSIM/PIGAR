# Diseño — feat-010: Calificaciones e incidencias de postventa

- Estado: `done`.
- Arquitectura: `approved_with_conditions`.
- Límite: diseño de postventa dentro del portal, sin garantía, dinero, nueva
  orden, proveedor, canal, multimedia ni outbox.

## Resumen

La postventa se modela fuera del agregado `WorkOrder`. Una calificación es un
registro único e inmutable de la orden cerrada. Una incidencia es un registro
estructurado con estado actual/versionado y un historial append-only propio.
Ambos conservan referencias restrictivas a la orden y al CLIENT propietario,
pero no ejecutan comandos sobre orden, pago, cargo o conformidad.

La API aplica autenticación, rol, propiedad y estado `CERRADA` en servidor. La
interfaz sólo presenta capacidades devueltas por esas consultas; ocultar un
control no concede ni revoca permisos.

## Decisiones y alternativas

- Se separan `OrderRating` y `AftercareIncident` de `WorkOrder`: incorporar la
  postventa a su máquina de estados rompería el cierre autoritativo aprobado.
- Se admite una calificación total por orden. Un reemplazo o edición se rechaza;
  no se implementa promedio público ni perfil de técnico.
- Una incidencia activa por orden se protege con restricción parcial. Tras un
  cierre puede existir otra incidencia nueva, pero nunca se reabre la anterior.
- El ciclo mínimo es `ABIERTA -> EN_TRIAGE -> CERRADA`; no se agregan prioridad,
  SLA, asignatario, comentario ni resultado comercial.
- Los motivos/tipos son enums versionados en contrato. `OTRO` existe sólo para
  calificación y es el único texto libre del incremento.
- No se reutiliza la bandeja de feat-009: consultar postventa requiere abrir la
  orden o bandeja administrativa. Ningún comando emite outbox o aviso.
- No se selecciona proveedor, almacenamiento nuevo, credencial ni canal.

## Componentes futuros afectados

- `apps/api`: contratos, validación, autorización, idempotencia y servicios de
  calificación/incidencia.
- `apps/customer-web`: sección de postventa dentro del detalle de orden cerrada.
- `apps/admin-web`: consulta de soporte y bandeja estructurada de incidencias.
- `apps/api/prisma`: migración aditiva, constraints, índices y triggers
  append-only.
- Contratos compartidos, pruebas y observabilidad sanitizada.

`apps/worker`, adaptadores de pago, Mercado Pago y el outbox de feat-009 no se
modifican por este alcance.

## Modelo de dominio y datos

### `OrderRating`

Campos mínimos:

- `id` UUID opaco.
- `workOrderId` FK `RESTRICT`, `UNIQUE`.
- `clientProfileId` FK `RESTRICT`.
- `stars` small integer con check 1..5.
- `reason` enum/check de motivo v1.
- `otherMessage` nullable, máximo 100 puntos de código normalizados; debe ser no
  null sólo con `OTRO`.
- `createdAt` UTC de servidor.

La base impide `UPDATE` y `DELETE` mediante trigger append-only. La aplicación
verifica que `clientProfileId` sea el propietario vigente de la orden antes de
insertar. `UNIQUE(workOrderId)` expresa que sólo su propietario puede calificar
y que una orden nunca acumula dos calificaciones.

### `AftercareIncident`

Campos mínimos:

- `id` UUID opaco.
- `workOrderId` y `clientProfileId`, FKs `RESTRICT`.
- `type` enum/check de tipo v1.
- `status`: `ABIERTA`, `EN_TRIAGE` o `CERRADA`.
- `version` entero positivo.
- `createdAt`, `updatedAt` y `closedAt` nullable, UTC de servidor.

`workOrderId`, propietario y tipo son inmutables. Sólo estado, versión y marcas
UTC cambian mediante el comando de transición. Un índice único parcial sobre
`work_order_id WHERE status IN ('ABIERTA','EN_TRIAGE')` garantiza una incidencia
activa por orden incluso bajo concurrencia.

### `AftercareIncidentTransition`

Campos mínimos:

- `id`, `incidentId` FK `RESTRICT`, `sequence`.
- `action`: `OPEN`, `START_TRIAGE` o `CLOSE`.
- `fromStatus` nullable y `toStatus`.
- `actorType`, `actorProfileId` opaco.
- `createdAt` UTC.

`UNIQUE(incidentId, sequence)` y trigger append-only impiden reordenar, editar o
borrar historial. El primer evento es `OPEN`, `null -> ABIERTA`.

### `AftercareIdempotencyReservation`

Campos mínimos: actor opaco, scope de operación, clave, fingerprint del request
canónico, referencia de resultado, estado y UTC. `UNIQUE(actor, scope, key)`.
Nunca guarda una copia adicional de `otherMessage`, no aparece en logs y usa la
misma política de retención del resultado. Una implementación puede reutilizar
la infraestructura idempotente existente sólo si conserva este contrato.

### Índices

- Rating por `workOrderId` y por `(clientProfileId, createdAt DESC, id DESC)` si
  una consulta futura autorizada lo requiere; no existe índice público.
- Incidencias CLIENT por `(clientProfileId, createdAt DESC, id DESC)`.
- Bandeja operativa por `(status, createdAt DESC, id DESC)` y filtro por `type`.
- Historial por `(incidentId, sequence)`.

No se duplica domicilio, contacto, datos del técnico, pago, cargo, conformidad o
contenido de otras features.

## Máquina de estados y transiciones

```text
WorkOrder: CERRADA (sin transición ni incremento de versión)

Rating: ABSENT --CLIENT owner + idempotency--> CREATED (terminal)

Incident:
ABSENT --OPEN by CLIENT owner--> ABIERTA
ABIERTA --START_TRIAGE by ADMIN/DISPATCHER--> EN_TRIAGE
EN_TRIAGE --CLOSE by ADMIN/DISPATCHER--> CERRADA (terminal)
```

Crear otra incidencia sólo se evalúa cuando ninguna fila activa existe. El nuevo
registro comienza en `ABIERTA`; no reutiliza ni reabre el cerrado.

## API, eventos y contratos externos

El contrato normativo está en `api-contract.yaml`:

- `POST/GET /v1/requests/{requestId}/rating`.
- `POST/GET /v1/requests/{requestId}/incidents`.
- `GET /v1/admin/orders/{orderId}/aftercare`.
- `GET /v1/admin/incidents`.
- `POST /v1/admin/incidents/{incidentId}/transitions`.

Todas las escrituras requieren `Idempotency-Key`; las transiciones además
requieren `expectedVersion`. Los DTO usan `additionalProperties: false`, sólo
`application/json` y cuerpos pequeños. No hay endpoint público, Webhook, evento
externo, evento de notificación ni mensaje al outbox existente.

## Flujos transaccionales

### Crear calificación

1. Autenticar y exigir rol CLIENT.
2. Buscar solicitud/orden mediante filtro de propietario; si no coincide,
   responder 404 antes de revelar estado.
3. Bloquear/validar orden `CERRADA`; tomar una instantánea de sus campos
   protegidos para pruebas de no mutación.
4. Normalizar/validar request, reservar idempotencia y comprobar unicidad.
5. Insertar `OrderRating` y completar la reserva en una transacción.
6. Responder un acuse mínimo sin `otherMessage`; la consulta explícita lo
   devuelve sólo al actor autorizado.

### Abrir incidencia

1. Autorizar CLIENT propietario y validar orden `CERRADA`.
2. Validar tipo y ausencia de propiedades/texto/adjuntos.
3. Reservar idempotencia y bloquear por orden.
4. Insertar incidente `ABIERTA` y transición `OPEN`; la restricción parcial
   resuelve carreras.
5. No tocar ni bloquear para escritura tablas de orden/pago salvo la lectura
   necesaria de precondición.

### Triage/cierre

1. Autorizar ADMIN/DISPATCHER, validar idempotencia, acción y versión esperada.
2. Bloquear incidencia, comprobar transición exacta y orden aún `CERRADA`.
3. Actualizar sólo estado/version/timestamps del incidente e insertar historial.
4. Confirmar todo o nada. Reintento idéntico devuelve el mismo resultado.

## Experiencia por actor

### CLIENT

En el detalle de una orden `CERRADA` aparece una región “Postventa”:

- Calificación con grupo de estrellas 1..5, motivo estructurado y campo
  condicional `OTRO` con contador 0/100. Después de crearla queda sólo lectura.
- Incidencia con selector de tipo, confirmación explícita y lista de incidencias
  propias con estado/historial. No hay caja de comentario ni carga de archivos.

La interfaz no usa palabras como “garantía”, “cobertura”, “elegible”, “sin
cargo”, “reembolso” o promesas de respuesta. Informa que registrar una
incidencia no cambia la orden ni implica un remedio.

### ADMIN/DISPATCHER

La vista de orden muestra calificación e incidencias para soporte. Una bandeja
permite filtrar incidencias por estado/tipo y ejecutar sólo la próxima acción
válida. No hay controles para editar calificación, crear incidencia, reabrir
orden/incidencia, ajustar dinero, enviar mensaje o crear visita.

### Otros

No tienen vistas ni endpoints de postventa.

## Accesibilidad

- Estrellas como grupo con nombre accesible, selección por teclado y valor
  anunciado; no sólo iconos/color.
- Motivo/tipo como `fieldset`/grupo etiquetado y errores asociados.
- `OTRO` anuncia condición, ayuda, contador y error; al fallar se mueve el foco
  al resumen o primer campo inválido sin reflejar el texto.
- Estado de incidencia incluye texto, fecha UTC presentada localmente y secuencia
  semántica; carga/vacío/error usan regiones perceptibles.
- Doble submit deshabilita sólo la acción y conserva una alternativa de reintento
  segura; 429 anuncia espera sin perder selección local.

## Seguridad y privacidad

La consulta por CLIENT combina `requestId` con `clientProfileId`, y la mutación
administrativa exige rol operativo. La orden se valida `CERRADA` en la misma
unidad de consistencia del comando. Las respuestas 404 homogenizan inexistencia
y propiedad cruzada.

`otherMessage` se procesa en este orden: límite de bytes/cuerpo; parse JSON
cerrado; NFKC; trim Unicode; rechazo de controles, HTML/URLs/URI y longitud;
persistencia única. La validación de HTML/URL usa parser/allowlist testeable y no
una sustitución silenciosa. Incluso después de validar, el frontend lo inserta
como nodo de texto/escape contextual; se prohíbe `innerHTML` equivalente.

El logger, tracing, auditoría, métricas y manejador de errores reciben DTOs
redactados que excluyen `otherMessage` y demás contenido. Los hashes o reservas
de idempotencia no se exponen. No se registra cuerpo HTTP. Los reportes de tests
usan sentinels sintéticos y sólo publican conteos/resultados.

## Idempotencia, concurrencia y consistencia

- La clave se valida entre 16 y 128 caracteres y se limita por actor+scope.
- El fingerprint se calcula sobre la forma canónica ya normalizada; la reserva y
  el resultado se confirman juntos o quedan recuperables sin segundo registro.
- Un choque de unicidad sólo se trata como reintento exitoso tras comprobar la
  misma reserva/fingerprint; otro caso responde 409.
- `UNIQUE(workOrderId)` protege rating; unicidad parcial protege incidencia
  activa; `expectedVersion` e historial protegen transiciones.
- Pruebas con PostgreSQL real ejecutan al menos 20 escrituras concurrentes con
  claves iguales y distintas, reinicio/ack incierto y versiones obsoletas.
- Cada prueba de comando compara antes/después `WorkOrder`, sus transiciones,
  `Charge`, `PaymentAttempt` y `ConformityEvidence` para demostrar no mutación.

## Errores, reintentos y degradación

- 400: esquema, enum, longitud, cursor, HTML/URL/control o propiedad extra.
- 401: autenticación ausente/inválida.
- 403: rol autenticado sin capacidad del endpoint.
- 404: recurso inexistente o no perteneciente al CLIENT.
- 409: orden no cerrada, rating existente, incidencia activa, idempotencia
  incompatible, acción/estado/versión conflictivos.
- 413/415: cuerpo excedido o content type no permitido.
- 429: límite excedido con `Retry-After`, sin mutación.

Una falla de la sección de postventa se presenta localmente y no oculta el
detalle autoritativo de la orden. No hay proveedor ni worker externo que
reintentar. Los errores PostgreSQL revierten toda la transacción.

## Observabilidad

Métricas allowlist: comandos/lecturas por resultado, latencia, conflictos de
unicidad/versionado, 429, incidencias por estado y edad. Auditoría: actor, rol,
acción, resultado, IDs opacos, correlation ID y UTC. Alertas sugeridas: tasa
sostenida de fallos, incidencias `ABIERTA`/`EN_TRIAGE` envejecidas y conflictos
anómalos. No se define SLA ni promesa de atención.

No se registran estrellas, motivos de rating, `otherMessage`, tipo de incidencia
en texto no estructurado, payload, PII, orden completa, datos de pago o URLs.

## Migración, despliegue y rollback/forward-fix

1. Una implementación futura crea tablas, checks, FKs, triggers e índices de
   manera aditiva y forward-only; no backfill y no cambio de filas existentes.
2. Desplegar aplicación compatible con tablas vacías y capacidades desactivadas
   hasta verificar migración y autorización separada.
3. Probar PostgreSQL real con datos sintéticos, luego habilitar exclusivamente en
   staging mediante puerta de despliegue futura.
4. Rollback previo a tráfico vuelve la aplicación conservando tablas. Tras crear
   registros, sólo forward-fix; nunca `down`, `CASCADE`, edición o borrado.
5. Staging no tiene job de borrado. Producción permanece bloqueada hasta decisión
   legal de retención/borrado y las demás condiciones existentes.

## Riesgos

- `OTRO` puede contener PII/XSS/URL: minimización, rechazo, escape contextual,
  no logging y pruebas negativas.
- Carreras pueden duplicar postventa: transacciones, idempotencia, constraints y
  pruebas PostgreSQL reales.
- Incidencia puede interpretarse como garantía: lenguaje neutral, tipos
  estructurados y exclusión expresa de remedios.
- Acceso cross-client: filtros de propietario en consulta/mutación y 404 uniforme.
- Acoplamiento accidental a orden/dinero/notificaciones: dependencias de escritura
  prohibidas, comparación de snapshots y pruebas de ausencia de outbox.
- Retención indefinida en staging: aceptada sólo para staging; producción
  bloqueada hasta validación legal.
