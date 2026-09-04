# Tareas — feat-015: Adaptación y extensión visual con Stitch (Cliente y Backoffice)

Marcar una tarea sólo después de verificarla y registrar comando/salida o
inspección reproducible en `evidence.md`. Las tareas de implementación quedan
bloqueadas hasta aprobación explícita de la especificación.

## Discovery y especificación

- [x] TASK-015-001 `[REQ-015-001..004]` Inventariar pantallas existentes en Stitch proyecto `5240608439093127993` y listar funcionalidades faltantes sin pantalla (Notificaciones, Incidencias).
- [x] TASK-015-002 `[REQ-015-001..004]` Obtener aprobación humana de la especificación para habilitar implementación. Aprobada por el usuario el 2026-09-03T23:32:12-03:00.

## Generación y diseño con StitchMCP

- [x] TASK-015-003 `[REQ-015-004][AC-015-004]` Diseñar y generar pantalla móvil para "Centro de Notificaciones Cliente" en Stitch mediante `generate_screen_from_text` (ID: `3c1738e10af84f958bd35e2b09dd2ae0`).
- [x] TASK-015-004 `[REQ-015-004][AC-015-004]` Diseñar y generar pantalla móvil para "Reporte y Seguimiento de Incidencias Cliente" en Stitch mediante `generate_screen_from_text` (ID: `9fcdf8d558fe4fc89dcb55cdc8869f51`).
- [x] TASK-015-005 `[REQ-015-004][AC-015-004]` Diseñar y generar pantalla desktop para "Gestión de Incidencias y Reclamos Backoffice" en Stitch mediante `generate_screen_from_text` (ID: `b170123525a94333945450d2f91b2577`).

## Implementación frontend

- [x] TASK-015-006 `[REQ-015-001][AC-015-001]` Consolidar tokens semánticos de *PIGAR Utility Core* en estilos de ambos frontends.
- [x] TASK-015-007 `[REQ-015-002][AC-015-002]` Adaptar componentes de `apps/customer-web` para reflejar la UI/UX de las pantallas Stitch de Cliente.
- [x] TASK-015-008 `[REQ-015-003][AC-015-003]` Adaptar vistas y navegación de `apps/admin-web` a los patrones de las pantallas Stitch de Administración.
- [x] TASK-015-009 `[REQ-015-004][AC-015-004]` Integrar los diseños de las pantallas generadas en las rutas correspondientes de Cliente y Admin.

## Verificación y calidad

- [x] TASK-015-010 `[NFR-015-001..004][AC-015-005..007]` Ejecutar lint, typecheck, build y pruebas E2E de frontends (`pnpm test:e2e:frontends`).
- [x] TASK-015-011 Obtener revisión independiente de verificación para habilitar `publication_review`. Revisión independiente registrada con resultado PASS.
- [x] TASK-015-012 Obtener autorización explícita antes de commit, push, PR o despliegue. Autorizado por el usuario el 2026-09-04T00:01:07-03:00 para commit y push a staging.
