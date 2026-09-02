# Cuarta revisión independiente — feat-010

Fecha: 2026-09-02
Rol: Reviewer independiente, distinto del implementador y de las revisiones
anteriores
Veredicto: **FAIL**

Esta revisión no autoriza commit, push, PR, despliegue ni publicación. La
aprobación de publicación permanece `pending`.

## Verificaciones de los P0 de `review-3.md`

Los cuatro P0 de la tercera revisión están corregidos y cubiertos por la
prueba real de PostgreSQL/Nest:

- Los reintentos HTTP de rating e incidencia con la misma clave devuelven
  `200`; la creación inicial devuelve `201`.
- Los rechazos de servicio registran auditoría minimizada con outcome
  `CONFLICT`, `RATE_LIMITED` o `REJECTED`, sin payload, PII ni
  `otherMessage`; los contadores, latencia, conflictos, rate limits e
  incidencias activas se emiten como métricas sanitizadas.
- La vista de soporte exige que la orden esté `CERRADA`, por lo que no emite un
  `AftercareSupportView` inválido para órdenes de otro estado.
- Un cursor de forma válida pero ausente de la consulta se rechaza con `400`.

Se ejecutó nuevamente, con Docker/PostgreSQL local:

```text
node scripts/aftercare-postgres.test.mjs
pass 2, fail 0, skipped 2 condicionales
```

La prueba real ejercita las carreras de 20 comandos de rating, incidencia y
transición, replay, conflictos de payload/versión, snapshots de no mutación y
la API Nest/Fastify. No expuso `P2002` ni respuestas 500.

## Hallazgo bloqueante

### P0-RV-010-010 — La primera transición HTTP responde 201, fuera del contrato

`POST /v1/admin/incidents/{incidentId}/transitions` sólo declara respuesta
`200`, tanto para la transición aplicada como para el replay. Sin embargo, el
controlador invoca `respond(..., true)`, y `respond()` sólo fija `200` cuando el
resultado contiene el marcador no enumerable `replayed`. Para la primera
transición Nest conserva el código predeterminado de un `@Post`, `201`.

Esto incumple `api-contract.yaml` y no está cubierto por la prueba HTTP actual,
que verifica transición mediante servicio pero no el status HTTP inicial.

Evidencia:

- `specs/features/feat-010/api-contract.yaml`, líneas 208--227 (única
  respuesta exitosa `200`).
- `apps/api/src/aftercare/aftercare.controller.ts`, líneas 107--133 y 137--147
  (`transition()` usa el modo de creación y `respond()` sólo cambia el replay).

## Alcance inspeccionado

La implementación de feat-010 se mantiene limitada a calificaciones,
incidencias, consulta de soporte, migración, métricas/auditoría minimizadas y
vistas del portal/panel. No se observó escritura desde postventa sobre
`WorkOrder`, pagos, cargos, conformidad, outbox o notificaciones, ni se agregó
garantía, proveedor, canal externo o multimedia. El árbol de trabajo contiene
cambios preexistentes ajenos a feat-010; no fueron atribuidos ni modificados en
esta revisión.

## Condición para PASS

Hacer que la primera transición HTTP devuelva `200`, agregar la aserción
Nest/Fastify correspondiente y registrar su salida sanitizada en `evidence.md`.
Luego procede otra revisión independiente. Mientras tanto, no se debe avanzar a
`publication_review`.
