# Tareas — feat-002: Identidad, roles y perfiles básicos

- [x] TASK-002-001 `[REQ-002-001][NFR-002-001]` Validada y documentada la configuración Auth0 no productiva de OTP email y cuentas internas con MFA, sin versionar secretos. Google queda fuera del MVP; la validación de la imagen de staging actual requiere despliegue autorizado.
- [x] TASK-002-002 `[REQ-002-001][REQ-002-004][AC-002-002]` Implementado el acceso cliente por OTP email y el aprovisionamiento interno aislado detrás de puertos, con MFA para backoffice; se retiraron la superficie Google, su configuración de staging y el callback heredado de invitaciones. Verificado localmente el 2026-08-01; la validación de staging requiere despliegue autorizado.
- [x] TASK-002-003 `[REQ-002-002][REQ-002-005][AC-002-001][AC-002-004]` Migración, perfiles locales idempotentes y perfil propio implementados; integración PostgreSQL pasó con concurrencia y fixtures sintéticos el 2026-08-01.
- [x] TASK-002-004 `[REQ-002-003][AC-002-003][AC-002-006]` Guard OIDC y autorización por perfil activo implementados; seguridad de token, revocación y técnico sin acceso pasó el 2026-08-01.
- [x] TASK-002-005 `[REQ-002-004][REQ-002-006][AC-002-005][AC-002-007]` Aprovisionamiento, recuperación, revocación y auditoría sanitizada implementados; seguridad pasó el 2026-08-01.
- [x] TASK-002-006 `[NFR-002-001][NFR-002-004][AC-002-001][AC-002-007]` Suites unitarias, integración, seguridad y E2E pasaron localmente el 2026-08-01; la aceptación sobre imagen de staging sigue pendiente de despliegue autorizado.
- [x] TASK-002-007 `[NFR-002-002][NFR-002-003]` Contrato, configuración, migración forward/forward-fix, documentación y evidencia actualizados; las comprobaciones locales pasaron el 2026-08-01.
