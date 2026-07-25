# Plan de pruebas — feat-012

## Pruebas previas al acceso remoto

- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build` y suites configuradas deben pasar sobre la revisión a desplegar.
- `docker compose -f infra/compose/docker-compose.yml config --quiet` debe validar la topología.
- El runbook no debe contener secretos ni comandos destructivos no justificados.

## Smoke tests de staging

| ID | Escenario | Evidencia |
|---|---|---|
| TEST-012-001 | Servicios Compose sanos y Nginx como única entrada | Estado de Compose y puertos sanitizados |
| TEST-012-002 | HTTP redirige a HTTPS y certificado válido para subdominio de staging | Cabeceras HTTP/TLS sin exponer IP o secretos innecesarios |
| TEST-012-003 | Shell cliente, shell administración y readiness responden vía Nginx | Códigos HTTP y correlation ID sanitizados |
| TEST-012-004 | API, worker, PostgreSQL y multimedia no responden directamente desde Internet | Pruebas negativas de puertos/rutas |
| TEST-012-005 | Reinicio controlado recupera readiness y conserva marcadores sintéticos | Resultado de reinicio y healthcheck |
| TEST-012-006 | Rollback restaura la revisión previa de staging | Revisión origen/destino y smoke test posterior |

## Datos y secretos

- Los comandos y logs se sanitizan antes de registrar evidencia.
- No se suben archivos de usuarios, direcciones, tarjetas ni credenciales reales.
- Cualquier token o llave se transmite únicamente por un canal privado elegido por el usuario y nunca se pega en esta conversación ni en el repositorio.
