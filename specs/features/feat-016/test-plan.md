# Plan de Pruebas — feat-016: Alineación visual integral con diseños Stitch

## Pruebas automatizadas

1. **Linter de código**:
   - Comando: `pnpm run lint`
   - Criterio: 0 errores y 0 warnings bloqueantes en todos los paquetes.

2. **Verificación de tipos TypeScript**:
   - Comando: `pnpm -r run typecheck`
   - Criterio: 0 errores de tipado en los 11 proyectos del monorepositorio.

3. **Compilación de producción**:
   - Comando: `pnpm -r run build`
   - Criterio: Build exitoso para `customer-web`, `admin-web`, `api` y `worker`.

4. **Pruebas End-to-End de frontends (Playwright)**:
   - Comando: `pnpm test:e2e:frontends`
   - Criterio: 17/17 tests pasando (8 de `customer-web`, 9 de `admin-web`).

5. **Pruebas unitarias y de integración**:
   - Comando: `pnpm test`
   - Criterio: 52/52 tests pasando.

## Verificación visual y manual en navegador

1. **Auditoría visual Backoffice (`admin-web`)**:
   - Viewport desktop: 1280x800.
   - Rutas auditadas:
     - `/admin/requests`: Confirmar tabla de datos con columnas ID Orden, Cliente, Categoría, Técnico, Estado, Fecha; tarjetas Bento superiores; buscador y paginador.
     - `/admin/technicians`: Confirmar tarjetas de técnicos con badges y avatares.
     - `/admin/incidents`: Confirmar panel de incidencias con badges de triage.
   - Capturas guardadas y verificadas contra Stitch `24af4530870a483abb0ca6de047cb0c9`.

2. **Auditoría visual Cliente (`customer-web`)**:
   - Viewport mobile: 390x844.
   - Rutas auditadas:
     - `/`: Confirmar TopAppBar, tarjeta de seguimiento de orden activa con timeline vertical, cuadrícula de servicios (Plomería, Electricidad, etc.), CTA y BottomNav.
     - `/requests`: Confirmar listado estructurado y tarjeta de calificación de servicio con selector de estrellas.
   - Capturas guardadas y verificadas contra Stitch `fc5886f67e6840eaa8e3da358aa4a89b` y `8ad5b1b4d65b49439d4bfc0eb0a37e04`.
