# Criterios de Aceptación — feat-016: Alineación visual integral con diseños Stitch

- [AC-016-001] **Backoffice - Tabla de Órdenes y KPIs**:
  - `/admin/requests` y `/admin` presentan una Data Table completa conforme a la pantalla Stitch `24af4530870a483abb0ca6de047cb0c9`, incluyendo encabezados de columna (`ID Orden`, `Cliente`, `Categoría`, `Técnico`, `Estado`, `Fecha`), tarjetas Bento de estadísticas superiores y tarjeta de recomendación.
- [AC-016-002] **Backoffice - Navegación y Shell**:
  - La barra lateral (desktop) y el drawer (mobile/tablet) replican el diseño de Stitch con íconos de Material Symbols, jerarquía tipográfica `Hanken Grotesk` y pie con avatar y perfil.
- [AC-016-003] **Backoffice - Gestión de Técnicos e Incidencias**:
  - `/admin/technicians` y `/admin/incidents` utilizan los tokens semánticos de Stitch, tarjetas estructuradas y paneles de postventa coherentes con el diseño de Stitch.
- [AC-016-004] **Cliente - Inicio y Seguimiento Móvil**:
  - La página principal `/` de `customer-web` despliega el TopAppBar con avatar, la tarjeta activa de seguimiento con timeline escalonado, la cuadrícula de categorías de servicio con íconos y la barra de navegación inferior `BottomNav` según Stitch `fc5886f67e6840eaa8e3da358aa4a89b`.
- [AC-016-005] **Cliente - Formulario de Calificación**:
  - La sección de calificación en `/requests` presenta el selector de estrellas, chips de motivos y estilo consistente con Stitch `8ad5b1b4d65b49439d4bfc0eb0a37e04`.
- [AC-016-006] **Pruebas de Calidad y E2E**:
  - `pnpm run lint` finaliza con 0 errores.
  - `pnpm -r run typecheck` finaliza con 0 errores.
  - `pnpm -r run build` construye exitosamente todos los paquetes y aplicaciones.
  - `pnpm test:e2e:frontends` aprueba el 100% de los tests E2E tanto de `customer-web` como de `admin-web`.
  - `pnpm test` aprueba el 100% de los tests unitarios y de integración.
- [AC-016-007] **Auditoría Visual en Navegador**:
  - Se capturan y verifican visualmente las pantallas en resoluciones desktop (1280x800) y mobile (390x844) comprobando su correspondencia con los prototipos de Stitch.
