# Convenciones de ingeniería

## Código y diseño

- Tipado estricto y ausencia de `any`/equivalentes sin justificación.
- Validación de entradas en límites y respuestas de error estructuradas.
- Lógica de dominio independiente de frameworks y proveedores cuando sea razonable.
- Fechas en UTC; zona horaria solo para presentación.
- Dinero con moneda ISO y representación decimal/entera segura, nunca coma flotante.
- IDs opacos; paginación y filtros explícitos en listados.
- Logs estructurados con correlation/request ID y sin datos sensibles.

## Pruebas

- Cada bug corregido agrega una prueba de regresión.
- Los servicios externos se prueban con contratos/mocks y fallos controlados.
- Los flujos críticos de estados, permisos, pagos y webhooks requieren integración o E2E.
- Cualquier modificación al frontend web debe validarse ejecutando la suite E2E (`pnpm test:e2e:frontends`).
- Una feature no se cierra si el repositorio no ofrece los comandos de calidad exigidos.

## Git

- Conventional Commits: `type(scope): resumen`.
- Incluir `Refs: <feature-id>` en el cuerpo.
- Commits pequeños y sin archivos ajenos al alcance.
- Prohibido versionar secretos, datos reales de clientes o multimedia cargada.
