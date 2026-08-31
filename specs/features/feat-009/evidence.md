# Evidencia — feat-009: Notificaciones transaccionales in-app

## Estado y alcance

Implementación integrada en `staging` mediante los commits `9aa0feb`,
`015f3b9` y `e91707f`. Incluye migración aditiva, outbox transaccional para los
seis tipos aprobados, un único consumidor worker con lease, bandeja CLIENT y
observabilidad operativa. GitHub Actions publicó las imágenes inmutables del
SHA `e91707f`; Hostinger actualizó el proyecto `pigar-staging` con esa revisión.
No hay proveedor/canal externo y no se desplegó producción.

## Verificaciones automatizadas y locales

| Fecha | Comando | Resultado | Salida resumida |
| --- | --- | --- | --- |
| 2026-08-31 | `pnpm typecheck` | passed | Turbo: 14/14 tareas; API, worker y ambos portales tipados. |
| 2026-08-31 | `pnpm build` | passed | Turbo: 10/10 paquetes; Prisma regeneró y ambos portales compilaron. |
| 2026-08-31 | `pnpm lint && pnpm docs:check && pnpm test:ci-contract` | passed | ESLint y documentación sin errores; contrato CI 3/3. |
| 2026-08-31 | `node --test scripts/notifications.test.mjs scripts/orders.test.mjs` | passed | 8/8: allowlist, migración, propiedad, cursor, lease, retry, UI y productores. |
| 2026-08-31 | `pnpm test:unit` | passed | 44/44; incluye notificaciones, órdenes, pagos y saneamiento de logs. |
| 2026-08-31 | `pnpm test:worker` | passed | 1/1; build del worker y ciclo ocioso con logs estructurados sanitizados. |
| 2026-08-31 | `node --test scripts/notifications-postgres.test.mjs` | passed | Compose temporal aplicó migración y ejecutó: productores de los seis eventos, dos `pollOnce` concurrentes (una sola fila), recuperación por lease vencido, receptor inválido `FAILED`, FKs/índices reales, p95 local de listado menor a 250 ms, pagos rechazados concurrentes (un único outbox) y HTTP real 401/403/404/400/200 con actores sintéticos. |
| 2026-08-31 | Compose temporal (`postgres`, `migrate`, `worker`) + fixtures UUID sintéticos | passed | Migración aplicada; un `work_order.en_route` quedó `PROCESSED` y creó exactamente una notificación no leída. Entorno y volúmenes temporales eliminados. |
| 2026-08-31 | `PIGAR_E2E_TEST_AUTH=1 pnpm test:e2e:frontends` | passed | Customer 6/6 y admin 4/4; incluye bandeja, paginación, marcado y reautorización previa a navegar. |
| 2026-08-31 | GitHub Actions `quality` 33432458042 | passed | Formato, lint, tipos, unitarias, integración, seguridad, E2E, contrato CI y documentación superaron en 4m13s para `e91707f`. |
| 2026-08-31 | GitHub Actions `publish-staging-images` 33432458042 | passed | Imágenes inmutables de aplicación y Nginx publicadas tras la calidad exitosa. |
| 2026-08-31 | UAT manual en `pigar-staging` con cuentas y referencias sintéticas | passed | HTTPS y healthchecks 200; bandeja CLIENT cargó estado vacío y accesible, después seis tipos de aviso (asignación/reasignación, en camino, cancelación, pago aprobado, pago rechazado y cierre). Un aviso pasó de no leído a leído y navegó sólo tras reautorizar la solicitud. No se registraron cuentas, IDs ni contenido de los avisos. |

La ejecución de integración y seguridad usa Docker para regresiones ajenas a
feat-009. En sandbox falló por permisos de la tubería Docker; la repetición con
permiso de entorno arrancó correctamente y no se usa como evidencia exclusiva
de esta feature. Las verificaciones listadas arriba son las que sustentan los
TEST-009 locales que figuran como `passed`; los escenarios dinámicos pendientes
no se dan por ejecutados.

## Criterios de aceptación

| Criterio | Evidencia | Resultado |
| --- | --- | --- |
| AC-009-001 | TEST-009-001, TEST-009-003 | passed local |
| AC-009-002 | TEST-009-004, TEST-009-007 | passed local |
| AC-009-003 | TEST-009-001, TEST-009-006, TEST-009-012 | passed local/staging |
| AC-009-004 | TEST-009-002, TEST-009-005, TEST-009-010, TEST-009-012 | passed local/staging |
| AC-009-005 | TEST-009-002, TEST-009-004, TEST-009-005, TEST-009-012 | passed local/staging |
| AC-009-006 | TEST-009-006 | passed local |
| AC-009-007 | TEST-009-008, TEST-009-009, TEST-009-012 | passed local/staging |
| AC-009-008 | TEST-009-008, TEST-009-012 | passed local/staging |
| AC-009-009 | TEST-009-007, TEST-009-010, TEST-009-011 | passed local |

## Seguridad, datos y operación

- El worker es el único consumidor de notificaciones. Confirma el claim antes
  de materializar y condiciona `PROCESSED`, `FAILED` y `PENDING` al mismo
  `leaseExpiresAt`; un lease vencido no puede sobrescribir el resultado de un
  reclamante posterior.
- Los eventos/versiones inválidos y destinatarios no CLIENT terminan en
  `FAILED`; errores temporales usan backoff exponencial y máximo cinco intentos.
- La API exige CLIENT, filtra por propietario, limita cursor a 512 bytes,
  página a 20/50, aplica 429 y conserva `readAt` con `COALESCE`.
- Las métricas estructuradas cubren lecturas, marcados, creación/duplicado,
  fallos por código y edad de backlog; el runbook define alerta a cinco minutos.
- No se registraron payloads, contenido sensible, datos de pago, contacto,
  domicilio, secretos ni URLs firmadas. Retención/borrado productivo requiere
  validación legal separada.

## Límites posteriores al cierre

- Email, Web Push y WhatsApp requieren una especificación, decisión de proveedor
  y aprobación separadas conforme ADR-007.
- Producción continúa bloqueada por sus condiciones de arquitectura y por la
  excepción del Webhook automático de Mercado Pago de feat-007.
