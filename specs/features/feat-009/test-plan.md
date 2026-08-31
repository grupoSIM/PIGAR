# Plan de pruebas — feat-009: Notificaciones transaccionales in-app

## Alcance y riesgos

El plan cubre emisión transaccional, materialización concurrente, plantillas,
API, autorización, interfaz CLIENT, migración y operación. Los riesgos principales
son pérdida/duplicación, fuga entre clientes, cursor inestable, lectura no
monotónica, contenido sensible y degradación del dominio por una proyección.

No hay proveedor externo ni pruebas de email/SMS/Web Push/WhatsApp. Los eventos
de pago se inyectan desde el cambio autoritativo interno ya conciliado, sin usar
payloads de Mercado Pago.

## Pruebas unitarias

- Matriz de seis eventos, versiones, plantillas y rechazo de tipo desconocido.
- Regla de evento sólo para transición efectiva.
- Codificación/validación del cursor, límites y orden total.
- `readAt` monotónico, DTOs cerrados y códigos seguros.

## Pruebas de integración

- PostgreSQL real: transición e outbox confirman o revierten juntos.
- Worker: dos claims, duplicado, lease vencido, crash/reinicio y fallo de relación.
- API: página inicial/siguiente, altas entre páginas, conteo y marcado.
- Constraints, FKs `RESTRICT`, unicidad e índices sobre volumen sintético.

## Pruebas E2E

- CLIENT recibe cada tipo, recorre páginas, marca leído y abre detalle actual.
- Estados vacío/cargando/error, foco, teclado y señal no dependiente del color.
- Error del worker o bandeja no impide consultar/operar solicitudes autorizadas.

## Seguridad y permisos

- Sin token 401; roles no CLIENT 403; aviso ajeno/inexistente 404.
- Listado siempre filtra por perfil; update atómico incluye propietario.
- Cursor manipulado, límite excesivo, UUID inválido y propiedades extra devuelven
  problema seguro sin stack ni eco de entrada.
- Inspección automatizada de logs/auditoría/respuestas para PII, texto de dominio,
  importe, secretos, payload e IDs de proveedor.

## Casos de concurrencia e idempotencia

- Mismo evento reclamado por dos workers: una fila.
- Evento reprocesado luego de ack incierto: una fila y resultado duplicado seguro.
- Dos `PUT read`: mismo primer `readAt`; conteo decrece una sola vez.
- Inserciones posteriores no duplican ni omiten filas al continuar un cursor.

## Fallos de infraestructura

- PostgreSQL no disponible, timeout y lease expirado usan backoff/retry acotado.
- Tipo/versión desconocido o propietario inválido termina en fallo seguro y alerta.
- Worker detenido genera métrica de edad sin bloquear el cambio de dominio.
- No aplica falla de proveedor o conectividad externa.

## Fixtures, mocks y datos personales

Todos los fixtures usan UUID, sujetos Auth0, nombres y solicitudes sintéticos. No
se usan emails, teléfonos, domicilios, tarjetas, URLs firmadas, tokens, payloads
reales ni IDs completos de proveedores. Las capturas de UAT deben mostrar sólo
datos sintéticos y redactar correlation IDs si salen del entorno controlado.

## Comandos esperados

Los comandos pueden ajustarse al nombre final de los archivos sin cambiar el ID
ni el escenario. Ninguna prueba se marca `passed` hasta registrar salida resumida
en `evidence.md`.

El harness `scripts/notifications-postgres.test.mjs` ejecuta con Compose
temporal y PostgreSQL real los subcasos ya automatizados de TEST-009-004,
TEST-009-005, TEST-009-006 y TEST-009-007. Los escenarios que aún falten para
cada ID permanecen explícitamente pendientes hasta que exista su prueba dinámica.

| ID           | Nivel                 | Escenario/AC                                             | Comando esperado                                               | Estado  |
| ------------ | --------------------- | -------------------------------------------------------- | -------------------------------------------------------------- | ------- |
| TEST-009-001 | unit                  | Eventos y plantillas; AC-009-001, AC-009-003             | `pnpm test:unit`                                               | passed |
| TEST-009-002 | unit                  | Cursor, límite y lectura; AC-009-004, AC-009-005         | `pnpm test:unit`                                               | passed |
| TEST-009-003 | integration           | Transición + outbox; AC-009-001                          | `node --test scripts/notifications-postgres.test.mjs`          | passed |
| TEST-009-004 | integration           | Worker concurrente/idempotente; AC-009-002, AC-009-005   | `node --test scripts/notifications-postgres.test.mjs`          | passed |
| TEST-009-005 | contract              | HTTP, paginado, conteo y lectura; AC-009-004, AC-009-005 | `node --test scripts/notifications-postgres.test.mjs`          | passed |
| TEST-009-006 | security              | Roles, propiedad y privacidad; AC-009-003, AC-009-006    | `node --test scripts/notifications-postgres.test.mjs`          | passed |
| TEST-009-007 | resilience            | Retry, lease y reinicio; AC-009-002, AC-009-009          | `pnpm test:worker` y `node --test scripts/notifications-postgres.test.mjs` | passed |
| TEST-009-008 | frontend E2E          | Bandeja accesible/degradación; AC-009-007, AC-009-008    | `PIGAR_E2E_TEST_AUTH=1 pnpm test:e2e:frontends`               | passed |
| TEST-009-009 | E2E                   | Destino reautorizado y estado actual; AC-009-007         | `PIGAR_E2E_TEST_AUTH=1 pnpm test:e2e:frontends`               | passed |
| TEST-009-010 | migration/performance | Constraints, índices y p95; AC-009-004, AC-009-009       | `node --test scripts/notifications-postgres.test.mjs`          | passed |
| TEST-009-011 | quality               | Suite completa, docs y logs; AC-009-009                  | `pnpm lint && pnpm typecheck && pnpm build && pnpm docs:check` | passed |
| TEST-009-012 | staging UAT           | Seis avisos y accesibilidad; AC-009-008                  | manual según checklist aprobado                                | pending |
