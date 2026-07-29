# Tareas — feat-002: Identidad, roles y perfiles básicos

- [ ] TASK-002-001 `[REQ-002-001][NFR-002-001]` Validar y documentar Auth0 no productivo (plan/cuotas, URLs exactas, issuer/audience/JWKS), sin versionar secretos.
- [ ] TASK-002-002 `[REQ-002-001][REQ-002-004][AC-002-002]` Implementar adaptadores OIDC e invitación aislados detrás de puertos, y el callback HTTPS `/login` del backoffice que reenvía `invitation` y `organization` sin registrarlos.
- [ ] TASK-002-003 `[REQ-002-002][REQ-002-005][AC-002-001][AC-002-004]` Migrar y persistir perfiles locales idempotentes; exponer perfil propio.
- [ ] TASK-002-004 `[REQ-002-003][AC-002-003][AC-002-006]` Incorporar guard de API y autorización local por perfil activo.
- [ ] TASK-002-005 `[REQ-002-004][REQ-002-006][AC-002-005][AC-002-007]` Añadir administración, revocación y auditoría sanitizada.
- [ ] TASK-002-006 `[NFR-002-001][NFR-002-004][AC-002-001][AC-002-007]` Añadir pruebas unitarias, integración, E2E y regresiones de logs/permisos.
- [ ] TASK-002-007 `[NFR-002-002][NFR-002-003]` Actualizar contrato, configuración, runbooks, migración forward/forward-fix y evidencia.
