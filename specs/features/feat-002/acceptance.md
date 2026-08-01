# Aceptación — feat-002: Identidad, roles y perfiles básicos

## Criterios

| ID | Escenario | Requisito | Evidencia esperada |
|---|---|---|---|
| AC-002-001 | Cliente ve únicamente OTP email; completa el acceso y recibe sólo su perfil, sin contraseña, registro visible ni Google | REQ-002-001, REQ-002-005 | E2E con proveedor simulado y validación manual no productiva |
| AC-002-002 | Personal interno preaprovisionado inicia con usuario/email, contraseña y MFA; obtiene el rol local asignado | REQ-002-001, REQ-002-004 | Integración de adaptador/mock y E2E HTTPS de staging |
| AC-002-003 | JWT ausente, vencido, de issuer/audience erróneo o rol no permitido se deniega | REQ-002-003 | Pruebas de seguridad HTTP |
| AC-002-004 | Altas concurrentes del mismo subject producen un solo perfil | REQ-002-002 | Integración PostgreSQL |
| AC-002-005 | Sólo ADMIN aprovisiona, recupera y administra perfiles internos; conserva al menos un ADMIN activo | REQ-002-004 | Unitarias e integración |
| AC-002-006 | Cuenta inactiva y técnico sin identidad PIGAR no acceden aun con token válido | REQ-002-003, REQ-002-006 | Pruebas negativas |
| AC-002-007 | Logs/auditoría no incluyen tokens, emails, teléfono ni headers de autorización | REQ-002-006, NFR-002-004 | Seguridad y revisión de logs |

## Matriz de trazabilidad

| Criterio | Tareas | Pruebas | Evidencia |
|---|---|---|---|
| AC-002-001 | TASK-002-003, TASK-002-006 | TEST-002-001 | `evidence.md` 2026-07-29, OTP email en staging; requiere reconciliación final de tarea y verificación |
| AC-002-002 | TASK-002-002, TASK-002-006 | TEST-002-002, TEST-002-008 | `evidence.md` 2026-07-29, acceso interno con MFA en staging; 2026-08-01, regresión local sin Google y login/callback administrativo bajo `/admin`; requiere verificación final |
| AC-002-003 | TASK-002-004, TASK-002-006 | TEST-002-003 | `evidence.md` 2026-08-01, seguridad 22/22 |
| AC-002-004 | TASK-002-003, TASK-002-006 | TEST-002-004 | `evidence.md` 2026-08-01, integración 11/11 |
| AC-002-005 | TASK-002-005, TASK-002-006 | TEST-002-005 | `evidence.md` 2026-08-01, seguridad 22/22 |
| AC-002-006 | TASK-002-004, TASK-002-006 | TEST-002-006 | `evidence.md` 2026-08-01, seguridad 22/22 |
| AC-002-007 | TASK-002-005, TASK-002-006 | TEST-002-007 | `evidence.md` 2026-08-01, seguridad 22/22 |
