# Revisión independiente — feat-010

Fecha: 2026-09-01
Rol: Reviewer independiente
Veredicto: **FAIL**

## Alcance revisado

Se revisaron la implementación en `apps/api/src/aftercare`, la migración
`20260901090000_feat_010_aftercare`, las vistas CLIENT y ADMIN/DISPATCHER, los
proxies web, los scripts de prueba y los artefactos de `specs/features/feat-010`.
No se observaron comandos de postventa que escriban `WorkOrder`, pagos,
conformidad u outbox; la migración es aditiva y no contiene borrados. Ese límite
de alcance está preservado en el código revisado.

## Hallazgos bloqueantes

### P0-RV-010-001 — Idempotencia concurrente no devuelve el resultado original

`AftercareService.createRating`, `createIncident` y `transition` consultan la
reserva antes de iniciar la transacción y, si dos solicitudes con la misma clave
la superan simultáneamente, una de las inserciones de reserva falla por la
unicidad. En rating e incidencia el `catch` convierte cualquier `P2002` en
`RATING_ALREADY_EXISTS` o `INCIDENT_ALREADY_ACTIVE`; no vuelve a leer la reserva
ni devuelve el resultado original. La transición ni siquiera traduce ese
conflicto. Esto contradice REQ-010-003, REQ-010-005, REQ-010-006 y
NFR-010-001: reintentos/carreras con igual clave y payload deben devolver el
mismo resultado observable.

Evidencia: `apps/api/src/aftercare/aftercare.service.ts`, métodos
`createRating` (líneas 48–93), `createIncident` (109–169) y `transition`
(219–286). `scripts/aftercare-postgres.test.mjs` sólo prueba constraints SQL;
no ejecuta solicitudes concurrentes ni el flujo de reserva/relectura.

### P0-RV-010-002 — El contrato de listados paginados no está implementado

El contrato exige `cursor`, `limit`, orden estable y `nextCursor` para los
listados CLIENT y ADMIN. Los handlers `incidents` y `adminIncidents` no aceptan
query parameters, `incidents` no limita resultados, `adminIncidents` aplica
siempre `take: 50`, y ambas respuestas omiten `nextCursor`. Tampoco se valida el
filtro `status`/`type` en el controlador (actualmente no se los recibe).
Esto incumple REQ-010-007 y el contrato `api-contract.yaml`.

Evidencia: `apps/api/src/aftercare/aftercare.controller.ts`, líneas 55–63;
`apps/api/src/aftercare/aftercare.service.ts`, líneas 166–190; contrato,
schemas `IncidentPage`, `Cursor` y `Limit`.

### P0-RV-010-003 — Rate limiting no entrega `Retry-After` exigido

Los límites por perfil/IP se cuentan en memoria y, al excederse, se lanza
`HttpException` 429 sin headers. El contrato y REQ-010-009 exigen explícitamente
`Retry-After` en toda respuesta 429. Las pruebas verifican solamente el status
de una excepción privada, no una respuesta HTTP ni el header.

Evidencia: `apps/api/src/aftercare/aftercare.service.ts`, líneas 292–315;
`specs/features/feat-010/api-contract.yaml`, respuesta `TooManyRequests`; y
`scripts/aftercare.test.mjs`, test de rate limit.

### P0-RV-010-004 — Los artefactos de cierre no aportan evidencia trazable de aceptación

`acceptance.md` conserva todos los AC-010-001 a AC-010-013 como `pending` y
`test-plan.md` conserva los TEST-010-* como `pending`, mientras que `tasks.md`
marca TASK-010-008 como completada. El workflow obliga rechazar el cierre cuando
la aceptación no enlaza evidencia concreta. Además, los scripts focalizados no
cubren contrato HTTP/roles/propiedad, `Retry-After`, cursor, p95, accesibilidad
de foco/teclado, ni concurrencia/idempotencia de servicio; las E2E usan rutas
interceptadas con fixtures y no validan la API real.

Evidencia: `specs/features/feat-010/acceptance.md`, tabla de criterios;
`specs/features/feat-010/test-plan.md`, tabla TEST-010; `tasks.md`,
TASK-010-008; `scripts/aftercare.test.mjs`; E2E en
`apps/customer-web/e2e/home.spec.ts` y `apps/admin-web/e2e/home.spec.ts`.

## Hallazgos importantes no bloqueantes de forma aislada

### P1-RV-010-005 — Respuesta de rating no coincide con el contrato de detalle

Para CLIENT, `ratingView(item, actor.role !== "CLIENT")` omite siempre
`otherMessage`; para ADMIN/DISPATCHER también lo omite cuando el valor es nulo.
`RatingDetail` exige el campo nullable. La respuesta tampoco se alinea de forma
estable con la proyección de detalle declarada.

Evidencia: `apps/api/src/aftercare/aftercare.service.ts`, líneas 96–103 y
335–347; `api-contract.yaml`, schema `RatingDetail`.

### P1-RV-010-006 — Validación de transición e idempotency key incompleta

La transición castea el cuerpo y no rechaza propiedades adicionales; la clave
acepta hasta 160 caracteres y no aplica el patrón del contrato, que limita a
128 y `^[A-Za-z0-9._:-]+$`. No hay validación explícita del content type ni del
límite de cuerpo de estos endpoints en el controlador.

Evidencia: `apps/api/src/aftercare/aftercare.controller.ts`, líneas 70–98;
`api-contract.yaml`, parámetro `IdempotencyKey` y request schemas.

### P1-RV-010-007 — Auditoría/observabilidad parcial

Se escriben eventos para lecturas administrativas exitosas y una transición
exitosa, pero no se registran outcomes de comandos fallidos y no se implementan
las métricas de conteos, latencia, conflictos, rate limits e incidencias activas
requeridas por REQ-010-009. La evidencia afirma cobertura que el código
revisado no demuestra.

Evidencia: `apps/api/src/aftercare/aftercare.service.ts`, método `audit` y sus
llamadas; ausencia de instrumentación de métricas en el módulo aftercare.

### P2-RV-010-008 — Cambio de formato amplio necesita separación antes de publicar

El estado de Git incluye numerosos cambios ajenos a feat-010 en billing,
notifications, requests, CI y configuración. Si son exclusivamente el
reformateo autorizado, no alteran el alcance de producto, pero deben separarse o
documentarse como cambio mecánico antes de cualquier publicación para conservar
un incremento revisable.

Evidencia: `git status --short` durante esta revisión.

## Controles que sí se verificaron

- La migración crea tablas/enums separados, FKs `RESTRICT`, unicidad de rating,
  índice parcial para una incidencia activa y triggers append-only de rating e
  historial.
- `validateRating` normaliza NFKC y rechaza controles, HTML y patrones de URL;
  las vistas React interpolan texto, sin HTML peligroso observado.
- CLIENT sólo ve postventa para `CERRADA` en la UI y ADMIN sólo ofrece las
  acciones siguientes visibles. Son controles de experiencia; la seguridad debe
  quedar cubierta por las pruebas de API pendientes.
- No se halló emisión a outbox ni mutación de orden/pago/conformidad desde el
  servicio de postventa.

## Condición para nueva revisión

Corregir los cuatro bloqueantes, completar pruebas que ejerciten la API real y
las carreras concurrentes, y actualizar `test-plan.md`, `acceptance.md` y
`evidence.md` con resultados y referencias por ID. Mantener `publication` en
estado pendiente; este veredicto no autoriza commit, push, PR ni despliegue.
