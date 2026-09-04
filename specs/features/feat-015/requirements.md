# Requisitos — feat-015: Adaptación y extensión visual con Stitch (Cliente y Backoffice)

## Objetivo y alcance

Adaptar integralmente las pantallas y componentes de las aplicaciones cliente (`apps/customer-web`) y administración (`apps/admin-web`) al proyecto Stitch `5240608439093127993` ("Aplicación Cliente Estándar").
Para cualquier funcionalidad del sistema que no cuente con una pantalla o componente explícito en Stitch (ej. centro de notificaciones, registro y detalle de incidencias de postventa, gestión de transiciones operativas sin técnico asignado), se diseñará la pantalla complementaria directamente en el proyecto Stitch usando StitchMCP (`generate_screen_from_text`) respetando el sistema de diseño *PIGAR Utility Core* y su rol (Cliente en MOBILE o Administración en DESKTOP).

## Fuera de alcance

- Modificar la API backend, contratos de datos, modelos Prisma o endpoints.
- Proveedores externos nuevos de pagos, mapas, identidad o almacenamiento.
- Portal o app nativa móvil para operarios (permanece diferido fuera del MVP según ADR-008).
- Tracking en tiempo real por GPS o exposición de datos privados de técnicos.

## Actores y permisos

- **Cliente (`ROLE_CLIENT`)**: Accede a portal mobile-first. Autenticación, inicio, creación de solicitudes con multimedia, timeline de seguimiento, pagos/conformidad, centro de notificaciones, incidencias y calificaciones.
- **Administrador (`ROLE_ADMIN`)**: Accede a consola desktop. Autenticación, bandeja de solicitudes/órdenes, asignación manual de operarios, gestión de presupuestos/tarifas, seguimiento de incidencias y auditoría.

## Requisitos funcionales

### REQ-015-001 — Adopción de tokens y componentes Stitch
- When: Se renderiza cualquier interfaz de cliente o backoffice.
- Where: `apps/customer-web`, `apps/admin-web`, `packages/ui`.
- The system shall: Aplicar la paleta semántica (*PIGAR Utility Core*: Navy Blue `#003f74`, Accent Yellow `#fec330`, Success Green `#00490f`, etc.), tipografía (Hanken Grotesk / Inter), elevación por capas tonales y border-radius definidos en Stitch.
- Errores y límites: No introducir dependencias externas de iconos no aprobadas ni romper soporte offline básico.

### REQ-015-002 — Adaptación de vistas de Cliente
- When: Un usuario cliente navega por la aplicación.
- Where: `apps/customer-web`.
- The system shall: Adaptar las vistas de inicio, nueva solicitud, detalle/seguimiento, pago y perfil a las pantallas correspondientes de Stitch (`fc5886f67e6840eaa8e3da358aa4a89b`, `9635c9e663c5482c82bc8b1a667cd9de`, `260937b7ae3e4832bb0ae773252c5d49`, `44d8a0b31d6b4a519593d46d29d9bc3f`, `aa994078b5544bab858fb859258b5807`).

### REQ-015-003 — Adaptación de vistas de Administración
- When: Un administrador gestiona solicitudes u órdenes de trabajo.
- Where: `apps/admin-web`.
- The system shall: Adaptar el layout con sidebar/rail, bandeja de órdenes, detalle con asignación de técnicos y resolución a las pantallas de Stitch (`cb6d7759a9c344f8891a9f83a64a19fb`, `ee1afc540e434ae3a4ce8e8b4ee89bb8`, `aad912ed079d4f178319c833c6c99d87`, `84bb8e1ac5df43d397f715c01a15dd6f`).

### REQ-015-004 — Diseño y generación en Stitch de pantallas faltantes
- When: Una funcionalidad del sistema (notificaciones in-app, detalle de incidencias/postventa) no posee pantalla en el proyecto Stitch.
- Where: Stitch Project `5240608439093127993` mediante StitchMCP.
- The system shall: Generar mediante `generate_screen_from_text` las pantallas faltantes aplicando el `designSystem` del proyecto y el tipo de dispositivo adecuado (`MOBILE` para cliente, `DESKTOP` para backoffice), e incorporarlas al inventario visual.

## Requisitos no funcionales

- NFR-015-001 Accesibilidad y contraste: Ratios de contraste WCAG AA, objetivos táctiles mínimos de 48px en mobile, soporte de navegación por teclado y lectores de pantalla.
- NFR-015-002 Responsive: Vistas de cliente optimizadas para smartphones (390px-780px fluidos); consola de administración optimizada para desktop (>=1280px).
- NFR-015-003 Rendimiento: Cero dependencias CSS pesadas en runtime; reutilización de estilos utilitarios y tokens CSS nativos.
- NFR-015-004 Calidad: Cumplimiento de suite de linters, typecheck y pruebas E2E de frontends (`pnpm test:e2e:frontends`).
- NFR-015-005 Seguridad: Prohibido exponer PII, claves o URLs de prototipos no autorizados en código o logs.

## Supuestos y preguntas abiertas

- Se reutiliza la estructura de rutas existentes en Next.js sin alterar endpoints ni autenticación Auth0.

## Dependencias

- Depende de feat-014 (sistema visual y tokens base consolidados).
- Requiere acceso a StitchMCP con projectId `5240608439093127993`.
