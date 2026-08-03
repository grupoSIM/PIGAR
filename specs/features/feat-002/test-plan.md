# Plan de pruebas — feat-002: Identidad, roles y perfiles básicos

## Alcance y fixtures

Auth0 se reemplaza en pruebas automáticas por JWKS, tokens y Management API
simulados. Los subjects, emails, nombres y teléfonos son sintéticos; nunca se
incluyen tokens reales en fixtures, snapshots o logs.

| ID | Nivel | Escenario/AC | Comando | Estado |
|---|---|---|---|---|
| TEST-002-001 | E2E/manual staging | AC-002-001 | `pnpm test:e2e --grep auth-client` y acceso OTP no productivo | pass local: selector propio ofrece sólo OTP email; OTP fue validado en staging el 2026-07-29. Falta la verificación final contra la imagen que se despliegue autorizadamente. |
| TEST-002-002 | integración/E2E staging | AC-002-002 | `pnpm test:security --grep auth-provisioning` y acceso manual con MFA | pass parcial: adaptador/deduplicación y acceso MFA no productivo validados; requiere reconciliación final de evidencia |
| TEST-002-003 | seguridad | AC-002-003 | `pnpm test:security --grep auth-token-validation` | pass: ausencia, estructura, firma, issuer, audiencia, expiración y clave desconocida |
| TEST-002-004 | integración | AC-002-004 | `pnpm test:integration --grep profile-idempotency` | pass: 16 altas concurrentes dejan un único perfil PostgreSQL |
| TEST-002-005 | seguridad | AC-002-005 | `pnpm test:security --grep admin-profile-access` | pass |
| TEST-002-006 | seguridad | AC-002-006 | `pnpm test:security --grep inactive-and-worker-access` | pass: perfil inactivo y rol técnico denegados |
| TEST-002-007 | seguridad | AC-002-007 | `pnpm test:security --grep auth-log-sanitization` | pass: correlación y exclusión de datos sensibles |
| TEST-002-008 | unitaria de regresión | AC-002-002 | `node --test scripts/identity-admin.test.mjs` | pass: login y callback administrativo bajo `/admin`, sin proxy heredado `/login` |

Las verificaciones finales ejecutarán formato, lint, typecheck, build, unit,
integración, seguridad y E2E conforme a los comandos raíz ya existentes.
