# Tareas — feat-010: Calificaciones e incidencias de postventa

Estado: `publication_review`. La especificación fue aprobada y cada tarea se marca
sólo tras ejecutar sus pruebas aplicables y registrar comando/salida en
`evidence.md`.

- [x] TASK-010-001 `[REQ-010-003][REQ-010-005][REQ-010-006][NFR-010-001][NFR-010-006][NFR-010-007][AC-010-001][AC-010-003][AC-010-005][AC-010-006][AC-010-011]`
      Crear migración aditiva/modelos/checks/FKs `RESTRICT`, rating append-only,
      historial de incidencia append-only, reserva idempotente, unicidad de
      rating e índice parcial de incidencia activa; documentar forward-fix.
      Verificada por la migración forward-only y `scripts/aftercare-postgres.test.mjs`
      contra PostgreSQL local sintético (ver evidencia del 2026-09-01).
- [x] TASK-010-002 `[REQ-010-001][REQ-010-002][REQ-010-003][REQ-010-004][REQ-010-008][NFR-010-001][NFR-010-002][NFR-010-003][AC-010-001 a AC-010-004][AC-010-008]`
      Implementar normalización/validación segura, comando CLIENT de rating,
      consulta explícita, idempotencia/concurrencia e inmutabilidad, sin escribir
      orden, pago, conformidad u outbox.
      Verificada por build API, pruebas focalizadas, PostgreSQL real y E2E CLIENT;
      evidencia actualizada el 2026-09-02 tras ligar idempotencia al request.
- [x] TASK-010-003 `[REQ-010-005][REQ-010-006][REQ-010-007][REQ-010-008][NFR-010-001][NFR-010-002][NFR-010-004][AC-010-005 a AC-010-008]`
      Implementar apertura CLIENT, transiciones ADMIN/DISPATCHER, historial,
      bandeja/proyecciones, cursor y versión esperada sin texto ni adjuntos.
      Verificada por build API, PostgreSQL real y E2E CLIENT/ADMIN con fixtures
      sintéticos; evidencia actualizada el 2026-09-02 tras validar UUID, cursor y
      orden contractual.
- [x] TASK-010-004 `[REQ-010-004][REQ-010-007][REQ-010-009][NFR-010-002][NFR-010-003][NFR-010-004][AC-010-002][AC-010-004][AC-010-007][AC-010-009][AC-010-010][AC-010-013]`
      Aplicar autorización por rol/propiedad/estado, errores 401/403/404/409,
      rate limits, DTOs cerrados y proyecciones mínimas sin enumeración.
      Verificada mediante suites focalizadas unit/security/integration, E2E CLIENT y
      ADMIN, y build de API; evidencia 2026-09-01.
- [x] TASK-010-005 `[REQ-010-001][REQ-010-002][REQ-010-004][REQ-010-005][NFR-010-003][NFR-010-005][NFR-010-008][AC-010-002][AC-010-012][AC-010-013]`
      Incorporar postventa CLIENT accesible en la orden cerrada: rating, `OTRO`
      escapado, incidencia estructurada e historial sólo lectura, sin promesas ni
      canales.
      Verificada mediante build CLIENT y E2E sintética de alta de calificación e
      incidencia; evidencia 2026-09-01.
- [x] TASK-010-006 `[REQ-010-006][REQ-010-007][NFR-010-005][NFR-010-008][AC-010-006][AC-010-007][AC-010-012][AC-010-013]`
      Incorporar consulta de soporte y bandeja accesible ADMIN/DISPATCHER con
      sólo próxima transición válida, sin edición, reapertura, dinero o mensajes.
      Verificada mediante build ADMIN y E2E sintética de triage/cierre, más la
      consulta explícita de rating/incidencias por orden cerrada; evidencia
      2026-09-02.
- [x] TASK-010-007 `[REQ-010-002][REQ-010-008][REQ-010-009][NFR-010-003][NFR-010-006][NFR-010-007][NFR-010-008][AC-010-008 a AC-010-011][AC-010-013]`
      Agregar auditoría/métricas/alertas sanitizadas, pruebas de ausencia de
      contenido/outbox y documentación de retención de staging y bloqueos de
      producción.
      Verificada por auditoría minimizada, búsqueda de aislamiento/outbox, pruebas
      focalizadas y documentación de migración/retención; evidencia 2026-09-01.
- [x] TASK-010-008 `[REQ-010-001 a REQ-010-009][NFR-010-001 a NFR-010-008][AC-010-001 a AC-010-013]`
      Ejecutar unitarias, contrato, PostgreSQL/concurrencia, seguridad, rate
      limit, rendimiento, accesibilidad, E2E CLIENT/ADMIN y calidad completa;
      registrar evidencia sintética sin contenido sensible.
      Calidad completa, PostgreSQL real, seguridad, E2E, documentación y evidencia
      trazable ejecutadas el 2026-09-01/02; las correcciones posteriores requieren
      un nuevo PASS independiente antes de publication_review.
