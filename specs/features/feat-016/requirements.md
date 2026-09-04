# Requisitos — feat-016: Alineación visual integral con diseños Stitch (Cliente y Backoffice)

## Contexto y problema
En staging, las pantallas actuales de Cliente y Administración muestran listas planas apiladas y carecen del diseño, jerarquía, layout y componentes interactivos diseñados en los prototipos de Stitch (proyecto `5240608439093127993`). Se requiere transformar las pantallas de ambos frontends para que coincidan visual y estructuralmente con los diseños oficiales de Stitch.

## Requisitos funcionales

- [REQ-016-001] **Backoffice - Tabla de Órdenes y Bento Stats**:
  - Reemplazar el listado vertical de solicitudes en `/admin/requests` y `/admin` por una Data Table estructurada con columnas: ID Orden (`#OT-xxxx`), Cliente (nombre y dirección), Categoría con ícono semántico, Técnico con avatar/iniciales o "Sin asignar", Estado (badge con punto de color), Fecha y menú de acciones.
  - Incorporar la fila superior de tarjetas Bento de métricas: "Total de Hoy", "En Diagnóstico", "Sin Asignar" y "Completadas Mes".
  - Incorporar la barra de filtros (Estado, Técnico, Rango temporal y "Limpiar filtros") y buscador.
  - Incorporar la tarjeta de recomendaciones del sistema ("Recomendación del sistema").
  - Incorporar barra de paginación inferior.

- [REQ-016-002] **Backoffice - Shell y Navegación**:
  - Sidebar izquierdo fijo de 260px (`w-sidebar-width`) con marca "PIGAR Administración", íconos Material Symbols para Dashboard, Pedidos (con indicador visual activo), Clientes, Técnicos, Configuración, y widget de perfil inferior.
  - TopAppBar con barra de búsqueda global, botones de notificaciones, ayuda y acción primaria "+ Nueva Orden".

- [REQ-016-003] **Backoffice - Gestión de Técnicos e Incidencias**:
  - Alinear la vista `/admin/technicians` a la pantalla de gestión de técnicos de Stitch con tarjetas de operarios, estados operativos (disponible/en servicio), avatar y datos de contacto.
  - Mantener en `/admin/incidents` la estructura de paneles de postventa con badges de severidad, triage y estados consistentes con la paleta de Stitch.

- [REQ-016-004] **Cliente - Inicio y Flujo de Seguimiento**:
  - Reestructurar el Home (`/`) en mobile para incluir: TopAppBar con ubicación/marca y avatar; tarjeta activa de seguimiento con timeline escalonado (solicitud -> técnico asignado -> en camino -> en servicio -> finalizado); cuadrícula de acceso rápido a categorías de servicio (Plomería, Electricidad, Cerrajería, Climatización); botón CTA principal "Solicitar Servicio" y listado de solicitudes recientes con pills de estado.
  - Barra de navegación inferior móvil (`BottomNav`) con accesos a Inicio, Solicitudes, Notificaciones y Perfil.

- [REQ-016-005] **Cliente - Calificación y Reseña de Postventa**:
  - Alinear el formulario de calificación de servicios en `/requests` con la pantalla de Stitch `8ad5b1b4d65b49439d4bfc0eb0a37e04`: selector de estrellas visuales, chips de motivo (Puntualidad, Calidad, Trato, Limpieza), campo de reseña y botón principal de envío.

## Requisitos no funcionales

- [NFR-016-001] **Compatibilidad y accesibilidad**:
  - Conservar todas las aserciones, roles ARIA, labels accesibles y clases de test requeridas por la suite E2E Playwright de ambos frontends (`apps/customer-web` y `apps/admin-web`).
- [NFR-016-002] **Tipografía y Tokens**:
  - Cargar las fuentes `Hanken Grotesk`, `Inter`, `JetBrains Mono` y `Material Symbols Outlined`.
  - Aplicar fielmente las variables de color de Stitch (`#003f74` primary, `#f8f9fb` surface, `#f2f4f6` container, etc.).
- [NFR-016-003] **Cero regresiones de backend**:
  - No modificar esquemas de base de datos ni contratos de API.
