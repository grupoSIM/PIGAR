# Plan de pruebas — feat-002: Identidad, roles y perfiles básicos

## Alcance y fixtures

Auth0 se reemplaza en pruebas automáticas por JWKS, tokens y Management API
simulados. Los subjects, emails, nombres y teléfonos son sintéticos; nunca se
incluyen tokens reales en fixtures, snapshots o logs.

| ID | Nivel | Escenario/AC | Comando | Estado |
|---|---|---|---|---|
| TEST-002-001 | E2E | AC-002-001 | `pnpm test:e2e --grep auth-client` | pass parcial: portal inicia Universal Login; OTP/Google no productivos pendientes |
| TEST-002-002 | integración/E2E staging | AC-002-002 | `pnpm test:security --grep auth-invitation` y aceptación manual desde HTTPS `/login` | pass parcial: deduplicación local; aceptación staging pendiente |
| TEST-002-003 | seguridad | AC-002-003 | `pnpm test:security --grep auth-token-validation` | pass: ausencia, estructura, firma, issuer, audiencia, expiración y clave desconocida |
| TEST-002-004 | integración | AC-002-004 | `pnpm test:integration --grep profile-idempotency` | pass: 16 altas concurrentes dejan un único perfil PostgreSQL |
| TEST-002-005 | seguridad | AC-002-005 | `pnpm test:security --grep admin-profile-access` | pass |
| TEST-002-006 | seguridad | AC-002-006 | `pnpm test:security --grep inactive-and-worker-access` | pass: perfil inactivo y rol técnico denegados |
| TEST-002-007 | seguridad | AC-002-007 | `pnpm test:security --grep auth-log-sanitization` | pass: correlación y exclusión de datos sensibles |

Las verificaciones finales ejecutarán formato, lint, typecheck, build, unit,
integración, seguridad y E2E conforme a los comandos raíz ya existentes.
