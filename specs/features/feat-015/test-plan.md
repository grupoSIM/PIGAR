# Plan de Pruebas — feat-015: Adaptación y extensión visual con Stitch

## Estrategia de pruebas

1. **Inspección Visual y Estructural**: Comparación de componentes renderizados contra el árbol DOM y estilos de referencia del proyecto Stitch `5240608439093127993`.
2. **Pruebas Estáticas y de Compilación**:
   - `pnpm -r run lint`
   - `pnpm -r run typecheck`
   - `pnpm -r run build`
3. **Pruebas Automatizadas E2E**:
   - `pnpm test:e2e:frontends`: Verificación de navegación cliente y administración, envío de solicitudes, filtros, asignaciones y transiciones de estado.
4. **Verificación de Generación MCP**:
   - Comprobación de que las nuevas pantallas generadas existan en el proyecto de Stitch mediante `list_screens` de StitchMCP.
