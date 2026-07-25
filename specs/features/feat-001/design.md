# Diseño — feat-001: Fundaciones técnicas y arquitectura ejecutable

## Resumen

`feat-001` convierte las ADR aceptadas en una fundación ejecutable sin entregar funcionalidades de negocio. El resultado es un monorepo modular, desplegable en un único VPS mediante Docker Compose, con PostgreSQL, almacenamiento multimedia privado, calidad automatizada y PoC técnicas aisladas.

## Decisiones y alternativas

- Monorepo pnpm/Turborepo y TypeScript estricto, conforme ADR-001.
- Dos aplicaciones Next.js separadas para cliente y administración.
- Monolito modular NestJS/Fastify, worker del mismo código y PostgreSQL/Prisma, conforme ADR-002.
- Sin Redis: outbox y jobs reclamados desde PostgreSQL.
- Nginx como única entrada HTTP/HTTPS.
- Filesystem privado del VPS detrás de un adaptador, conforme ADR-006.
- Proveedores externos detrás de puertos; las PoC no contaminan el dominio ni habilitan producción.
- No se incorpora código Stitch directamente; se conserva como referencia visual.

## Componentes afectados

```text
apps/
  customer-web/
  admin-web/
  api/
  worker/
packages/
  contracts/
  domain/
  ui/
  config/
  observability/
  test-support/
infra/
  nginx/
  compose/
docs/
  runbooks/
```

Dependencias permitidas:

```text
webs ──────> contracts, ui, config
api/worker ─> domain, contracts, config, observability
adapters ───> domain ports
domain ─────> TypeScript estándar, sin frameworks ni SDK externos
```

## Modelo de dominio y datos

Las tablas técnicas iniciales se limitan a:

- `outbox_event`: ID opaco, tipo, versión, agregado opcional, payload técnico minimizado, timestamps UTC, intentos y estado.
- `claimed_job`: ID, tipo, clave idempotente, disponibilidad, lease, intentos, estado y último error sanitizado.
- `provider_event_receipt`: proveedor, ID externo hash/normalizado, tipo, estado de validación y timestamps; índice único para deduplicación.
- `media_poc_object`: ID, nombre físico aleatorio, MIME detectado, bytes, checksum, estado y expiración; sin identidad o domicilio real.
- `_prisma_migrations`: control de esquema.

La PoC utiliza fixtures sintéticos. Las entidades completas de solicitud, orden, perfil y pago pertenecen a features posteriores.

## Máquina de estados y transiciones

Contrato arquitectónico reservado para el MVP; `feat-001` lo expresa como enums y pruebas puras, sin persistir órdenes reales.

### Orden

```text
SOLICITADA
  ├─ asignar por DISPATCHER/ADMIN ─> TECNICO_ASIGNADO
  └─ cancelar permitido ──────────> CANCELADA

TECNICO_ASIGNADO
  ├─ informar salida ─────────────> EN_CAMINO
  ├─ iniciar atención ────────────> EN_ATENCION
  ├─ reasignar ───────────────────> TECNICO_ASIGNADO (nueva versión + historial)
  └─ cancelar permitido ──────────> CANCELADA

EN_CAMINO
  ├─ iniciar atención ────────────> EN_ATENCION
  └─ cancelar excepcional ────────> CANCELADA

EN_ATENCION
  └─ finalizar trabajo ───────────> TRABAJO_FINALIZADO

TRABAJO_FINALIZADO
  └─ generar cobro fijo ──────────> PENDIENTE_PAGO

PENDIENTE_PAGO
  └─ pago aprobado por proveedor ─> PENDIENTE_CONFORMIDAD

PENDIENTE_CONFORMIDAD
  └─ conformidad por CLIENT ──────> CERRADA
```

Reglas:

- `EN_CAMINO` es opcional: `TECNICO_ASIGNADO` puede pasar directamente a `EN_ATENCION`.
- Solo `DISPATCHER` o `ADMIN` asignan técnicos y actualizan hitos operativos.
- El técnico es un registro operativo sin identidad ni token.
- Cada transición requiere versión optimista, actor, timestamp UTC, motivo cuando corresponda e historial inmutable.
- El cliente ve una proyección segura; nunca coordenadas, teléfono o WhatsApp del técnico.
- La conformidad no sustituye la confirmación del proveedor de pagos.

### Pago

Estado independiente por intento:

```text
CREATED -> PENDING | APPROVED | REJECTED | CANCELLED
PENDING -> APPROVED | REJECTED | CANCELLED
```

- Solo consulta autenticada al proveedor puede producir `APPROVED`.
- Un pago `PENDING` o `REJECTED` deja la orden en `PENDIENTE_PAGO`.
- Un rechazo permite un nuevo intento; no reescribe el anterior.
- Eventos duplicados o fuera de orden se registran y no duplican transiciones.
- Reembolsos y contracargos quedan fuera del flujo MVP y requerirán ampliación de contrato.

## API, eventos y contratos externos

La API productiva de esta feature solo expone:

- `GET /health/live`: proceso vivo, sin dependencias externas.
- `GET /health/ready`: confirma disponibilidad de PostgreSQL y componentes internos obligatorios.

Las PoC de multimedia y pagos se ejecutan mediante suites de integración o herramientas internas no publicadas. Si se requiere un endpoint de prueba, solo existirá en perfil `poc`, enlazado a loopback/red privada y ausente de imágenes de producción.

Eventos técnicos:

- `technical.poc.job.requested.v1`
- `technical.poc.job.completed.v1`
- `technical.poc.provider-event.received.v1`

Auth0, Google Maps y Mercado Pago se encapsulan detrás de puertos. Ninguna credencial real se versiona.

## Experiencia por actor

- Cliente: shell PIGAR mobile-first con estado “producto en preparación”; sin acciones de negocio.
- Administración: shell PIGAR de escritorio con navegación mínima; sin KPIs ni datos operativos.
- Operación técnica: healthchecks, comandos de calidad y runbooks.
- Técnico: no existe experiencia, cuenta ni endpoint.

## Seguridad y privacidad

- Nginx es la única superficie publicada.
- PostgreSQL, API interna, worker y volúmenes no se publican directamente.
- `.env.example` contiene nombres y descripciones, nunca valores reales.
- Validación de configuración al arranque con errores sanitizados.
- Fixtures exclusivamente sintéticos.
- Autorización de multimedia se prueba con actores simulados y denegación cruzada.
- La ruta física y los identificadores internos de archivos nunca se exponen.
- Cifrado en tránsito obligatorio para despliegue; certificado y renovación se documentan.
- Cifrado en reposo:
  1. obtener confirmación del proveedor sobre discos/volúmenes;
  2. si no hay cifrado verificable, usar volumen cifrado con claves separadas antes de producción;
  3. cifrar backups del lado de PIGAR siempre.
- Dependencias y contenedores se fijan por versión/digest y se escanean.

## Idempotencia, concurrencia y consistencia

- `provider_event_receipt` tiene restricción única por proveedor e ID externo.
- El procesamiento reclama jobs mediante transacción y lease con `FOR UPDATE SKIP LOCKED` o equivalente probado.
- Outbox y cambio técnico se confirman en la misma transacción.
- Las pruebas lanzan eventos duplicados y concurrentes.
- Los archivos pasan de temporal a final mediante operación atómica dentro del mismo volumen.
- Reintentos HTTP con impacto utilizan clave idempotente; healthchecks son seguros para repetición.

## Errores, reintentos y degradación

- PostgreSQL no disponible: readiness 503, liveness 200 mientras el proceso responda.
- Worker sin base: backoff acotado con jitter y log sanitizado.
- Archivo inválido/interrumpido: no crea objeto final; temporal se elimina o vence por TTL.
- Disco bajo: rechazar nuevas cargas antes de agotamiento y activar alerta.
- Proveedor de pagos no disponible: conservar pendiente y conciliar después; nunca inferir aprobación.
- Auth0/Maps no disponibles: no afectan healthchecks de `feat-001`.

## Observabilidad

Campos mínimos: `timestamp`, `level`, `service`, `environment`, `correlation_id`, `event`, `duration_ms` y código de resultado.

Alertas mínimas documentadas:

- Disco: aviso al 70 %, crítico al 85 %.
- Memoria y CPU sostenidas por contenedor.
- PostgreSQL sin readiness.
- Reinicios repetidos.
- Jobs vencidos, reintentos y dead-letter técnico.
- Crecimiento de temporales multimedia.
- Errores de firma, duplicados y conciliación de proveedor.

No se crea dashboard de KPIs de negocio.

## Capacidad del entorno de desarrollo

Capacidad confirmada por el usuario para ejecutar la PoC:

- 2 vCPU.
- 8 GB RAM.
- 100 GB de disco.
- 8 TB de transferencia incluida; la periodicidad/renovación debe verificarse en el plan.
- Reserva inicial orientativa de memoria: PostgreSQL 2 GB, API 1,25 GB, worker 0,75 GB, cada web 0,5 GB y Nginx 0,25 GB; el resto queda para host, cache, Docker y picos.
- Presupuesto inicial de disco para desarrollo: 20 GB para host/imágenes, 20 GB para PostgreSQL, hasta 50 GB para multimedia/temporales y 10 GB de margen operativo. La PoC debe validar y ajustar esta distribución.
- Prueba de concurrencia técnica documentará throughput, memoria y espacio para ajustar el plan.

Los límites de CPU por contenedor se fijarán después de la primera medición para no reservar más capacidad simultánea que los 2 vCPU disponibles. El dimensionamiento de producción permanece abierto y requerirá evidencia separada.

## Migración, despliegue y rollback/forward-fix

- Compose versionado y perfiles `dev`, `test` y `production`.
- Migración Prisma inicial con forward y rollback documentado; cambios destructivos prohibidos.
- Despliegue desde host limpio siguiendo runbook, sin publicar.
- Rollback de imagen conserva volúmenes y usa migraciones compatibles; si una migración no es reversible se exige forward-fix documentado.
- Backup externo no se selecciona en esta feature, pero producción queda bloqueada hasta aprobar destino y restaurar PostgreSQL + multimedia.

## Riesgos

- Punto único de falla del VPS.
- Competencia por CPU, RAM, disco y ancho de banda.
- La PoC puede demostrar que los límites multimedia o el plan base son insuficientes.
- Coste/cuotas de Auth0, Google Maps y Mercado Pago pueden cambiar.
- Cifrado de disco puede requerir soporte del proveedor o una solución operativa adicional.
- Dos aplicaciones web y paquetes compartidos pueden acoplarse si no se fiscalizan dependencias.
