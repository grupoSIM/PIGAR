# Diseño — feat-009: Notificaciones transaccionales in-app

- Estado: `spec_review`.
- Decisiones: DEC-009-001 a DEC-009-006 aprobadas el 2026-08-30.
- Límite: diseño exclusivo para el portal CLIENT; no incorpora canales ni
  proveedores externos.

## Resumen

Los cambios autoritativos de orden y pago insertan eventos versionados en el
`OutboxEvent` existente dentro de la misma transacción. Un worker interno
resuelve al CLIENT propietario desde las relaciones del dominio y materializa
una notificación idempotente. La bandeja sólo permite listar avisos propios y
marcarlos como leídos; al navegar vuelve a consultar la solicitud autoritativa.

## Decisiones y alternativas

- Se reutiliza PostgreSQL, outbox y worker existentes. Se descartan polling de
  tablas de negocio y entrega directa desde comandos porque acoplan la
  transacción a una proyección secundaria.
- El destinatario se resuelve desde `ServiceRequest.clientProfileId`; no se
  confía en un destinatario incluido en el payload.
- La notificación persiste `templateKey` y `templateVersion`; un registro
  inmutable de plantillas conserva todas las versiones publicadas. No existe
  texto libre ni interpolación.
- La API devuelve `unreadCount` junto con la página. No se agrega un endpoint de
  conteo independiente en este incremento.
- Marcar leído usa `PUT` sin `Idempotency-Key`: la operación es naturalmente
  idempotente y `readAt` es monotónico.
- No se selecciona email, SMS, Web Push, WhatsApp ni proveedor. Habilitarlos
  exige revisar ADR-007 y aprobar proveedor, consentimiento, plantillas, costos
  y soporte.

## Componentes afectados

- `apps/api`: emisión transaccional, autorización y endpoints de bandeja.
- `apps/worker`: consumo, validación de versión y materialización.
- `apps/customer-web`: acceso, indicador, lista y navegación.
- `apps/api/prisma`: tabla, relaciones, unicidad e índices aditivos.
- contratos compartidos, pruebas, métricas y runbook operativo.

## Modelo de dominio y datos

`TransactionalNotification` contiene: `id` UUID opaco,
`recipientProfileId`, `sourceEventId`, `requestId`, `eventType`, `templateKey`,
`templateVersion`, `readAt` nullable y `createdAt`, todos los tiempos en UTC.

Invariantes:

- `UNIQUE(source_event_id, recipient_profile_id)` evita duplicados.
- FKs a `Profile`, `OutboxEvent` y `ServiceRequest` usan `RESTRICT`.
- Índice `(recipient_profile_id, created_at DESC, id DESC)` sirve la página; un
  índice parcial o equivalente por `read_at IS NULL` sirve el conteo.
- El perfil destinatario debe ser `CLIENT` y propietario de `requestId`.
- `templateKey`, versión y tipo pertenecen a la allowlist compilada.
- No se persiste cuerpo renderizado, payload externo, datos de pago, contacto,
  domicilio, técnico, importe ni motivo.

## Eventos y plantillas

| Evento v1                       | Plantilla             | Título              | Resumen                                        |
| ------------------------------- | --------------------- | ------------------- | ---------------------------------------------- |
| `work_order.assignment_changed` | `assignment-changed`  | Técnico asignado    | Tu solicitud tiene una asignación actualizada. |
| `work_order.en_route`           | `technician-en-route` | Técnico en camino   | La atención de tu solicitud está en camino.    |
| `work_order.cancelled`          | `request-cancelled`   | Solicitud cancelada | Tu solicitud fue cancelada.                    |
| `payment.approved`              | `payment-approved`    | Pago confirmado     | Tu pago fue confirmado.                        |
| `payment.rejected`              | `payment-rejected`    | Pago rechazado      | No pudimos confirmar tu pago.                  |
| `work_order.closed`             | `work-order-closed`   | Trabajo cerrado     | Tu solicitud fue cerrada.                      |

El `OutboxEvent` conserva `eventType`, `version: 1`, agregado y `aggregateId`.
El payload, si una integración existente lo requiere, queda limitado a IDs
opacos internos y UTC. El worker deriva `requestId` y propietario mediante joins.
Sólo una transición efectiva emite evento; reintentos o conciliaciones sin
cambio no lo hacen.

## Flujo y estados

1. El comando bloquea y valida el agregado.
2. La misma transacción persiste cambio, historial y `OutboxEvent`.
3. El worker reclama el evento con lease y valida tipo/versión.
4. Resuelve solicitud y propietario; inserta con unicidad de fuente/destinatario.
5. Marca procesado dentro de la unidad transaccional de materialización.
6. El CLIENT lista sus avisos y puede fijar `readAt` una sola vez.

Una notificación sólo transita `UNREAD -> READ`; no hay reapertura ni borrado
manual. Que el aviso esté leído no altera orden, pago ni solicitud.

## API y contratos

El contrato normativo está en `api-contract.yaml`:

- `GET /api/v1/notifications?cursor=&limit=` devuelve una página propia,
  `unreadCount` y cursor opaco estable.
- `PUT /api/v1/notifications/{notificationId}/read` fija `readAt` y devuelve la
  proyección actual.

La proyección contiene sólo ID del aviso, tipo, título, resumen, fechas y destino
`REQUEST_DETAIL` con `requestId` ya visible para el propietario. Cursor inválido
responde 400; autenticación ausente 401; rol no CLIENT 403; aviso inexistente o
ajeno 404; rate limit 429.

## Experiencia por actor

El CLIENT dispone de acceso visible e indicador de no leídos. La lista anuncia
título, resumen, fecha y lectura sin depender del color, admite teclado y muestra
estados cargando, vacío y error. Al abrir, marca leído sin impedir la navegación
y carga el detalle actual. Si el recurso ya no está disponible, mantiene el
aviso histórico y presenta un estado seguro.

ADMIN, DISPATCHER, técnicos y visitantes no tienen bandeja ni acceso a avisos de
clientes en este incremento.

## Seguridad y privacidad

JWT y perfil activo se validan en servidor. Cada consulta filtra por
`recipientProfileId`; el marcado usa la misma condición en la actualización para
evitar TOCTOU y enumeración. Los DTO rechazan propiedades extra y los límites de
cursor/página se aplican antes de consultar.

Plantillas, API, logs y auditoría no incluyen PII, texto de negocio, importe,
credenciales, payloads, identificadores del proveedor ni URLs firmadas. La
navegación autoriza nuevamente el recurso; la notificación no concede permiso.

## Idempotencia, concurrencia y consistencia

La transición y el outbox son atómicos. El claim usa lease y reintentos; dos
workers pueden competir sin crear dos avisos por la restricción única. Un choque
de unicidad se clasifica como duplicado exitoso sólo después de comprobar la
misma fuente y destinatario. `readAt = COALESCE(readAt, now())` preserva el primer
instante ante concurrencia y reintentos.

El cursor codifica `(createdAt,id)` y está firmado o validado estructuralmente
como valor opaco. La siguiente página usa comparación estricta para no repetir
filas; altas posteriores aparecen al refrescar la primera página.

## Errores, reintentos y degradación

- Tipo/versión desconocido: fallo seguro visible, sin notificación ni payload en
  logs; no se reintenta indefinidamente.
- Relación temporalmente ausente o error PostgreSQL: retry acotado con backoff y
  lease recuperable.
- Propietario inexistente/no CLIENT: fallo de integridad y alerta, nunca fallback
  a otro destinatario.
- Worker detenido: el dominio continúa; crece la edad del outbox y se alerta.
- API de bandeja caída: degradación local en portal; solicitudes siguen
  disponibles y autoritativas.
- Plantilla desconocida al leer: error controlado y alerta; versiones publicadas
  no se eliminan.

## Observabilidad

Métricas: eventos notificables por tipo, avisos creados/duplicados, jobs por
estado y edad, fallos seguros por código, latencia de lista/marcado y respuestas
HTTP por clase. Logs estructurados: correlation ID, código, tipo allowlist, ID
opaco del aviso cuando corresponda y UTC. Auditoría registra actor, acción,
resultado y correlation ID, nunca contenido ni payload.

## Migración, despliegue y rollback/forward-fix

1. Migración aditiva crea tabla, FKs, unicidad e índices sin backfill.
2. Desplegar API/worker compatibles con tabla vacía y emisión desactivada por
   configuración segura hasta verificar migración.
3. Activar materialización y luego UI en staging con datos sintéticos.
4. Rollback de aplicación conserva tabla y eventos; una vez emitidos avisos sólo
   se admite forward-fix, no migración destructiva.
5. No hay borrado automático en staging. La política productiva requiere puerta
   legal separada.

## Riesgos

- Eventos omitidos en rutas de transición: matriz de productores y pruebas de
  integración por cada evento.
- Duplicados por crash entre inserción y ack: unicidad y prueba de reinicio.
- Fuga cross-tenant: filtro por propietario dentro de consulta/update y pruebas
  negativas.
- Conteo costoso: índice de no leídos y prueba de plan/rendimiento.
- Plantillas históricas rotas: registro append-only por versión.
- Acoplamiento con la falla pendiente del Webhook de feat-007: la notificación de
  pago nace sólo del cambio autoritativo ya conciliado, nunca del Webhook crudo.
