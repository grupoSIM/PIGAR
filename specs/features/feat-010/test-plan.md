# Plan de pruebas — feat-010: Calificaciones e incidencias de postventa

Estado: `publication_review`. Los escenarios TEST-010 se ejecutaron contra
fixtures sintéticos y sus comandos/salidas están registrados en `evidence.md`.
La novena revisión independiente PASS está registrada en `review-9.md`.

## Alcance y riesgos

El plan debe demostrar permisos por actor/propiedad, precondición `CERRADA`,
inmutabilidad, idempotencia y carreras reales; ausencia de mutación sobre orden,
dinero/conformidad/outbox; sanitización/XSS/no logging de `OTRO`; incidencia
estructurada append-only; rate limit, accesibilidad y E2E.

Los principales riesgos son fuga cross-client, texto sensible o ejecutable,
duplicación por reintentos, interpretación de garantía y acoplamiento accidental
a órdenes, pagos o notificaciones.

## Pruebas unitarias

- Matrices completas de motivo/tipo/estado/acción v1 y rechazo de desconocidos.
- Estrellas 1..5 y condicional `OTRO`; NFKC, trim, puntos de código y detección de
  HTML, URL, controles, URI/adjunto sin sustitución silenciosa.
- Máquina estricta de incidencia y versión esperada.
- Canonicalización/fingerprint idempotente, mismo/distinto payload y códigos de
  error seguros sin eco.
- Serialización por actor: acuse/listado sin `otherMessage`, detalle autorizado
  con texto escapable.

## Pruebas de contrato/API

- Validar OpenAPI y cada endpoint con `application/json`, DTO cerrado, tamaños,
  enums, 400/401/403/404/409/413/415/429 y `Retry-After`.
- Verificar que no existen endpoints de edición/borrado/reapertura ni campos de
  garantía, dinero, comentario de incidencia, adjunto o notificación.
- Propietario, CLIENT cruzado, ADMIN, DISPATCHER y rol no autorizado en todas las
  rutas; comparar forma/latencia razonable de 404 ajeno e inexistente.

## Pruebas de integración con PostgreSQL

- Aplicar migración futura sobre base con feat-005/007/009 y validar FKs
  `RESTRICT`, checks, triggers, índices, planes y rollback de aplicación.
- Ejecutar 20 comandos simultáneos para rating con clave igual/distinta: una
  fila, mismo resultado de retry y conflictos deterministas.
- Ejecutar 20 aperturas de incidencia: una activa; cerrar y comprobar que una
  nueva fila puede abrirse sin reactivar la anterior.
- Competir `START_TRIAGE`/`CLOSE` con versión vigente/obsoleta y crash/ack incierto;
  validar secuencia e historial append-only.
- Intentar `UPDATE`/`DELETE` directo de rating/historial y borrado de orden con
  dependencias; la base lo rechaza sin `CASCADE`.

## Pruebas de no mutación

Antes y después de cada éxito, error, retry y carrera se toman snapshots
deterministas de:

- `WorkOrder` (estado, versión y timestamps) y `WorkOrderTransition`;
- `Charge`, `PaymentAttempt`, recibos/jobs de conciliación;
- `ConformityEvidence`; y
- `OutboxEvent`/notificaciones.

Sólo tablas de postventa, reserva idempotente y auditoría mínima pueden cambiar.
Se afirma explícitamente que no aparece nueva orden, visita, cargo, evento o
aviso.

## Seguridad, privacidad y XSS

- Sin token 401; rol incorrecto 403; CLIENT ajeno 404; orden propia no cerrada 409. Ninguna respuesta revela el recurso cruzado.
- Requests con HTML, URL, esquemas URI, Unicode equivalente, controles,
  propiedades extra, archivo, base64/data URI, multipart, cuerpo grande y doble
  submit se rechazan según contrato.
- Un sentinel sintético exclusivo para `otherMessage` se busca en logs
  estructurados, errores, auditoría, tracing, métricas, outbox, notificaciones,
  acuses y listados: debe haber cero apariciones. La evidencia no publica el
  sentinel.
- La vista autorizada se prueba con DOM real/CSP: el valor aparece como texto y
  no crea nodos/atributos, navegación, request de red ni ejecución.
- Stars/reason y datos de orden/pago/contacto tampoco aparecen en logs fuera de
  los códigos allowlist previstos.

## Rate limit y rendimiento

- Superar 10 escrituras/min por perfil o 30/min por IP, 120 lecturas/min por
  perfil y 60 transiciones/min por perfil produce 429 + `Retry-After`, sin fila,
  historial ni reserva incompleta adicional.
- Con volumen sintético representativo, medir p50/p95 de creación, lista, detalle
  y transición; p95 < 500 ms local sin llamada externa.
- Validar que planes usan índices por propietario/orden/status y no recorren
  perfiles ajenos; cursor mantiene orden estable con altas concurrentes.

## Pruebas E2E y accesibilidad

- CLIENT: orden no cerrada sin acción; orden cerrada permite rating una vez,
  `OTRO` condicional, consulta sólo lectura, incidencia estructurada e historial.
- ADMIN/DISPATCHER: vista de soporte, filtros, `START_TRIAGE`, `CLOSE` y ausencia
  de controles prohibidos. CLIENT ve los estados al refrescar el portal.
- Cross-client intenta URL directa y recibe 404; visitante 401; roles erróneos 403.
- Teclado, foco visible, nombre accesible de estrellas/grupos, contador, errores,
  estado no dependiente del color y regiones de carga/vacío/error.
- Degradar endpoint de postventa no impide abrir el detalle autoritativo de orden.

## Casos de concurrencia e idempotencia

- Misma clave/mismo payload antes y después de confirmar.
- Misma clave/payload distinto, incluida diferencia sólo previa a NFKC/trim.
- Claves distintas para la misma rating; claves iguales/distintas para una
  incidencia activa.
- Respuesta perdida y retry; transacción abortada antes/después de reservar.
- Dos operadores con misma versión; `CLOSE` antes de triage; reapertura y
  transición sobre cerrado.

## Fallos y degradación

- PostgreSQL timeout/desconexión/deadlock revierte la unidad completa y permite
  retry idempotente seguro.
- Cursor corrupto, límite excedido, UUID inválido y enum desconocido producen
  problema seguro sin stack o eco de entrada.
- No se simulan proveedores: no existe integración externa en feat-010.
- El Webhook 401 de Mercado Pago no se toca ni se usa como condición de estas
  pruebas; continúa como bloqueo separado de producción.

## Fixtures, mocks y datos personales

Usar sólo UUIDs, sujetos/roles, órdenes, pagos y textos sintéticos. Ningún nombre,
email, domicilio, teléfono, tarjeta, ID de proveedor, secreto, cookie, token,
multimedia o dato real. Capturas y salidas omiten cuerpos, valores de `OTRO`, IDs
completos y correlation IDs fuera del entorno controlado.

## Comandos esperados

Los nombres focalizados pueden ajustarse al implementar sin cambiar IDs ni
escenarios. Ningún estado pasa a `passed` hasta registrar comando y salida
resumida en `evidence.md`.

| ID           | Nivel                   | Escenario/AC                                                         | Comando previsto                                                                                                    | Estado |
| ------------ | ----------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------ |
| TEST-010-001 | unit                    | Allowlists, estrellas y estados; AC-010-001, 005, 006                | Docker QA: `pnpm test:unit`                                                                                         | passed |
| TEST-010-002 | unit/security           | NFKC, trim, HTML/URL/control/adjunto; AC-010-002                     | Docker QA: `pnpm test:unit`                                                                                         | passed |
| TEST-010-003 | contract/HTTP           | OpenAPI, errores, DTOs y actores; AC-010-001, 002, 004 a 007         | Docker: `node --test apps/api/src/aftercare/aftercare-postgres.test.mjs`                                            | passed |
| TEST-010-004 | PostgreSQL/concurrency  | Rating única/idempotente/append-only; AC-010-001, 003                | Docker: `node --test --test-name-pattern="carreras de servicio" apps/api/src/aftercare/aftercare-postgres.test.mjs` | passed |
| TEST-010-005 | PostgreSQL/concurrency  | Incidencia activa, historial y no mutación; AC-010-005, 006, 008     | Docker: `node --test apps/api/src/aftercare/aftercare-postgres.test.mjs`                                            | passed |
| TEST-010-006 | security                | 401/403/404, propiedad y proyecciones; AC-010-004, 007               | Node 22: `node scripts/run-test-suite.mjs security`                                                                 | passed |
| TEST-010-007 | integration/security    | Snapshots orden/pago/conformidad y cero outbox; AC-010-001, 008, 013 | Docker: `node --test apps/api/src/aftercare/aftercare-postgres.test.mjs`                                            | passed |
| TEST-010-008 | security/privacy        | No logging, XSS y superficies de salida; AC-010-002, 009, 013        | Docker + Node 22: PostgreSQL test y `node scripts/run-test-suite.mjs security`                                      | passed |
| TEST-010-009 | integration/performance | Rate limit, índices, cursor y p95; AC-010-007, 010                   | Docker: `node --test apps/api/src/aftercare/aftercare-postgres.test.mjs`                                            | passed |
| TEST-010-010 | accessibility           | Semántica, teclado, foco y degradación; AC-010-012                   | Docker Playwright: `pnpm test:e2e:frontends`                                                                        | passed |
| TEST-010-011 | migration               | Forward-only, FKs, triggers y retención; AC-010-003, 006, 011        | Node 22: `node scripts/aftercare-postgres.test.mjs`                                                                 | passed |
| TEST-010-012 | frontend E2E            | Flujo CLIENT/ADMIN y XSS seguro; AC-010-002, 012                     | Docker Playwright: `pnpm test:e2e:frontends`                                                                        | passed |
| TEST-010-013 | quality/scope           | Calidad completa y ausencia de garantía/canales; AC-010-013          | Docker QA: formato/lint/typecheck/build; docs y `git diff --check`                                                  | passed |
