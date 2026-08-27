# Evidencia — feat-007: Resolución administrativa, cobro y conformidad

Estado: `implementation`; aprobado por el usuario el 2026-08-27 para alcance
exclusivamente no productivo. Este documento no declara pruebas de
implementación ni Sandbox como exitosas. Sólo puede registrar salidas realmente
observadas.

## Resumen de cambios

Implementación no productiva iniciada tras la aprobación explícita del usuario
del 2026-08-27. Se añadieron modelo/migración aditiva, API, UI, configuración
tipada y pruebas locales. El receptor verifica HMAC y encola conciliación con
backoff; la consulta autoritativa queda diferida. No se configuraron credenciales, no se conectó Mercado
Pago, no se realizó cobro, commit, push, PR ni despliegue.

## Verificaciones automatizadas

| Fecha      | Comando                                                                                                                      | Resultado    | Alcance/notas                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-17 | `pnpm docs:check`                                                                                                            | no ejecutado | Primer intento: el wrapper inició, pero `node` no estaba en `PATH`; no se contabiliza como prueba.                                  |
| 2026-08-17 | `pnpm docs:check` con el Node incluido en el runtime del workspace                                                           | pass         | El script terminó con código 0. El control existente comprueba documentación base de feat-001, no toda la trazabilidad de feat-007. |
| 2026-08-17 | `node node_modules/prettier/bin/prettier.cjs --check specs/features/feat-007/*.md specs/features/feat-007/api-contract.yaml` | pass         | Los siete artefactos tienen formato válido; Prettier parseó además el OpenAPI YAML.                                                 |
| 2026-08-17 | `node -e <control de IDs feat-007>`                                                                                          | pass         | `Traceability OK REQ=10 NFR=8 AC=16 TASK=11 TEST=15`; toda referencia explícita resuelve a un ID definido.                          |
| 2026-08-17 | `git diff --check`                                                                                                           | pass         | Sin errores de whitespace; Git sólo emitió avisos preexistentes de conversión LF/CRLF en archivos no tocados por esta sesión.       |
| 2026-08-27 | `pnpm docs:check`                                                                                                            | not run      | El runtime no tenía `node` en `PATH`; terminó con código 1 y no se contabiliza como control superado.                               |
| 2026-08-27 | `node` del runtime del workspace + `scripts/docs-check.mjs`                                                                  | pass         | Terminó con código 0; validó las referencias de documentación permitidas.                                                           |
| 2026-08-27 | `git diff --check`                                                                                                           | pass         | Sin errores de whitespace; sólo avisos LF/CRLF preexistentes en archivos ajenos a esta validación.                                  |
| 2026-08-27 | `pnpm test:unit -- --grep feat-007`                                                                                          | pass         | 12 pruebas/suites del conjunto filtrado terminaron sin fallos; incluye las tres pruebas locales de feat-007.                        |
| 2026-08-27 | `pnpm test:integration -- --grep feat-007`                                                                                   | pass parcial | 12 pruebas/suites locales sin fallos; no sustituye integración PostgreSQL ni Mercado Pago no productivo.                            |
| 2026-08-27 | `pnpm test:security -- --grep feat-007`                                                                                      | pass parcial | 13 pruebas/suites locales sin fallos; cubre validación de contrato, no la entrega real de Webhook.                                  |
| 2026-08-27 | API, CLIENT y ADMIN `typecheck`/`build`; `pnpm lint`; `git diff --check`                                                     | pass         | Compilación, lint y control de whitespace superaron; builds web emitieron avisos de Auth0 sin secretos configurados.                |
| 2026-08-27 | Docker PostgreSQL local (`docker version`)                                                                                   | bloqueado    | El daemon Docker no está disponible en este ambiente; migración real y E2E PostgreSQL siguen pendientes.                            |
| 2026-08-27 | API `typecheck`/`build`; `pnpm test:unit -- --grep feat-007`                                                                 | pass         | Build exitoso y 15 pruebas locales sin fallos; incluye HMAC, anti-replay, preferencia opaca y monotonicidad.                        |
| 2026-08-27 | `pnpm test:integration -- --grep feat-007`                                                                                   | pass parcial | 15 pruebas locales sin fallos; no conecta PostgreSQL ni Mercado Pago.                                                               |
| 2026-08-27 | `pnpm test:security -- --grep feat-007`                                                                                      | pass parcial | 16 pruebas locales sin fallos; no sustituye entrega ni firma de un Webhook real.                                                    |
| 2026-08-27 | `pnpm lint`; `pnpm docs:check`; `git diff --check`                                                                           | pass         | Los tres controles terminaron con código 0; `git` emitió sólo avisos LF/CRLF preexistentes.                                         |
| 2026-08-27 | `pnpm --filter @pigar/api lint`                                                                                              | no aplicable | El paquete API no declara script `lint`; el lint raíz fue el control ejecutado.                                                     |
| 2026-08-27 | `prettier --check` sobre código/artefacto modificados de feat-007; `git diff --check`                                        | pass         | Formato válido para los archivos soportados y sin errores de whitespace; Prisma SQL no tiene parser configurado en Prettier.        |
| 2026-08-27 | PostgreSQL local no productivo: `prisma:migrate:deploy`                                                                      | pass         | Se aplicaron las migraciones de feat-007 y el forward-fix de unicidad de intento activo, sin exponer URL ni credenciales.           |
| 2026-08-27 | `node --test scripts/billing-postgres.test.mjs` con `DATABASE_URL` local validada                                            | pass         | 1/1 real: transacción, idempotencia, índice activo, conciliación, evento tardío, conformidad y trigger append-only.                 |

El intento de aplicar Prettier a `features.yaml` y `progress/current.yaml`
detectó errores YAML preexistentes en texto histórico no relacionado (por
ejemplo, notas planas con `:` y backticks). No se reformatearon ni corrigieron
esas secciones para preservar el alcance y los cambios existentes del usuario;
las ediciones de feat-007 se limitaron a estado, bloqueo y nota.

## Criterios de aceptación

| Criterio   | Evidencia esperada   | Resultado                                                                    |
| ---------- | -------------------- | ---------------------------------------------------------------------------- |
| AC-007-001 | TEST-007-001/005     | pending                                                                      |
| AC-007-002 | TEST-007-002/005     | pending                                                                      |
| AC-007-003 | TEST-007-001/009     | pending                                                                      |
| AC-007-004 | TEST-007-002/006     | pending                                                                      |
| AC-007-005 | TEST-007-003/012     | pending                                                                      |
| AC-007-006 | TEST-007-004/007     | pending                                                                      |
| AC-007-007 | TEST-007-006/008     | pending                                                                      |
| AC-007-008 | TEST-007-005/008     | pending                                                                      |
| AC-007-009 | TEST-007-008/010     | pending                                                                      |
| AC-007-010 | TEST-007-009/012     | pending                                                                      |
| AC-007-011 | TEST-007-001/006/012 | pending                                                                      |
| AC-007-012 | TEST-007-003/012     | pending                                                                      |
| AC-007-013 | TEST-007-009/011     | pending                                                                      |
| AC-007-014 | TEST-007-005/011     | pending                                                                      |
| AC-007-015 | TEST-007-012/013     | pending                                                                      |
| AC-007-016 | TEST-007-014         | blocked — aplicación/cuentas no productivas y autorización humana requeridas |

## Verificación manual justificada

### Ejecución parcial en staging no productivo — 2026-08-27

La aplicación, las cuentas de prueba y el endpoint HTTPS fueron configurados por
el operador sin exponer credenciales. El inicio de Checkout Pro se intentó una
vez contra staging; Mercado Pago no registró una preferencia asociada. Por lo
tanto no hubo pago ni Webhook `payment` que validar, y TEST-007-014 continúa
pendiente.

| Fecha      | Ambiente             | Identificador PIGAR | Escenario                                              | HTTP/estado normalizado         | Resultado | Observación técnica                                                               |
| ---------- | -------------------- | ------------------- | ------------------------------------------------------ | ------------------------------- | --------- | --------------------------------------------------------------------------------- |
| 2026-08-27 | staging no productivo | req-…               | Creación de preferencia Checkout Pro                   | 503 / PREFERENCE_CREATION_UNCERTAIN | fail      | No se creó preferencia en Mercado Pago; no se reintentó para evitar duplicados. |

Controles documentales y de implementación ejecutados localmente el
2026-08-27:

| Comando | Salida resumida |
| ------- | --------------- |
| `pnpm --filter api build` | correcto; Prisma Client generado y TypeScript compilado. |
| `pnpm test:unit -- --grep feat-007` | correcto; 17 pruebas, 0 fallos. Incluye rechazo determinístico sin bloquear un nuevo intento. |
| `pnpm lint` | correcto; ESLint sin errores. |

TEST-007-014 permanece pendiente. Aunque el operador habilitó la aplicación,
cuentas de prueba, endpoint HTTPS y configuración segura, la primera creación
de preferencia falló antes de crear un recurso remoto. La acción humana y los
datos que no deben registrarse están definidos en `test-plan.md`. Los
resultados previos de la PoC con mock no sustituyen esta validación y no se
inventan resultados de Sandbox.

### Evaluación de disponibilidad — 2026-08-27

Ambiente evaluado: checkout local PIGAR, sin configuración ni credenciales de
Mercado Pago. Se inspeccionó el harness disponible antes de intentar cualquier
interacción externa. Sólo existe `PaymentPocService`, una PoC interna sin
endpoint HTTP y con firma HMAC sintética; no representa el esquema oficial ni
puede recibir un Webhook de Mercado Pago. No se usaron ni solicitaron secretos,
cuentas, cobros ni datos personales.

| Fecha      | Ambiente             | Identificador PIGAR | Escenario                                                                        | HTTP/estado normalizado | Resultado | Observación técnica                                                                                    |
| ---------- | -------------------- | ------------------- | -------------------------------------------------------------------------------- | ----------------------- | --------- | ------------------------------------------------------------------------------------------------------ |
| 2026-08-27 | local, no productivo | N/A                 | Preferencia Checkout Pro mínima                                                  | NOT_EXECUTED            | blocked   | Adaptador implementado, pero no hay Access Token no productivo configurado en un mecanismo seguro.     |
| 2026-08-27 | local, no productivo | N/A                 | Retornos `success`/`pending`/`failure` no autoritativos                          | NOT_EXECUTED            | blocked   | La UI sólo informa verificación; falta entorno HTTPS para observar el retorno oficial.                 |
| 2026-08-27 | local, no productivo | N/A                 | Webhook `payment` firmado (`x-signature`, `ts`, `v1`, `x-request-id`, `data.id`) | NOT_EXECUTED            | blocked   | Receptor implementado; no existe URL HTTPS accesible ni secreto configurado de forma segura.           |
| 2026-08-27 | local, no productivo | N/A                 | Consulta autoritativa del pago                                                   | NOT_EXECUTED            | blocked   | Adaptador/cola implementados; falta credencial de prueba y PostgreSQL para ejecutarlos.                |
| 2026-08-27 | local, no productivo | N/A                 | Pago de prueba aprobado                                                          | NOT_EXECUTED            | blocked   | Requiere aplicación y cuenta de comprador de prueba habilitadas por una persona autorizada.            |
| 2026-08-27 | local, no productivo | N/A                 | Pago de prueba pendiente                                                         | NOT_EXECUTED            | blocked   | Requiere aplicación y cuenta de comprador de prueba habilitadas por una persona autorizada.            |
| 2026-08-27 | local, no productivo | N/A                 | Pago de prueba rechazado                                                         | NOT_EXECUTED            | blocked   | Requiere aplicación y cuenta de comprador de prueba habilitadas por una persona autorizada.            |
| 2026-08-27 | local, no productivo | N/A                 | Webhook duplicado y fuera de orden                                               | NOT_EXECUTED            | blocked   | Sin receptor HTTPS ni eventos oficiales no es posible observar duplicación u orden real.               |
| 2026-08-27 | local, no productivo | N/A                 | Pérdida controlada y conciliación por referencia externa                         | NOT_EXECUTED            | blocked   | Conciliador/búsqueda implementados, pendientes de PostgreSQL, entorno HTTPS y proveedor no productivo. |

La documentación oficial vigente fue consultada el 2026-08-27: la preferencia
admite ítem con `currency_id: ARS`, `external_reference` y URLs de retorno; los
retornos no sustituyen el flujo de notificación/consulta. Para `payment`, la
validación oficial usa `x-signature` con componentes `ts` y `v1`,
`x-request-id` y `data.id`; después de responder 200/201 corresponde consultar
el pago. La guía de compras de prueba publica los valores de prueba para
aprobado, pendiente y rechazo, que sólo debe ingresar el operador en la UI
oficial, nunca en esta evidencia.

Acción humana necesaria antes de reanudar: tras desplegar el diagnóstico seguro
correspondiente, una persona autorizada debe revisar personalmente que
`MERCADO_PAGO_ACCESS_TOKEN` contiene sólo el Access Token de **prueba** de la
aplicación (no la Public Key, ni el nombre de variable, ni comillas), y repetir
un único inicio de Checkout desde staging. No compartir credenciales, cookies,
códigos, claves, URLs firmadas ni datos de cuenta en el chat o repositorio.
Según el resultado, el operador puede realizar en el navegador las compras de
prueba y la validación registrará sólo los resultados sanitizados permitidos.

Los resultados de `pnpm test:payment-poc` siguen siendo exclusivamente de mock
contractual y no se presentan como evidencia de Mercado Pago.

## Seguridad, datos y migraciones

Verificación real pendiente: migración PostgreSQL, permisos negativos/E2E,
entrega Webhook, retención legal y controles de producción. Retención/borrado,
contracargos, reembolsos, cifrado/backup/hardening continúan bloqueando
producción.

## Publicación

- Aprobación funcional: pendiente.
- Commit: no autorizado/no realizado.
- Rama: no creada para esta feature.
- PR/despliegue: no autorizado/no realizado.
