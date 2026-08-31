# Requisitos — feat-009: Notificaciones transaccionales in-app

- Estado: `spec_review`.
- Decisiones: DEC-009-001 a DEC-009-006 aprobadas el 2026-08-30.
- Dependencias: feat-005 cerrada; feat-007 disponible para eventos de pago y
  conformidad.
- Límite: esta especificación no autoriza implementación, migraciones, commit,
  publicación, despliegue ni proveedores externos.

## Objetivo y alcance

Ofrecer al CLIENT propietario una bandeja accesible de avisos transaccionales
in-app, derivados idempotentemente de cambios autoritativos ya confirmados. Los
avisos ayudan a descubrir cambios, pero nunca reemplazan el estado ni el
historial del dominio.

El alcance inicial comprende asignación o reasignación, `EN_CAMINO`, cancelación,
pago aprobado, pago rechazado y cierre de orden. Cada aviso usa una plantilla
genérica versionada, referencia opaca al recurso autorizado, hora UTC y estado
leído/no leído.

## Fuera de alcance

- Email, SMS, Web Push, WhatsApp, SDK, cuenta, credencial o proveedor externo.
- Chat, respuestas, mensajes libres, campañas, promociones o contacto con el
  técnico.
- Tracking, mapa, ETA, domicilio, multimedia, diagnóstico libre, teléfono,
  datos de tarjeta, payloads o IDs del proveedor de pagos.
- Avisos para ADMIN/DISPATCHER, preferencias por canal, silenciamiento,
  agrupación inteligente o borrado manual.
- Acciones de negocio dentro del aviso: el destino vuelve a consultar la API
  autoritativa antes de mostrar o ejecutar cualquier acción.
- Producción; retención legal definitiva y backup/restauración siguen siendo
  puertas separadas.

## Actores y permisos

| Actor               | Permitido                                                                                               | Prohibido                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| CLIENT propietario  | Listar sus avisos, consultar conteo no leído, marcar uno propio como leído y navegar al recurso propio. | Leer o mutar avisos ajenos, crear avisos, cambiar plantillas o confirmar estados desde un aviso. |
| ADMIN / DISPATCHER  | Ninguna operación de la bandeja CLIENT en este incremento.                                              | Leer avisos de clientes, marcarlos como leídos o enviar mensajes.                                |
| Worker interno      | Consumir eventos allowlist, resolver propietario y materializar avisos idempotentes.                    | Inventar estados, usar texto libre o enviar contenido a terceros.                                |
| Visitante / técnico | Ningún acceso.                                                                                          | Toda lectura o mutación de avisos.                                                               |

## Requisitos funcionales

### REQ-009-001 — Eventos notificables transaccionales

- When: una transacción autoritativa confirma asignación/reasignación,
  `EN_CAMINO`, cancelación, pago aprobado, pago rechazado o cierre.
- The system shall: insertar en la misma transacción un `OutboxEvent` versionado
  con tipo allowlist, agregado y referencia opaca mínima; el cambio de dominio
  no depende de que el aviso se procese inmediatamente.
- Errores y límites: lecturas, reintentos técnicos, Webhooks sin cambio efectivo,
  estados pendientes y comandos idempotentes repetidos no generan otro evento.
  El payload no contiene texto libre, domicilio, contacto, multimedia, importe,
  URL, datos de tarjeta ni identificadores del proveedor.

### REQ-009-002 — Materialización idempotente

- When: el worker reclama un evento notificable disponible.
- The system shall: validar tipo/versión, resolver mediante relaciones vigentes
  el CLIENT propietario, seleccionar una plantilla allowlist y crear una sola
  notificación por evento y destinatario antes de marcar el evento procesado.
- Errores y límites: evento duplicado conserva una sola notificación; tipo o
  versión desconocidos, recurso inexistente o propietario inválido quedan en
  estado seguro reintentable o fallido según clasificación, sin inventar
  destinatario ni registrar payload.

### REQ-009-003 — Bandeja paginada y conteo

- When: un CLIENT autenticado abre su bandeja.
- The system shall: devolver únicamente sus notificaciones ordenadas por
  `createdAt DESC, id DESC`, con cursor opaco, límite 20 por defecto y máximo 50,
  más conteo no leído calculado para el mismo perfil.
- Errores y límites: cursor o límite inválidos devuelven 400; ADMIN, DISPATCHER y
  visitante no obtienen datos. La respuesta no contiene IDs internos de orden,
  pago, técnico o proveedor ni contenido fuera de plantilla.

### REQ-009-004 — Lectura monotónica e idempotente

- When: el CLIENT propietario marca una notificación propia como leída.
- The system shall: establecer `readAt` una única vez con UTC de servidor y
  devolver la proyección actual; reintentos devuelven el mismo `readAt`.
- Errores y límites: no existe transición a no leída en este incremento. Aviso
  inexistente o ajeno responde 404 para evitar enumeración; rol no CLIENT
  responde 403 y autenticación ausente 401.

### REQ-009-005 — Plantillas y navegación seguras

- The system shall: mapear cada evento a `templateKey` y `templateVersion`
  versionados, con título/resumen estáticos en español y destino
  `REQUEST_DETAIL` asociado a una solicitud autorizable.
- Errores y límites: no se interpola nombre, técnico, motivo, diagnóstico,
  importe, estado declarado por cliente ni texto de proveedor. Abrir el destino
  consulta el recurso actual; un aviso histórico no garantiza que la acción o
  estado original continúen vigentes.

### REQ-009-006 — Experiencia accesible del CLIENT

- The system shall: incorporar en el portal CLIENT acceso visible a la bandeja,
  indicador de no leídos, lista con título/resumen/fecha/estado de lectura,
  estados vacío/cargando/error y navegación por teclado.
- Errores y límites: el indicador no bloquea el resto del portal; fallos o
  demoras muestran degradación local y no ocultan el estado autoritativo de las
  solicitudes.

### REQ-009-007 — Auditoría y operación segura

- The system shall: auditar lecturas de bandeja y marcado como leído con actor,
  acción, resultado, correlation ID, ID opaco del aviso cuando corresponda y
  UTC; medir jobs por estado/edad, avisos creados y errores por código seguro.
- Errores y límites: logs, métricas y auditoría no contienen contenido del aviso,
  payload del outbox, identidad externa, domicilio, contacto, multimedia,
  datos de pago, secretos ni URLs firmadas.

## Requisitos no funcionales

- NFR-009-001 — Consistencia: evento y transición se insertan atómicamente;
  unicidad `(sourceEventId, recipientProfileId)`, claim con lease y lectura
  monotónica evitan duplicados bajo concurrencia.
- NFR-009-002 — Seguridad: autenticación Auth0 existente, autorización por rol y
  propietario en servidor, referencias opacas, rate limiting y pruebas negativas
  para acceso cruzado; ningún endpoint público de ingestión.
- NFR-009-003 — Privacidad: contenido allowlist sin interpolación sensible;
  payload, proyecciones, logs y auditoría cumplen minimización. No sale ningún
  dato del VPS ni se agrega proveedor.
- NFR-009-004 — Rendimiento: lista y marcado de lectura alcanzan p95 menor a
  500 ms en pruebas locales con PostgreSQL; índices cubren destinatario,
  `createdAt`, `id` y `readAt`. El conteo no recorre otros perfiles.
- NFR-009-005 — Resiliencia: worker con lease, reintentos acotados y backoff;
  reinicio o evento duplicado no pierde ni duplica avisos. La bandeja puede
  demorarse sin afectar comandos de dominio.
- NFR-009-006 — Observabilidad: métricas y alertas por conteos/edad/código,
  correlation ID y runbook de recuperación sin PII.
- NFR-009-007 — Migración: cambios PostgreSQL aditivos y forward-only, FKs
  restrictivas e índices explícitos; rollback de aplicación compatible y
  forward-fix sin borrar historial.
- NFR-009-008 — Accesibilidad: foco visible, landmarks, nombres accesibles,
  estado no leído no dependiente sólo del color y fechas legibles.
- NFR-009-009 — Retención: sin borrado automático en staging; notificación y
  lectura viven al menos mientras exista la solicitud/orden referenciada. El
  plazo y borrado definitivo requieren validación legal antes de producción.

## Supuestos y preguntas abiertas

- No quedan decisiones funcionales abiertas para especificar el incremento.
- Un canal externo futuro requiere revisar ADR-007 y no puede incorporarse como
  una tarea incidental de esta feature.
- El idioma inicial es español; internacionalización completa queda diferida,
  pero las claves/versiones de plantilla evitan acoplar eventos a textos.

## Dependencias

- ADR-002: PostgreSQL, outbox y worker sin Redis obligatorio.
- ADR-003: identidad y roles existentes.
- ADR-007: estado in-app y canales externos diferidos.
- feat-005: estados, propietario e historial de órdenes.
- feat-007: pago aprobado/rechazado y cierre por conformidad.
