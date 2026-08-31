# Tareas — feat-009: Notificaciones transaccionales in-app

Cada tarea se marca sólo después de ejecutar sus pruebas y registrar comando y
salida resumida en `evidence.md`.

- [x] TASK-009-001 `[REQ-009-002][REQ-009-003][REQ-009-004][NFR-009-001][NFR-009-004][NFR-009-007][AC-009-002][AC-009-004][AC-009-005][AC-009-009]`
      Agregar modelo Prisma, migración forward-only, FKs, unicidad e índices;
      verificar migración vacía y restricciones con PostgreSQL real.
- [x] TASK-009-002 `[REQ-009-001][NFR-009-001][AC-009-001]` Definir el
      contrato allowlist v1 y emitir outbox atómicamente desde cada transición
      efectiva, sin payload sensible ni eventos por no-op/reintento.
- [x] TASK-009-003 `[REQ-009-002][REQ-009-005][NFR-009-003][NFR-009-005][AC-009-002][AC-009-003]`
      Implementar registro inmutable de plantillas y worker idempotente con
      resolución de propietario, leases, clasificación y errores seguros.
- [x] TASK-009-004 `[REQ-009-003][REQ-009-004][REQ-009-005][NFR-009-002][NFR-009-004][AC-009-004][AC-009-005][AC-009-006][AC-009-007]`
      Implementar contratos, cursor estable, listado/conteo y marcado monotónico
      con autorización por rol y propiedad.
- [x] TASK-009-005 `[REQ-009-006][NFR-009-008][AC-009-007][AC-009-008]`
      Incorporar bandeja CLIENT, indicador, estados accesibles y navegación que
      vuelve a consultar el recurso autoritativo.
- [x] TASK-009-006 `[REQ-009-007][NFR-009-002][NFR-009-003][NFR-009-006][NFR-009-009][AC-009-006][AC-009-009]`
      Agregar auditoría mínima, métricas, alertas y runbook sin contenido ni PII;
      documentar retención de staging y puerta productiva.
- [x] TASK-009-007 `[REQ-009-001][REQ-009-002][REQ-009-003][REQ-009-004][REQ-009-005][REQ-009-006][REQ-009-007][NFR-009-001][NFR-009-002][NFR-009-003][NFR-009-004][NFR-009-005][NFR-009-006][NFR-009-007][NFR-009-008][NFR-009-009][AC-009-001][AC-009-002][AC-009-003][AC-009-004][AC-009-005][AC-009-006][AC-009-007][AC-009-008][AC-009-009]`
      Ejecutar plan unitario, integración, contrato, seguridad, concurrencia,
      frontend, migración y calidad; registrar evidencia sin datos sensibles.
- [ ] TASK-009-008 `[REQ-009-003][REQ-009-004][REQ-009-006][AC-009-003][AC-009-004][AC-009-005][AC-009-007][AC-009-008]`
      Realizar UAT manual en staging con cuentas y referencias sintéticas,
      comprobando los seis avisos, lectura y degradación sin exponer datos.
