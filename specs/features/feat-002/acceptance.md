# Aceptación — feat-002: Identidad, roles y perfiles básicos

## Criterios

| ID | Escenario | Requisito | Evidencia esperada |
|---|---|---|---|
| AC-002-001 | Cliente entra por código OTP email o Google y recibe sólo su perfil | REQ-002-001, REQ-002-005 | E2E con proveedor simulado |
| AC-002-002 | Personal invitado acepta desde HTTPS `/login`, requiere MFA y obtiene rol local asignado | REQ-002-001, REQ-002-004 | Integración de adaptador/mock y E2E HTTPS de staging |
| AC-002-003 | JWT ausente, vencido, de issuer/audience erróneo o rol no permitido se deniega | REQ-002-003 | Pruebas de seguridad HTTP |
| AC-002-004 | Altas concurrentes del mismo subject producen un solo perfil | REQ-002-002 | Integración PostgreSQL |
| AC-002-005 | Sólo ADMIN administra perfiles internos; conserva al menos un ADMIN activo | REQ-002-004 | Unitarias e integración |
| AC-002-006 | Cuenta inactiva y técnico sin identidad PIGAR no acceden aun con token válido | REQ-002-003, REQ-002-006 | Pruebas negativas |
| AC-002-007 | Logs/auditoría no incluyen tokens, emails, teléfono ni headers de autorización | REQ-002-006, NFR-002-004 | Seguridad y revisión de logs |

## Matriz de trazabilidad

| Criterio | Tareas | Pruebas | Evidencia |
|---|---|---|---|
| AC-002-001 | TASK-002-003, TASK-002-006 | TEST-002-001 | pendiente |
| AC-002-002 | TASK-002-002, TASK-002-006 | TEST-002-002 | pendiente |
| AC-002-003 | TASK-002-004, TASK-002-006 | TEST-002-003 | `evidence.md` 2026-07-28, `auth-token-validation` (parcial) |
| AC-002-004 | TASK-002-003, TASK-002-006 | TEST-002-004 | pendiente |
| AC-002-005 | TASK-002-005, TASK-002-006 | TEST-002-005 | `evidence.md` 2026-07-28, `admin-profile-access` |
| AC-002-006 | TASK-002-004, TASK-002-006 | TEST-002-006 | pendiente |
| AC-002-007 | TASK-002-005, TASK-002-006 | TEST-002-007 | pendiente |
