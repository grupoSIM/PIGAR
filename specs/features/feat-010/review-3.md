# Tercera revisión independiente — feat-010

Fecha: 2026-09-02
Rol: Reviewer independiente
Veredicto: **FAIL**

Esta revisión se limita al estado revisado tras `review.md` y `review-2.md`.
No autoriza commit, push, PR, despliegue ni publicación. La aprobación de
publicación debe permanecer `pending`.

## Controles que sí quedaron cubiertos

- La prueba PostgreSQL real ejecuta carreras concurrentes de rating, apertura y
  transición y comprueba replay de servicio, conflictos y ausencia de `P2002`
  expuesto.
- La prueba Nest/Fastify comprueba los errores 401/403/404/409/413/415/429,
  `Retry-After`, `application/problem+json` y las formas de soporte/incidencia
  para una orden cerrada.
- La implementación y prueba focalizada incluyen snapshots de orden,
  transiciones, cargo, pago, conformidad, outbox y notificaciones; también
  incluyen paginación y p95 local para el caso ejercitado.

## Bloqueantes

### P0-RV-010-006 — El replay HTTP no cumple el código de respuesta del contrato

`api-contract.yaml` declara `201` para la creación y `200` para un reintento
idempotente idéntico tanto en rating como en incidencia. Los métodos `@Post`
del controlador devuelven directamente la promesa del servicio sin seleccionar
un código de respuesta ni recibir información de si el resultado fue creación o
replay. Nest aplica `201` por defecto a ambos casos. La prueba HTTP sólo
comprueba la primera creación y no comprueba el replay HTTP.

Evidencia: `apps/api/src/aftercare/aftercare.controller.ts`, rutas de líneas
29--46 y 55--72; `specs/features/feat-010/api-contract.yaml`, respuestas 201 y
200 de `POST /v1/requests/{requestId}/rating` y
`POST /v1/requests/{requestId}/incidents`.

### P0-RV-010-007 — La auditoría minimizada no registra resultados fallidos de comandos

`audit()` persiste siempre `outcome: "SUCCESS"` y sólo se invoca desde
`complete()`. Rechazos previos a la transacción —rol, límite, propiedad/estado
de la orden y reserva idempotente incompatible— no invocan `failure()` ni
generan evento de auditoría. Esto no satisface el resultado requerido para
auditar comandos por REQ-010-009 y deja sin resolver el P0 previo sobre outcomes
de comandos fallidos.

Evidencia: `apps/api/src/aftercare/aftercare.service.ts`, líneas 53--83 y
135--167 (rechazos antes del `try`), y métodos `audit`/`complete`/`failure`.

### P0-RV-010-008 — La vista de soporte puede violar el contrato para una orden no cerrada

`AftercareSupportView.orderState` tiene `const: CERRADA`. Sin embargo,
`adminOrder()` sólo valida que la orden exista y devuelve su estado sin exigir
`CERRADA`. Por tanto, una consulta ADMIN/DISPATCHER sobre una orden no cerrada
puede devolver un payload que no cumple el contrato. La prueba HTTP sólo cubre
una orden cerrada.

Evidencia: `apps/api/src/aftercare/aftercare.service.ts`, `adminOrder()`
líneas 258--263; `specs/features/feat-010/api-contract.yaml`, schema
`AftercareSupportView`.

### P0-RV-010-009 — Cursor con forma válida pero inexistente no se convierte en 400

El decodificador sólo valida que el cursor contenga un UUID. Ese UUID se pasa
después como cursor Prisma, sin confirmar que pertenezca a la consulta/página ni
traducir un cursor inexistente a `BadRequestException`. REQ-010-007 exige 400
para cursor inválido; el caso no figura en la prueba HTTP ni en la evidencia.

Evidencia: `apps/api/src/aftercare/aftercare.service.ts`, `page()` y
`decodeCursor()`; `specs/features/feat-010/requirements.md`, REQ-010-007.

## Condición para PASS

Corregir los cuatro P0, agregar pruebas HTTP/integración reales para cada caso y
actualizar la evidencia por ID con sus comandos y salidas sanitizadas. Sólo
entonces procede una nueva revisión independiente.
