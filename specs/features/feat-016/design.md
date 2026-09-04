# Diseño — feat-016: Alineación visual integral con diseños Stitch (Cliente y Backoffice)

## Arquitectura de UI y Pantallas Stitch de Referencia

| Pantalla Stitch | ID en Proyecto `5240608439093127993` | Vista PIGAR destino |
| :--- | :--- | :--- |
| **Gestión de Órdenes de Trabajo** | `24af4530870a483abb0ca6de047cb0c9` | `apps/admin-web/app/operational-requests.tsx`, `/admin/requests` |
| **Inicio - Cliente PIGAR** | `fc5886f67e6840eaa8e3da358aa4a89b` | `apps/customer-web/app/customer-home.tsx`, `/` |
| **Calificación de Servicio y Reseña** | `8ad5b1b4d65b49439d4bfc0eb0a37e04` | `apps/customer-web/app/customer-requests.tsx` (sección postventa) |
| **Gestión de Técnicos** | `84bb8e1ac5df43d397f715c01a15dd6f` | `apps/admin-web/app/technicians.tsx`, `/admin/technicians` |
| **Shell & TopAppBar Admin** | `24af4530870a483abb0ca6de047cb0c9` | `apps/admin-web/app/admin-shell.tsx` |
| **Shell & BottomNav Cliente** | `fc5886f67e6840eaa8e3da358aa4a89b` | `apps/customer-web/app/customer-shell.tsx` |

## Especificaciones de Componentes

### 1. Backoffice: Tabla de Órdenes (`apps/admin-web`)
- **Shell**: Sidebar fixed con ancho `260px`, logo PIGAR en fuente `Hanken Grotesk` negrita, enlaces con íconos Material Symbols (`dashboard`, `shopping_cart`, `group`, `engineering`, `settings`). Indicador activo en `Pedidos`.
- **TopAppBar**: Input buscador con fondo `#f2f4f6`, ícono de búsqueda, botones redondeados de notificaciones y ayuda, y botón CTA primario `Nueva Orden` con ícono `add`.
- **Bento Stats Grid**: 4 columnas (Total de hoy con `trending_up +12%`, En diagnóstico `08`, Sin asignar `03` en color error, y Completadas Mes `142` en fondo primario).
- **Filtros**: Píldoras con íconos para Estado, Técnico y Fecha ("Últimos 7 días") más botón "Limpiar filtros" y botones de exportación/impresión.
- **Data Table**:
  - `table` HTML estándar con encabezados en mayúsculas pequeñas `font-label-md` color `on-surface-variant`.
  - Filas interactivas con efecto hover.
  - Columna de ID en `JetBrains Mono` `#OT-xxxx`.
  - Columna de Cliente con nombre en negrita y dirección secundaria.
  - Categoría con ícono semántico (plomería, electricidad, aire acondicionado, gas).
  - Técnico con avatar circular de iniciales o "Sin asignar" en cursiva.
  - Estado: Píldora con borde sutil, fondo semántico y punto de color activo.
  - Fecha formateada y menú `more_vert`.
- **Card Asistente**: "Recomendación del sistema" con ícono de destello, texto explicativo y botones de acción ("Ver sugerencias" / "Ignorar").
- **Paginación**: Barra con contador "Mostrando X a Y de Z órdenes" y botones numerados.

### 2. Cliente Web: Inicio (`apps/customer-web`)
- **Header**: Sticky TopAppBar con ubicación ("Inicio PIGAR" y pin) y avatar de perfil.
- **Timeline de Seguimiento Activo**: Tarjeta con fondo blanco/glass, paso actual destacado y pasos pendientes conectados por línea vertical (`.timeline-step`, `.timeline-dot`).
- **Accesos Rápidos de Servicios**: Grid 2x2 o 4 columnas con tarjetas de categorías (Plomería, Electricidad, Cerrajería, Climatización) con íconos grandes e interacción táctil (min 48px).
- **Botón de Emergencia / Solicitud**: CTA flotante o destacado para crear nueva solicitud.
- **Historial Reciente**: Tarjetas con código de solicitud, categoría, técnico asignado y estado.
- **Bottom Navigation**: Barra fija inferior con 4 accesos directos (Inicio, Mis solicitudes, Notificaciones, Perfil).

### 3. Cliente Web: Calificación (`apps/customer-web`)
- Encabezado con imagen/avatar del técnico que atendió el servicio.
- Selector de calificación por estrellas interactivo (1 a 5 estrellas grandes).
- Chips de selección rápida de motivo: "Puntualidad", "Calidad", "Atención", "Limpieza".
- Área de texto para comentarios adicionales.
- Botón ancho completo "Registrar calificación".

## Compatibilidad de Tests Playwright
- Se retendrán las etiquetas `aria-label`, nombres de accesibilidad `getByRole`, atributos `id` y clases de compatibilidad (`product-shell--admin`, `product-shell--customer`, `customer-hero`, `request-form`, etc.) de forma que toda la suite E2E continúe pasando sin modificaciones ni regresiones.
