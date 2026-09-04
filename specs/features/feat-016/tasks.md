# Tareas — feat-016: Alineación visual integral con diseños Stitch

Marcar una tarea sólo después de verificarla y registrar comando/salida o
inspección reproducible en `evidence.md`. Las tareas de implementación quedan
bloqueadas hasta aprobación explícita de la especificación.

## Discovery y especificación

- [x] TASK-016-001 `[REQ-016-001..005]` Analizar pantallas y extraer código HTML/CSS de Stitch para Backoffice (`24af4530870a483abb0ca6de047cb0c9`), Cliente Inicio (`fc5886f67e6840eaa8e3da358aa4a89b`), Técnicos (`84bb8e1ac5df43d397f715c01a15dd6f`) y Calificación (`8ad5b1b4d65b49439d4bfc0eb0a37e04`).
- [x] TASK-016-002 `[REQ-016-001..005]` Obtener aprobación humana de la especificación para habilitar implementación. Aprobada explícitamente por el usuario el 2026-09-04T12:59:00-03:00.

## Implementación Backoffice (`apps/admin-web`)

- [x] TASK-016-003 `[REQ-016-002][AC-016-002]` Implementar Shell y navegación fija/drawer de Backoffice con estilos Stitch, fuentes Google Fonts (Hanken Grotesk, Material Symbols) y avatar de perfil.
- [x] TASK-016-004 `[REQ-016-001][AC-016-001]` Reconstruir `/admin/requests` y `/admin` como Data Table completa con Bento stats, barra de filtros, tarjeta de recomendación y paginador según Stitch `24af4530870a483abb0ca6de047cb0c9`.
- [x] TASK-016-005 `[REQ-016-003][AC-016-003]` Adaptar vistas `/admin/technicians` y `/admin/incidents` a la estética y componentes de tarjetas de Stitch.

## Implementación Cliente (`apps/customer-web`)

- [x] TASK-016-006 `[REQ-016-004][AC-016-004]` Reconstruir el Inicio de Cliente (`/`) con TopAppBar, tarjeta de seguimiento activa con timeline visual, cuadrícula de servicios y BottomNav según Stitch `fc5886f67e6840eaa8e3da358aa4a89b`.
- [x] TASK-016-007 `[REQ-016-005][AC-016-005]` Reconstruir el componente de Calificación y Reseña de servicio en `/requests` según Stitch `8ad5b1b4d65b49439d4bfc0eb0a37e04`.

## Verificación y calidad

- [x] TASK-016-008 `[NFR-016-001..003][AC-016-006]` Ejecutar suite completa de lint, typecheck, build y pruebas E2E (`pnpm test:e2e:frontends`).
- [x] TASK-016-009 `[AC-016-007]` Realizar auditoría visual en navegador con capturas en desktop y mobile para validar fidelidad con Stitch.
- [x] TASK-016-010 Obtener revisión independiente de verificación para habilitar `publication_review`. Dictamen APROBADO por subagente 1fb4adce-2fbd-48ea-996c-5ed700587083.
- [x] TASK-016-011 Obtener autorización humana antes de publicar en staging. Aprobada explícitamente por el usuario el 2026-09-04T14:21:41-03:00.
