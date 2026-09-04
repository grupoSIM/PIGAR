# Diseño — feat-015: Adaptación y extensión visual con Stitch (Cliente y Backoffice)

## Resumen arquitectónico

Esta característica adapta de forma estricta las interfaces de usuario de PIGAR al proyecto Stitch `5240608439093127993` y utiliza StitchMCP para generar las pantallas de funcionalidades pendientes respetando la arquitectura de presentación:
- **Cliente (`apps/customer-web`)**: Entorno Mobile-first (390px - 780px viewport), barra de navegación contextual inferior/superior, flujos guiados en una pantalla.
- **Administración (`apps/admin-web`)**: Entorno Desktop (>= 1280px), layout con Sidebar/Rail colapsable, encabezado con perfil, área de contenido con tarjetas de resumen, tablas y paneles laterales de detalle.

## Mapeo de pantallas existentes en Stitch

| Vista en PIGAR | Pantalla Stitch ID | Nombre Stitch | Dispositivo |
|---|---|---|---|
| Login Cliente | `94f5f01b1f8147daa0543089934a9c15` | Iniciar Sesión - PIGAR | Mobile |
| Inicio / Mis Solicitudes | `fc5886f67e6840eaa8e3da358aa4a89b` | Inicio - Cliente PIGAR | Mobile |
| Nueva Solicitud | `9635c9e663c5482c82bc8b1a667cd9de` | Nueva Solicitud | Mobile |
| Seguimiento / Detalle | `260937b7ae3e4832bb0ae773252c5d49` | Seguimiento de Orden | Mobile |
| Pago Visita Estándar | `44d8a0b31d6b4a519593d46d29d9bc3f` | Pago de Visita Estándar | Mobile |
| Aprobación Presupuesto | `4132539ac9de410fb2edd4f23f818f47` | Aprobación de Presupuesto | Mobile |
| Pago Final Presupuesto | `24c8ceaa6c7d449b9e1f512d3160a96b` | Pago Final - Presupuesto | Mobile |
| Calificación / Reseña | `8ad5b1b4d65b49439d4bfc0eb0a37e04` | Calificación de Servicio | Mobile |
| Perfil de Cliente | `aa994078b5544bab858fb859258b5807` | Perfil de Usuario - PIGAR | Mobile |
| Login Backoffice | `cb6d7759a9c344f8891a9f83a64a19fb` | Inicio de Sesión - Admin | Desktop |
| Bandeja de Órdenes | `ee1afc540e434ae3a4ce8e8b4ee89bb8` | Gestión de Pedidos | Desktop |
| Asignación Operarios | `aad912ed079d4f178319c833c6c99d87` | Asignación de Técnico | Desktop |
| Gestión de Técnicos | `84bb8e1ac5df43d397f715c01a15dd6f` | Gestión de Técnicos | Desktop |

## Extensión mediante StitchMCP (Nuevas pantallas a diseñar)

Para funcionalidades implementadas en PIGAR sin diseño previo en Stitch:
1. **Centro de Notificaciones Cliente (Mobile)**: Bandeja de mensajes in-app, indicador no leídas, filtros de tipo (sistema, visita, pago).
2. **Gestión de Incidencias y Reclamos Cliente (Mobile)**: Formulario de reporte con motivo, multimedia adjunta y seguimiento de estado de la incidencia.
3. **Panel de Gestión de Incidencias Backoffice (Desktop)**: Vista administrativa para responder, resolver o compensar reclamos postventa.

Estas pantallas se generarán a través de StitchMCP (`generate_screen_from_text`) usando `projectId: "5240608439093127993"`.

## Seguridad y Privacidad

- No se almacenan ni muestran tokens de sesión en URLs.
- No se persisten datos PII ni capturas no sanitizadas.
- Se mantiene el principio de mínima exposición en las interfaces (solo nombres de pila para técnicos asignados, sin teléfono ni geolocalización en tiempo real).
