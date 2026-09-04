# Criterios de Aceptación — feat-015: Adaptación y extensión visual con Stitch

## Criterios de aceptación funcionales

- [x] AC-015-001 `[REQ-015-001]` Los estilos globales de cliente y administración consumen las variables de color, tipografía y radio de *PIGAR Utility Core*.
- [x] AC-015-002 `[REQ-015-002]` Las vistas de cliente (inicio, solicitud, seguimiento, pago, perfil) coinciden visual y estructuralmente con las pantallas de referencia Stitch.
- [x] AC-015-003 `[REQ-015-003]` El panel de administración presenta navegación coherente con sidebar colapsable, tabla de pedidos y modal/panel de asignación según el diseño Stitch.
- [x] AC-015-004 `[REQ-015-004]` Las pantallas faltantes (Notificaciones Cliente, Incidencias Cliente, Gestión de Incidencias Admin) están generadas en el proyecto Stitch `5240608439093127993` e implementadas en el frontend respectivo.

## Criterios de aceptación no funcionales y calidad

- [x] AC-015-005 `[NFR-015-001]` Los elementos interactivos cumplen con el tamaño táctil mínimo de 48px y contraste de accesibilidad WCAG AA.
- [x] AC-015-006 `[NFR-015-002]` El diseño es completamente responsivo en mobile (390px) y desktop (>=1280px).
- [x] AC-015-007 `[NFR-015-004]` Las pruebas E2E de frontends (`pnpm test:e2e:frontends`), linter, typecheck y build pasan sin errores.
