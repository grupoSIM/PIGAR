# Tareas — feat-007: Resolución administrativa, cobro y conformidad

Estado: implementación parcial. Sólo se marcan tareas con verificación local
registrada en `evidence.md`; las validaciones de Mercado Pago no productivo y
las puertas humanas permanecen pendientes.

- [x] TASK-007-001 `[REQ-007-001][REQ-007-002][NFR-007-001][NFR-007-006][AC-007-001 a AC-007-003][AC-007-014]` Crear migración aditiva/modelos/constraints para resolución, cargo, intento, recibo, job y conformidad, con historial append-only y forward-fix. Verificado en PostgreSQL local no productivo el 2026-08-27.
- [x] TASK-007-002 `[REQ-007-001][AC-007-001][AC-007-002]` Implementar comando transaccional e idempotente ADMIN/DISPATCHER de resolución + cargo + transición/versionado. Verificado en PostgreSQL local no productivo el 2026-08-27.
- [ ] TASK-007-003 `[REQ-007-002][REQ-007-003][NFR-007-003][AC-007-003][AC-007-004][AC-007-013]` Implementar puerto/adaptador Checkout Pro, preferencia mínima, referencia opaca, recuperación de creación ambigua y allowlist HTTPS.
- [ ] TASK-007-004 `[REQ-007-005][REQ-007-006][NFR-007-002][AC-007-006][AC-007-007]` Implementar receptor Webhook limitado, firma oficial vigente, skew/replay, recibo minimizado, dedupe y encolado.
- [ ] TASK-007-005 `[REQ-007-006][REQ-007-007][NFR-007-004][AC-007-008][AC-007-009]` Implementar consulta autoritativa, comparación de dinero/referencia, transiciones monotónicas, worker de conciliación, backoff y alertas.
- [ ] TASK-007-006 `[REQ-007-003][REQ-007-004][REQ-007-008][AC-007-004][AC-007-005][AC-007-012][AC-007-015]` Implementar contrato HTTP CLIENT, retorno no autoritativo y UX pagar/retomar/verificar/reintentar.
- [ ] TASK-007-007 `[REQ-007-008][REQ-007-010][NFR-007-002][NFR-007-003][NFR-007-005][AC-007-010][AC-007-013][AC-007-015]` Implementar proyecciones ADMIN/CLIENT, permisos negativos, auditoría/logs/métricas sanitizados y rate limiting.
- [x] TASK-007-008 `[REQ-007-009][AC-007-011][AC-007-012][AC-007-015]` Implementar texto versionado, comando idempotente CLIENT de conformidad, evidencia mínima y cierre transaccional. Verificado en PostgreSQL local no productivo el 2026-08-27.
- [ ] TASK-007-009 `[REQ-007-010][NFR-007-005][AC-007-013]` Incorporar runbook de conciliación/alertas, configuración tipada de timeouts/secreto/hosts y controles anti-filtración. Runbook: `docs/runbooks/payment-reconciliation.md`.
- [ ] TASK-007-010 `[NFR-007-001 a NFR-007-008][AC-007-014][AC-007-015]` Ejecutar unitarias, PostgreSQL, contrato, seguridad, migración, E2E CLIENT/ADMIN y calidad completa; registrar toda evidencia.
- [ ] TASK-007-011 `[REQ-007-003 a REQ-007-007][AC-007-016]` Con autorización y acceso humano, validar aplicación/cuentas no productivas de Mercado Pago según TEST-007-014 sin exponer secretos; bloquear aprobación si falta algún escenario.
