# Requisitos — feat-010: Calificaciones e incidencias de postventa

- Estado: `done`.
- Arquitectura: `approved_with_conditions`, 2026-08-31.
- Decisiones: DEC-010-001 a DEC-010-005 aprobadas el 2026-08-31.
- Dependencia: feat-007 cerrada en staging; su excepción Webhook sólo bloquea
  producción.
- Límite: la especificación aprobada autoriza la implementación y verificación
  dentro del alcance; commit, push, PR, publicación y despliegue requieren sus
  aprobaciones humanas independientes.

## Objetivo y alcance

Agregar una postventa mínima dentro del portal para que el CLIENT propietario
pueda, sobre una orden autoritativamente `CERRADA`:

1. crear una única calificación inmutable e idempotente de 1 a 5 estrellas; y
2. abrir una incidencia de tipo estructurado, manteniendo como máximo una
   incidencia activa por orden.

ADMIN y DISPATCHER pueden consultar ambos registros para soporte y realizar
triage/cierre de incidencias. La calificación, la incidencia y su historial son
registros separados: nunca cambian `WorkOrder`, sus transiciones, `Charge`, el
pago autoritativo ni `ConformityEvidence`.

## Fuera de alcance

- Garantía, cobertura, vigencia, elegibilidad, exclusiones, reparación sin cargo
  o cualquier promesa, remedio u obligación comercial.
- Reabrir o crear una orden, agendar una visita, reasignar técnico, cambiar un
  estado operativo, crear presupuesto o coordinar trabajo de campo.
- Reembolso, descuento, nota de crédito, contracargo, edición de importe, nuevo
  cargo, cambio de conciliación o modificación de conformidad.
- Texto libre en incidencias; edición, borrado o reapertura de calificaciones o
  incidencias; respuesta/chat entre actores.
- Multimedia, archivos, ubicación, firma, datos de contacto o evidencia
  adicional.
- Avisos in-app de feat-009, email, Web Push, WhatsApp, SMS, proveedor externo,
  eventos de notificación o un outbox nuevo.
- Producción. Retención/borrado legal, hardening, backup/restauración y el
  Webhook 401 de Mercado Pago conservan sus puertas independientes.

## Actores y permisos

| Actor               | Permitido                                                                                     | Prohibido                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| CLIENT propietario  | Crear/consultar su calificación; abrir y consultar sus incidencias sobre una orden `CERRADA`. | Ver recursos ajenos, editar/borrar calificaciones, cambiar/cerrar/reabrir incidencias o alterar orden/dinero/conformidad. |
| ADMIN               | Consultar calificaciones/incidencias para soporte; iniciar triage y cerrar incidencias.       | Crear/editar/borrar calificaciones, abrir/reabrir incidencias o alterar orden/dinero/conformidad desde postventa.         |
| DISPATCHER          | Igual que ADMIN para consulta, triage y cierre.                                               | Administrar pagos, crear trabajo, editar/borrar postventa o eludir transiciones.                                          |
| Visitante / técnico | Ningún acceso.                                                                                | Toda lectura o mutación de postventa.                                                                                     |

Toda autorización se valida exclusivamente en servidor por autenticación, rol,
propiedad, recurso y estado autoritativo de la orden. Un visitante recibe 401;
un rol autenticado sin permiso recibe 403; un CLIENT que intenta acceder a una
orden o registro ajeno recibe 404 sin revelar existencia. La UI nunca es una
barrera de seguridad.

## Allowlists propuestas para revisión humana

### Motivo de calificación v1

La solicitud incluye exactamente un valor:

- `CALIDAD_DEL_TRABAJO`
- `PUNTUALIDAD`
- `TRATO_Y_COMUNICACION`
- `CLARIDAD_DEL_PROCESO`
- `EXPERIENCIA_GENERAL`
- `OTRO`

`OTRO` no amplía el propósito del registro ni habilita soporte conversacional.

### Tipo de incidencia v1

La solicitud incluye exactamente un valor:

- `RESULTADO_NO_ESPERADO`
- `PROBLEMA_REAPARECIO`
- `TRABAJO_INCOMPLETO`
- `DANIO_REPORTADO`
- `CONSULTA_SOBRE_COBRO`

Los tipos registran la categoría declarada; no reconocen responsabilidad,
garantía, incumplimiento, devolución ni derecho a un remedio.

### Estados de incidencia v1

- `ABIERTA`: creada por el CLIENT propietario.
- `EN_TRIAGE`: tomada por ADMIN o DISPATCHER.
- `CERRADA`: terminal, sin reapertura.

Las únicas transiciones son `ABIERTA -> EN_TRIAGE -> CERRADA`. Una incidencia
`ABIERTA` o `EN_TRIAGE` es activa. Tras su cierre el CLIENT puede crear una nueva
incidencia estructurada para la misma orden; las anteriores se conservan. Nunca
se reactiva ni se edita una incidencia histórica.

## Requisitos funcionales

### REQ-010-001 — Calificación única de una orden cerrada

- When: el CLIENT propietario envía una calificación sobre su orden
  autoritativamente `CERRADA`.
- The system shall: aceptar un entero de 1 a 5, exactamente un motivo de la
  allowlist v1 y las reglas condicionales de `OTRO`; crear una sola calificación
  vinculada a orden y propietario con UTC de servidor.
- Errores y límites: visitante 401; rol no CLIENT 403; CLIENT cruzado 404; orden
  propia no cerrada 409; entrada, content type o propiedades extra inválidos
  400/415; exceso de tamaño 413; rate limit 429. No se crea nada parcialmente.

### REQ-010-002 — `OTRO` minimizado y seguro

- When: el motivo es `OTRO`.
- The system shall: exigir `otherMessage`, normalizarlo a Unicode NFKC, aplicar
  trim de whitespace Unicode y validar entre 1 y 100 puntos de código después
  de normalizar. Cuando el motivo no es `OTRO`, el campo debe estar ausente.
- Errores y límites: se rechazan HTML, comentarios/tags, URLs con o sin esquema,
  prefijos `www.`, URI `data:`/`mailto:`, controles, adjuntos, multipart y
  propiedades de archivo. La respuesta de error no refleja el valor. Las vistas
  autorizadas lo renderizan como texto escapado, nunca como HTML. El valor no se
  copia a logs, auditoría, métricas, trazas, outbox, avisos ni notificaciones, y
  no se devuelve en listados o acuses donde no sea necesario.

### REQ-010-003 — Inmutabilidad, idempotencia y concurrencia de calificación

- The system shall: exigir `Idempotency-Key`, reservarla por actor/operación,
  asociarla a una huella del payload canónico y conservar una única calificación
  por orden. Un reintento con igual clave y payload devuelve el mismo resultado;
  igual clave con payload distinto o cualquier intento posterior de reemplazar
  la calificación devuelve 409.
- Errores y límites: carreras con claves iguales o distintas dejan una sola fila
  y un único resultado observable. No existen endpoints ni comandos de edición o
  borrado; la calificación no tiene visibilidad pública.

### REQ-010-004 — Consulta segura de calificaciones

- The system shall: permitir al CLIENT consultar sólo la calificación de su
  orden y a ADMIN/DISPATCHER verla en la vista explícita de soporte de la orden,
  sin facultad de mutación. La vista de detalle autorizada puede incluir
  `otherMessage`; los listados y acuses mínimos lo omiten.
- Errores y límites: se revalida rol/propiedad en cada lectura; CLIENT cruzado
  recibe 404, visitante 401 y rol no autorizado 403. No se indexa públicamente ni
  se incorpora a avisos, exportaciones o perfiles de técnico.

### REQ-010-005 — Apertura estructurada de incidencia

- When: el CLIENT propietario abre una incidencia sobre su orden `CERRADA`.
- The system shall: exigir `Idempotency-Key`, aceptar exactamente un tipo de la
  allowlist v1, crear la incidencia `ABIERTA`, versión 1, y agregar en la misma
  transacción la primera entrada append-only con actor y UTC.
- Errores y límites: no se aceptan texto libre, propiedades extra, adjuntos ni
  multimedia. Si ya existe una incidencia activa para la orden, se devuelve 409
  sin mutación. Un reintento idéntico devuelve la incidencia original; clave
  reutilizada con payload distinto devuelve 409.

### REQ-010-006 — Triage y cierre estructurados

- When: ADMIN o DISPATCHER aplica la siguiente acción permitida con versión
  esperada e `Idempotency-Key`.
- The system shall: permitir sólo `START_TRIAGE` sobre `ABIERTA` y `CLOSE` sobre
  `EN_TRIAGE`; incrementar versión y agregar historial append-only con estado
  previo/posterior, actor, acción y UTC en la misma transacción.
- Errores y límites: CLIENT, técnico y visitante no transicionan; versión
  obsoleta, salto, repetición incompatible, incidencia cerrada o acción inválida
  devuelve 401/403/409 según corresponda sin efectos parciales. No hay campos de
  comentario, resolución libre, reapertura ni borrado.

### REQ-010-007 — Consulta de incidencias por actor

- The system shall: permitir al CLIENT listar sólo las incidencias de sus órdenes
  con tipo, estado e historial estructurado; ADMIN/DISPATCHER pueden consultar la
  incidencia desde la orden y una bandeja de soporte filtrable por estado/tipo.
  Los listados usan orden estable `createdAt DESC, id DESC`, cursor opaco, límite
  20 por defecto y 50 máximo.
- Errores y límites: cursor/límite inválidos responden 400; acceso cruzado 404;
  no se exponen otros clientes, datos de pago, domicilio, contacto, multimedia,
  texto de `OTRO`, IDs de proveedor ni motivos internos de otras features.

### REQ-010-008 — Aislamiento del dominio cerrado y de comunicaciones

- The system shall: procesar toda creación/lectura/transición de postventa sin
  modificar filas, versión o historial de `WorkOrder`, `Charge`,
  `PaymentAttempt`, `ConformityEvidence` o conciliación. No emite eventos al
  outbox existente ni crea otro outbox, avisos in-app o comunicaciones externas.
- Errores y límites: ninguna calificación o incidencia determina garantía,
  elegibilidad, cobertura, reembolso, nueva orden, visita o transición operativa.

### REQ-010-009 — Auditoría y observabilidad minimizadas

- The system shall: auditar comandos y lecturas administrativas con actor,
  acción, resultado, IDs opacos, correlation ID y UTC; medir conteos/latencia,
  conflictos, rate limit e incidencias activas por estado mediante códigos
  allowlist.
- Errores y límites: logs, trazas, métricas y auditoría no contienen
  `otherMessage`, estrellas, motivo de calificación, payloads, domicilio,
  contacto, datos de pago, multimedia, secretos o URLs. Los errores no reflejan
  entradas ni revelan existencia cruzada.

## Requisitos no funcionales

- NFR-010-001 — Consistencia e idempotencia: transacciones PostgreSQL,
  restricciones únicas/parciales, reserva idempotente y versión optimista
  preservan una calificación y una incidencia activa por orden bajo carreras.
- NFR-010-002 — Seguridad: autorización exclusiva de servidor, DTOs cerrados,
  JSON limitado, rate limiting y errores 401/403/404/409 sin enumeración.
- NFR-010-003 — Privacidad/XSS: `otherMessage` se minimiza, normaliza y renderiza
  como texto; no sale por logs, auditoría, métricas, outbox o notificaciones.
- NFR-010-004 — Rendimiento: listados y comandos sin llamadas externas alcanzan
  p95 menor a 500 ms en pruebas locales con PostgreSQL e índices previstos.
- NFR-010-005 — Accesibilidad: estrellas, motivos, tipo, estados, errores y
  confirmaciones son operables por teclado, tienen nombres/ayuda perceptibles y
  no dependen sólo de color; foco y anuncios de error son verificables.
- NFR-010-006 — Migración: cambios futuros exclusivamente aditivos y
  forward-only, FKs `RESTRICT`, checks/índices/unicidades explícitos, rollback de
  aplicación compatible y forward-fix sin borrar historia.
- NFR-010-007 — Retención: staging no ejecuta borrado automático; la
  calificación y `otherMessage` se conservan juntos mientras exista la orden, y
  las incidencias/historial permanecen vinculados a ella. Producción sigue
  bloqueada hasta aprobar legalmente retención y borrado.
- NFR-010-008 — Operación local: ningún proveedor, canal, credencial o proceso de
  entrega nuevo; fallas de postventa no degradan la consulta autoritativa de la
  orden ni los flujos cerrados de feat-007/009.

## Límites de rate limit propuestos

- Escrituras CLIENT de calificación/incidencia: 10 solicitudes por minuto por
  perfil y 30 por minuto por IP.
- Lecturas CLIENT/soporte: 120 solicitudes por minuto por perfil.
- Transiciones ADMIN/DISPATCHER: 60 solicitudes por minuto por perfil.
- Todo intento, incluido un reintento idempotente, cuenta; al exceder se responde
  429 con `Retry-After` y sin mutación. Los valores son parte de esta propuesta y
  requieren aprobación junto con la especificación.

## Supuestos y preguntas abiertas

- No quedan decisiones arquitectónicas abiertas dentro del límite aprobado.
- Las allowlists, estados y límites de rate limit anteriores son propuestas
  normativas sujetas a revisión humana en la puerta de especificación.
- Cualquier necesidad futura de garantía, texto libre adicional, multimedia,
  notificación, proveedor, dinero o nueva orden exige discovery y aprobación
  nuevos; no puede agregarse como tarea incidental.

## Dependencias

- feat-005: `WorkOrder`, propiedad, versión e historial autoritativos.
- feat-007: cierre sólo tras pago autoritativo y conformidad; sus registros no se
  mutan. TEST-007-014/AC-007-016 continúa siendo bloqueo exclusivo de producción.
- feat-009: bandeja in-app existente; feat-010 no emite avisos ni outbox.
- ADR-002/003/007: PostgreSQL, identidad/roles y canales externos diferidos.
