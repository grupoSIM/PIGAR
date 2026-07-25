# Revisión de diseños Google Stitch

- Estado: validado para el alcance del MVP
- Fecha: 2026-07-21
- Fuentes:
  - `stitch/aplicacion_cliente.zip` — SHA-256 `BE66498B9ACE544A9FC2B8108036F71B3ACC2435061EDC19D3D114B5269D38E4`
  - `stitch/backoffice.zip` — SHA-256 `3F82E5157941FC7F7D5B3ACB44BF67D49D3B360D518ABF2AC3FB89E709E86975`

## Uso previsto

Las capturas y guías `DESIGN.md` son la referencia visual del producto. Los archivos `code.html` son prototipos estáticos generados por Stitch y no se incorporarán directamente a producción: contienen Tailwind por CDN, datos hardcodeados, scripts de demostración, fuentes/iconos remotos e imágenes externas. La implementación recreará los componentes en Next.js con tipado, accesibilidad, estados reales y assets controlados.

## Sistema visual aprovechable

- Identidad principal azul `#01579B`, superficies claras y acento amarillo para acciones destacadas.
- Hanken Grotesk para títulos e Inter para texto del portal cliente.
- Hanken Grotesk y mayor densidad para el backoffice.
- Ritmo de 8 px, objetivos táctiles mínimos de 48 px y navegación mobile-first en cliente.
- Sidebar, tablas, filtros, badges e indicadores semánticos para administración.
- Estados acompañados por texto/icono, no solo color.

Antes de implementación deben verificarse licencia/hosting de tipografías e iconos, contraste WCAG, navegación por teclado, foco visible, labels, mensajes de error y comportamiento responsive.

## Inventario portal cliente

| Pantalla Stitch | Tratamiento MVP | Feature |
|---|---|---|
| Iniciar sesión | Incluir, adaptada al ADR-003 | feat-002 |
| Inicio cliente | Incluir y simplificar a solicitudes/acciones del MVP | feat-004, feat-005 |
| Nueva solicitud | Incluir; agregar imágenes además de video | feat-004 |
| Seguimiento de orden | Incluir; solo hitos, sin ubicación del técnico | feat-005 |
| Perfil de usuario | Incluir versión básica | feat-002 |
| Pago visita estándar | Incluir con redirección Checkout Pro | feat-007 |
| Aprobación de presupuesto complejo | Diferir | feat-008 |
| Pago final de presupuesto complejo | Diferir | feat-008 |
| Calificación/reseña | Diferir | feat-010 |

## Inventario backoffice

| Pantalla Stitch | Tratamiento MVP | Feature |
|---|---|---|
| Inicio de sesión administración | Incluir | feat-002 |
| Dashboard operativo | No implementar; la entrada será la bandeja de solicitudes y órdenes | feat-011 |
| Listado/gestión de órdenes | Incluir y consolidar pantallas duplicadas | feat-005 |
| Asignación de técnico | Incluir como selección manual | feat-005 |
| Gestión de técnicos | Incluir CRUD mínimo de registros sin acceso al sistema | feat-005 |
| Editor de presupuestos | Diferir | feat-008 |
| Gestión de pedidos/materiales | Diferir salvo necesidad explícita de catálogo | posterior al MVP |
| Reportes y estadísticas | Diferir | feat-011 |

## Correcciones obligatorias de alcance y contenido

1. Reemplazar `QuickFix Home` y `TechAssist Ops` por PIGAR.
2. Usar datos ficticios coherentes con Argentina, moneda ARS y zona `America/Buenos_Aires`.
3. Eliminar dashboard de KPIs, mapas de calor, técnicos activos en ruta, distancia al técnico, arribo estimado y sugerencias automáticas por cercanía.
4. Eliminar toda ubicación o pin del técnico. El mapa del domicilio del cliente sí puede permanecer.
5. La asignación será manual; administración puede registrar `EN_CAMINO` con fecha/hora.
6. Eliminar textos que prometen push o SMS, porque los canales externos están diferidos.
7. Agregar hasta cinco imágenes opcionales y un video opcional de máximo 30 segundos, con estados de progreso/error/reintento.
8. Reemplazar imágenes remotas generadas por assets locales con licencia y datos ficticios aprobados.
9. Diseñar estados faltantes: vacío, carga, error, sin conexión, permiso denegado, archivo inválido, pago pendiente/rechazado y sesión expirada.

## Decisiones funcionales resueltas

- `UI-D01`: no habrá contacto directo cliente-técnico. Toda comunicación en PIGAR será cliente-administración. Administración coordina con el técnico por WhatsApp fuera de la aplicación.
- `UI-D02`: el backoffice inicial comienza en la bandeja de solicitudes y órdenes, sin KPIs.
- `UI-D03`: cada solicitud admite hasta cinco imágenes opcionales y un video opcional de máximo 30 segundos.

Las tres decisiones fueron confirmadas por el usuario el 2026-07-21.
