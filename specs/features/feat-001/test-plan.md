# Plan de pruebas — feat-001: Fundaciones técnicas y arquitectura ejecutable

## Alcance y riesgos

Se verificará la fundación técnica y las PoC, no flujos de producto. Riesgos prioritarios: exposición de servicios internos, pérdida de datos en reinicios, memoria durante cargas, archivos temporales, duplicación de webhooks/jobs, secretos en configuración/logs y falsa confianza en healthchecks.

## Pruebas unitarias

- Reglas de dependencias y configuración.
- Máquina de estados de orden y pago mediante tablas.
- Matriz de permisos.
- Validadores de MIME, tamaño, duración y nombres.
- Deduplicación y decisión de eventos de proveedor.
- Sanitización de logs y errores.

## Pruebas de integración

- Prisma contra PostgreSQL real efímero.
- Outbox/jobs con reclamo concurrente.
- Health/readiness con base disponible y caída.
- Streaming al volumen temporal/final con medición de memoria.
- Nginx internal redirect y denegación de acceso directo.
- Mercado Pago Sandbox cuando haya cuenta de prueba; mock contractual para casos deterministas.

## Pruebas E2E

- Compose completo desde entorno limpio.
- Acceso a shells mediante Nginx.
- Persistencia tras reinicio.
- Superficie externa limitada.
- Ejecución de PoC exclusivamente en perfil de test/poc.

## Seguridad y permisos

- Cliente A no accede a multimedia de cliente B.
- Actor no autorizado no carga ni descarga.
- Técnico no posee identidad o permiso.
- Firma inválida/replay no altera estado.
- Rutas físicas, secretos, tokens, coordenadas y payloads sensibles no aparecen en respuestas/logs.
- Escaneo de dependencias, contenedores y configuración.

## Casos de concurrencia e idempotencia

- Dos workers reclaman el mismo job.
- Dos eventos idénticos llegan simultáneamente.
- Evento pendiente llega después de aprobado.
- Timeout seguido de reintento con la misma clave.
- Dos finalizaciones intentan renombrar el mismo temporal.

## Fallos de proveedores y conectividad

- PostgreSQL cae y se recupera.
- Mercado Pago no responde, responde tarde o entrega evento perdido/duplicado.
- Carga multimedia se interrumpe.
- Disco alcanza umbral preventivo.
- Auth0 y Google Maps no se incluyen en readiness de esta feature; su viabilidad se valida documentalmente o con cuenta no productiva.

## Fixtures, mocks y datos personales

- Todos los nombres, IDs, archivos, direcciones y pagos son sintéticos.
- No se usan multimedia, credenciales, domicilios o identificadores reales.
- Los mocks conservan forma contractual mínima y eliminan campos sensibles innecesarios.
- Las credenciales Sandbox se inyectan fuera del repositorio y no se imprimen.

## Comandos esperados

Los nombres se fijan como contrato; su implementación corresponde a `TASK-008`.

| ID | Nivel | Escenario/AC | Comando | Estado |
|---|---|---|---|---|
| TEST-001 | build | AC-001 | `pnpm install --frozen-lockfile && pnpm build` | pass: 2026-07-25 |
| TEST-002 | architecture | AC-001 | `pnpm test:architecture` | pass: 2026-07-25 |
| TEST-003 | shell/a11y | AC-002 | `pnpm test:shells` y verificación HTTP local | pass: 2026-07-25 |
| TEST-004 | contract/integration | AC-003 | `pnpm test:api` | pass: 2026-07-25 |
| TEST-005 | integration | AC-004 | `pnpm test:integration --grep health-degraded` | pass: 2026-07-25 |
| TEST-006 | e2e | AC-005 | `pnpm test:e2e --grep persistence-restart` | pass: 2026-07-25 |
| TEST-007 | security/e2e | AC-006 | `pnpm test:security --grep network-surface` | pass: 2026-07-25 |
| TEST-008 | integration/performance | AC-007 | `pnpm test:integration --grep media-stream-valid` | pass: 2026-07-25 |
| TEST-009 | integration | AC-008 | `pnpm test:integration --grep media-invalid` | pass: 2026-07-25 |
| TEST-010 | security | AC-008 | `pnpm test:security --grep media-cross-access` | pass: 2026-07-25 |
| TEST-011 | contract/integration | AC-009 | `pnpm test:integration --grep payment-webhook` | pass: 2026-07-25 |
| TEST-012 | concurrency | AC-009 | `pnpm test:integration --grep payment-idempotency` | pass: 2026-07-25 |
| TEST-013 | integration | AC-010 | `pnpm test:integration --grep payment-reconciliation` | pass: 2026-07-25 |
| TEST-014 | quality | AC-011 | `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` | pass: 2026-07-25 |
| TEST-015 | CI meta-test | AC-011 | `pnpm test:ci-contract` | pass: 2026-07-25 |
| TEST-016 | unit/security | AC-012 | `pnpm test --grep config-secrets` | pass: 2026-07-24 |
| TEST-017 | integration/security | AC-012 | `pnpm test:security --grep log-sanitization` | pass: 2026-07-25 |
| TEST-018 | unit | AC-013 | `pnpm test --grep order-state-machine` | pass: 2026-07-25 |
| TEST-019 | unit/security | AC-013 | `pnpm test:security --grep permission-matrix` | pass: 2026-07-25 |
| TEST-020 | documentation | AC-014 | `pnpm docs:check` | pass: 2026-07-25 |
