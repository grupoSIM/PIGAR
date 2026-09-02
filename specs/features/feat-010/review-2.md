# Segunda revisión independiente — feat-010

Fecha: 2026-09-01
Rol: Reviewer independiente (distinto del implementador)
Veredicto: **FAIL**

## Resultado de los P0 de la primera revisión

| Hallazgo      | Estado                     | Resultado de la revisión                                                                                                                                                                                |
| ------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-RV-010-001 | parcialmente corregido     | El código reconsulta la reserva tras `P2002`, pero no existe una prueba que ejecute las carreras reales de servicio/API contra PostgreSQL.                                                              |
| P0-RV-010-002 | no corregido completamente | CLIENT/ADMIN list reciben `cursor`/`limit`, pero la vista de soporte de orden declarada en el contrato no los implementa y su respuesta no coincide con el schema.                                      |
| P0-RV-010-003 | parcialmente corregido     | `RateLimitedException` y el controlador añaden el header, pero la única prueba invoca `controller.respond` directamente; no demuestra una respuesta HTTP 429 real.                                      |
| P0-RV-010-004 | no corregido               | La matriz de `acceptance.md` y el plan dicen `passed`, pero la tabla de criterios de `evidence.md` sigue íntegramente `pending` y los comandos asociados no cubren los escenarios que esos IDs afirman. |

## Bloqueantes

### P0-RV-010-001 — La idempotencia concurrente no está verificada en la ruta real

La relectura en `AftercareService.replay` es una corrección plausible para el
conflicto de reserva, pero `scripts/aftercare-postgres.test.mjs` sólo ejecuta
SQL directo de constraints. No invoca `createRating`, `createIncident` ni
`transition`, no reserva claves concurrentemente y no verifica 20 comandos con
misma/diferente clave, respuesta perdida, ni conflicto de versión. La prueba
focalizada sólo simula una reserva ya confirmada con un mock.

Esto no aporta la evidencia exigida por REQ-010-003, REQ-010-005,
REQ-010-006, NFR-010-001, AC-010-003 y TEST-010-004/005. Debe agregarse una
prueba de integración con PostgreSQL real que ejercite el servicio o HTTP,
incluyendo el resultado 200 de reintento, 409 de payload distinto y 409 de
versión obsoleta sin errores `P2002` filtrados como 500.

Evidencia: `apps/api/src/aftercare/aftercare.service.ts`, `replay`;
`scripts/aftercare.test.mjs`, tests 5–7;
`scripts/aftercare-postgres.test.mjs`.

### P0-RV-010-002 — El contrato de soporte y los payloads de incidencias no coinciden

`GET /v1/admin/orders/{orderId}/aftercare` declara `cursor` y `limit`, y debe
devolver `AftercareSupportView` (`orderId`, `orderState`, `rating` e
`IncidentPage`). El controlador no recibe esos parámetros y `adminOrder`
devuelve solamente `{ rating, incidents: IncidentDetail[] }`, sin paginación ni
`nextCursor`.

Además, `incidentView` no devuelve `requestId`, `updatedAt`, `closedAt`,
`history[].sequence`, `history[].actorRole` ni `history[].createdAt`, todos
requeridos por `IncidentDetail`/`IncidentTransitionView`. En cambio expone
`occurredAt`, que no existe en el contrato. Por tanto, los endpoints no son
consumibles conforme a `api-contract.yaml` aunque las rutas principales ya
acepten cursor y límite.

Evidencia: `specs/features/feat-010/api-contract.yaml`, paths y schemas
`AftercareSupportView`, `IncidentDetail` e `IncidentTransitionView`;
`apps/api/src/aftercare/aftercare.controller.ts`, `adminOrder`;
`apps/api/src/aftercare/aftercare.service.ts`, `adminOrder` e `incidentView`.

### P0-RV-010-003 — Falta prueba HTTP de `Retry-After` y de los errores contractuales

El header se escribe si una promesa de servicio rechaza con
`RateLimitedException`, pero no se inicia la aplicación ni se emite una petición
HTTP en las pruebas. No hay cobertura de 401/403/404/409/413/415, `content-type`
ni límite de cuerpo. Marcar TEST-010-003 y TEST-010-009 como aprobados mediante
un test de texto, mocks y una llamada privada al controlador no demuestra el
contrato publicado.

Evidencia: `scripts/aftercare.test.mjs`, tests 4 y 7; no hay prueba Fastify/API
de postventa en `scripts/aftercare-postgres.test.mjs`.

### P0-RV-010-004 — La trazabilidad declara cobertura no demostrada

`test-plan.md` y la matriz de `acceptance.md` se actualizaron a `passed`, pero
la tabla “Criterios de aceptación” de `evidence.md` continúa `pending` para los
13 AC. Además, los comandos señalados para TEST-010-003 a TEST-010-010 no
ejecutan las verificaciones descritas: no hay contrato HTTP real, carreras de
servicio, snapshots de no-mutación, p95, ni prueba de teclado/foco real. La
evidencia debe reflejar exactamente las pruebas ejecutadas y sus salidas, no
sólo su intención.

Evidencia: `specs/features/feat-010/evidence.md`, líneas 69–81;
`specs/features/feat-010/test-plan.md`, líneas 137–145;
`scripts/aftercare.test.mjs`.

### P0-RV-010-005 — Observabilidad requerida aún no está implementada

REQ-010-009 exige métricas minimizadas de conteos/latencia, conflictos, rate
limit e incidencias activas por estado. El módulo sólo persiste auditoría de
lecturas administrativas exitosas y transiciones exitosas. No hay
instrumentación de métricas ni outcomes de fallos de los comandos, pese a que
TASK-010-007 y la matriz la dan por verificada.

Evidencia: `apps/api/src/aftercare/aftercare.service.ts`, método `audit` y sus
llamadas; ausencia de un adaptador o contador de métricas en el módulo.

## Controles positivos comprobados

- La migración es aditiva y forward-only; define FKs `RESTRICT`, unicidad de
  rating, índice parcial de incidencia activa y triggers append-only.
- `validateRating` normaliza NFKC y rechaza controles, HTML y URLs; las vistas
  React interpolan el texto sin HTML peligroso observado.
- No se observó una mutación de `WorkOrder`, pagos, conformidad ni outbox desde
  `apps/api/src/aftercare`.
- La prueba focalizada actual pasa: `node --test scripts/aftercare.test.mjs`
  (7/7, 0 fallos, ejecutada el 2026-09-01). Es cobertura auxiliar, no reemplaza
  los bloqueantes anteriores.

## Condición para PASS

Corregir los cinco P0, ejecutar y registrar pruebas HTTP y PostgreSQL reales
que cubran los IDs TEST afectados, y hacer coincidir todos los artefactos de
trazabilidad con esas salidas. Luego procede una nueva revisión independiente.
La aprobación de publicación debe permanecer `pending`; este veredicto no
autoriza commit, push, PR ni despliegue.
