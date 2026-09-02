# Quinta revisión independiente — feat-010

Fecha: 2026-09-02
Rol: Reviewer independiente de cierre
Veredicto: **FAIL**

Esta revisión no modifica la implementación ni los estados y no autoriza
commit, push, PR, despliegue ni publicación. La aprobación de publicación debe
permanecer `pending`.

## Verificaciones efectuadas

- Se leyeron `AGENTS.md`, el flujo, estado activo, requisitos, contrato,
  aceptación, plan, evidencia y las cuatro revisiones anteriores.
- Se ejecutó de forma independiente con Docker/PostgreSQL local:

  ```text
  C:\DEV\PIGAR\.harness\tools\node-v22.17.0-win-x64\node.exe scripts/aftercare-postgres.test.mjs
  pass 2, fail 0, skipped 2 condicionales
  ```

  La corrida cubrió carreras reales de servicio y la API Nest/Fastify, sin
  `P2002` ni respuestas 500 expuestas.

- El contrato de códigos exitosos está correctamente implementado para los tres
  POST: rating e incidencia preservan el `201` por defecto al crear y
  `respond()` fija `200` cuando el resultado es replay; transición pasa
  explícitamente `200` tanto para la aplicación inicial como para el replay.
  La prueba HTTP ejecutada cubre rating `201`/`200` y transición inicial `200`;
  la ruta de incidencia comparte exactamente la misma rama de creación/replay
  que rating.
- La vista de soporte recibe `cursor`/`limit` y devuelve
  `AftercareSupportView`; `IncidentDetail` e `IncidentTransitionView` contienen
  los campos exigidos. Las restricciones, idempotencia, métricas/auditoría
  minimizadas y el límite de no mutación/outbox permanecen presentes.

## Hallazgo bloqueante

### P0-RV-010-011 — Las rutas de lectura exclusivas del CLIENT permiten ADMIN/DISPATCHER

`GET /v1/requests/{requestId}/rating` y
`GET /v1/requests/{requestId}/incidents` son las rutas de consulta propia del
CLIENT. REQ-010-004 y REQ-010-007 reservan a ADMIN/DISPATCHER la vista explícita
de soporte y la bandeja administrativa, respectivamente. Sin embargo, ambos
métodos llaman `orderForRead()`, que para todo rol distinto de CLIENT ejecuta
`operator()` y carga cualquier orden por `requestId`. En consecuencia, un
ADMIN/DISPATCHER autenticado puede obtener el detalle (incluso `otherMessage`)
o el listado desde una ruta exclusiva del portal, eludiendo las proyecciones y
la separación de rutas establecida.

Evidencia de código:

- `apps/api/src/aftercare/aftercare.controller.ts`, líneas 49--54 y 76--83;
- `apps/api/src/aftercare/aftercare.service.ts`, líneas 124--129 y 237--242;
- `apps/api/src/aftercare/aftercare.service.ts`, líneas 603--608.

Falta además una aserción HTTP real que compruebe `403` para ADMIN/DISPATCHER
en ambas rutas de CLIENT. La prueba actual sólo valida `403` al intentar crear
una calificación.

## Alcance

No se observó en el módulo de postventa escritura de `WorkOrder`, cargos,
pagos, conformidad, outbox ni notificaciones. Tampoco se añadió garantía,
remedio comercial, proveedor, canal externo o multimedia. Los cambios ajenos
preexistentes del árbol no se atribuyen a feat-010 ni fueron modificados.

## Condición para PASS

Restringir las dos lecturas `/v1/requests/{requestId}/...` al CLIENT
propietario; conservar ADMIN/DISPATCHER únicamente en
`/v1/admin/orders/{orderId}/aftercare` y `/v1/admin/incidents`; añadir
aserciones Nest/Fastify de `403` para ambos roles y registrar el comando/salida
sanitizados en `evidence.md`. Luego corresponde otra revisión independiente.
