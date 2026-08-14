# Aceptación — feat-013: Sistema visual y experiencia operativa inicial

| ID | Escenario | Requisitos | Pruebas |
| --- | --- | --- | --- |
| AC-013-001 | CLIENT y ADMIN comparten tokens, tipografías y componentes consistentes; no se carga un recurso visual remoto de Stitch. | REQ-013-001, NFR-013-002 | TEST-013-001, TEST-013-003 |
| AC-013-002 | CLIENT completa los flujos ya existentes de acceso, solicitud, adjunto y seguimiento desde mobile y desktop sin pérdida de datos ni acciones. | REQ-013-002, REQ-013-005 | TEST-013-002, TEST-013-004 |
| AC-013-003 | ADMIN/DISPATCHER opera bandeja, técnicos, asignación y hitos con sidebar adaptable, sin KPI ni tracking añadidos. | REQ-013-003, REQ-013-005 | TEST-013-002, TEST-013-004 |
| AC-013-004 | Carga, vacío, error, sesión expirada, permiso denegado y adjunto inválido/progreso comunican una acción segura y accesible. | REQ-013-004, REQ-013-005 | TEST-013-001, TEST-013-002, TEST-013-004 |
| AC-013-005 | CLIENT no ve PII/datos internos al navegar las pantallas rediseñadas; foco, teclado, contraste y controles táctiles cumplen la convención. | REQ-013-005, NFR-013-001, NFR-013-004 | TEST-013-003, TEST-013-004 |

## Matriz de trazabilidad

| Criterio | Requisito | Tareas | Pruebas | Evidencia |
| --- | --- | --- | --- | --- |
| AC-013-001 | REQ-013-001 | TASK-013-001 | TEST-013-001, TEST-013-003 | `shells.test.mjs`, build reproducible y licencias locales |
| AC-013-002 | REQ-013-002, REQ-013-005 | TASK-013-002 | TEST-013-002, TEST-013-004 | E2E CLIENT 3/3 y healthcheck local |
| AC-013-003 | REQ-013-003, REQ-013-005 | TASK-013-003 | TEST-013-002, TEST-013-004 | E2E ADMIN 3/3 y healthcheck local |
| AC-013-004 | REQ-013-004, REQ-013-005 | TASK-013-004 | TEST-013-001, TEST-013-002, TEST-013-004 | E2E de sesión/errores y estados visibles |
| AC-013-005 | REQ-013-005, NFR-013-001, NFR-013-004 | TASK-013-005 | TEST-013-003, TEST-013-004 | controles de 48 px, navegación accesible y suites registradas |
