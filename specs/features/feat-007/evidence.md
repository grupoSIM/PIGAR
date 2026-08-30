# Evidencia — feat-007: Resolución administrativa, cobro y conformidad

Estado: `verification`; alcance de staging aceptado por el usuario el
2026-08-30 con AC-007-016 como excepción explícita que bloquea producción. Este
documento sólo declara exitosas ejecuciones realmente observadas.

## Resumen de cambios

Implementación no productiva iniciada tras la aprobación explícita del usuario
del 2026-08-27. Se añadieron modelo/migración aditiva, API, UI, configuración
tipada y pruebas locales. El receptor verifica HMAC y encola conciliación con
backoff. El receptor fue verificado localmente a través de Nginx, NestJS y
PostgreSQL con valores sintéticos aislados; esto no constituye evidencia de
Mercado Pago. El incremento diagnóstico fue publicado y desplegado por el
operador en staging el 2026-08-30; no hubo despliegue productivo.

## Verificaciones automatizadas

| Fecha      | Comando                                                                                                                                                            | Resultado              | Alcance/notas                                                                                                                                                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-17 | `pnpm docs:check`                                                                                                                                                  | no ejecutado           | Primer intento: el wrapper inició, pero `node` no estaba en `PATH`; no se contabiliza como prueba.                                                                                                                                                                                 |
| 2026-08-17 | `pnpm docs:check` con el Node incluido en el runtime del workspace                                                                                                 | pass                   | El script terminó con código 0. El control existente comprueba documentación base de feat-001, no toda la trazabilidad de feat-007.                                                                                                                                                |
| 2026-08-17 | `node node_modules/prettier/bin/prettier.cjs --check specs/features/feat-007/*.md specs/features/feat-007/api-contract.yaml`                                       | pass                   | Los siete artefactos tienen formato válido; Prettier parseó además el OpenAPI YAML.                                                                                                                                                                                                |
| 2026-08-17 | `node -e <control de IDs feat-007>`                                                                                                                                | pass                   | `Traceability OK REQ=10 NFR=8 AC=16 TASK=11 TEST=15`; toda referencia explícita resuelve a un ID definido.                                                                                                                                                                         |
| 2026-08-17 | `git diff --check`                                                                                                                                                 | pass                   | Sin errores de whitespace; Git sólo emitió avisos preexistentes de conversión LF/CRLF en archivos no tocados por esta sesión.                                                                                                                                                      |
| 2026-08-27 | `pnpm docs:check`                                                                                                                                                  | not run                | El runtime no tenía `node` en `PATH`; terminó con código 1 y no se contabiliza como control superado.                                                                                                                                                                              |
| 2026-08-27 | `node` del runtime del workspace + `scripts/docs-check.mjs`                                                                                                        | pass                   | Terminó con código 0; validó las referencias de documentación permitidas.                                                                                                                                                                                                          |
| 2026-08-27 | `git diff --check`                                                                                                                                                 | pass                   | Sin errores de whitespace; sólo avisos LF/CRLF preexistentes en archivos ajenos a esta validación.                                                                                                                                                                                 |
| 2026-08-27 | `pnpm test:unit -- --grep feat-007`                                                                                                                                | pass                   | 12 pruebas/suites del conjunto filtrado terminaron sin fallos; incluye las tres pruebas locales de feat-007.                                                                                                                                                                       |
| 2026-08-27 | `pnpm test:integration -- --grep feat-007`                                                                                                                         | pass parcial           | 12 pruebas/suites locales sin fallos; no sustituye integración PostgreSQL ni Mercado Pago no productivo.                                                                                                                                                                           |
| 2026-08-27 | `pnpm test:security -- --grep feat-007`                                                                                                                            | pass parcial           | 13 pruebas/suites locales sin fallos; cubre validación de contrato, no la entrega real de Webhook.                                                                                                                                                                                 |
| 2026-08-27 | API, CLIENT y ADMIN `typecheck`/`build`; `pnpm lint`; `git diff --check`                                                                                           | pass                   | Compilación, lint y control de whitespace superaron; builds web emitieron avisos de Auth0 sin secretos configurados.                                                                                                                                                               |
| 2026-08-27 | Docker PostgreSQL local (`docker version`)                                                                                                                         | bloqueado              | El daemon Docker no está disponible en este ambiente; migración real y E2E PostgreSQL siguen pendientes.                                                                                                                                                                           |
| 2026-08-27 | API `typecheck`/`build`; `pnpm test:unit -- --grep feat-007`                                                                                                       | pass                   | Build exitoso y 15 pruebas locales sin fallos; incluye HMAC, anti-replay, preferencia opaca y monotonicidad.                                                                                                                                                                       |
| 2026-08-27 | `pnpm test:integration -- --grep feat-007`                                                                                                                         | pass parcial           | 15 pruebas locales sin fallos; no conecta PostgreSQL ni Mercado Pago.                                                                                                                                                                                                              |
| 2026-08-27 | `pnpm test:security -- --grep feat-007`                                                                                                                            | pass parcial           | 16 pruebas locales sin fallos; no sustituye entrega ni firma de un Webhook real.                                                                                                                                                                                                   |
| 2026-08-27 | `pnpm lint`; `pnpm docs:check`; `git diff --check`                                                                                                                 | pass                   | Los tres controles terminaron con código 0; `git` emitió sólo avisos LF/CRLF preexistentes.                                                                                                                                                                                        |
| 2026-08-27 | `pnpm --filter @pigar/api lint`                                                                                                                                    | no aplicable           | El paquete API no declara script `lint`; el lint raíz fue el control ejecutado.                                                                                                                                                                                                    |
| 2026-08-27 | `prettier --check` sobre código/artefacto modificados de feat-007; `git diff --check`                                                                              | pass                   | Formato válido para los archivos soportados y sin errores de whitespace; Prisma SQL no tiene parser configurado en Prettier.                                                                                                                                                       |
| 2026-08-27 | PostgreSQL local no productivo: `prisma:migrate:deploy`                                                                                                            | pass                   | Se aplicaron las migraciones de feat-007 y el forward-fix de unicidad de intento activo, sin exponer URL ni credenciales.                                                                                                                                                          |
| 2026-08-27 | `node --test scripts/billing-postgres.test.mjs` con `DATABASE_URL` local validada                                                                                  | pass                   | 1/1 real: transacción, idempotencia, índice activo, conciliación, evento tardío, conformidad y trigger append-only.                                                                                                                                                                |
| 2026-08-29 | `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json` + `node --test scripts/billing.test.mjs scripts/payment-webhook-http.test.mjs`                    | pass                   | TypeScript compiló y 13/13 pruebas pasaron: clave única, HMAC oficial, esquema mínimo, 400/401, diagnósticos sombra, duplicado y HTTP Nest sin guard global.                                                                                                                       |
| 2026-08-29 | `node scripts/run-test-suite.mjs security --grep mercado-pago-webhook`                                                                                             | pass                   | 13/13 sin fallos; incluye cuerpo mínimo, casing exacto, componentes mutados y variantes sombra que nunca autorizan.                                                                                                                                                                |
| 2026-08-29 | `node scripts/run-test-suite.mjs security --grep payment-webhook-http`                                                                                             | pass                   | 12/12 sin fallos; incluye controller y proceso Nest real, persistencia mock sólo tras firma válida, 400/401, query con punto, headers y ausencia de redirect/guard.                                                                                                                |
| 2026-08-29 | `node scripts/run-test-suite.mjs unit --grep feat-007`                                                                                                             | pass                   | 19/19 sin fallos; mantiene idempotencia, creación ambigua, estados monotónicos y conciliación junto con la regresión Webhook.                                                                                                                                                      |
| 2026-08-29 | `node --test scripts/api-contract.test.mjs scripts/config.test.mjs`                                                                                                | pass                   | 3/3 sin fallos; contrato HTTP y configuración tipada sin filtración.                                                                                                                                                                                                               |
| 2026-08-29 | Prettier y ESLint focalizados sobre controller, pruebas y runbook; `node node_modules/eslint/bin/eslint.js .`                                                      | pass                   | Archivos del incremento con formato válido y lint raíz sin errores.                                                                                                                                                                                                                |
| 2026-08-29 | `node scripts/docs-check.mjs`; `git diff --check`                                                                                                                  | pass                   | Documentación válida y sin errores de whitespace; sólo avisos LF/CRLF del worktree existente.                                                                                                                                                                                      |
| 2026-08-29 | `node node_modules/prettier/bin/prettier.cjs --check` con el alcance completo del script raíz                                                                      | fail preexistente      | Informó 11 archivos ajenos a este incremento ya desformateados; no se reescribieron para preservar cambios del usuario. Los archivos tocados sí superan el check focalizado.                                                                                                       |
| 2026-08-29 | `node node_modules/turbo/bin/turbo typecheck`                                                                                                                      | bloqueado por runtime  | Turbo inició, pero los scripts internos de `pnpm` intentaron purgar/reinstalar `node_modules` y abortaron sin TTY. El typecheck directo de API sí pasó.                                                                                                                            |
| 2026-08-29 | `docker version`; inicio de `com.docker.service`                                                                                                                   | bloqueado por ambiente | Docker Desktop está detenido y el servicio no pudo abrirse con los permisos disponibles. La nueva prueba PostgreSQL de recibo/duplicado quedó implementada pero no se declara ejecutada.                                                                                           |
| 2026-08-30 | `node --test scripts/e2e-technical.test.mjs`                                                                                                                       | pass                   | 1/1 prueba en 107 s. Compose publicó sólo Nginx; el Webhook sintético atravesó Nginx/NestJS/PostgreSQL. Firma válida y duplicado devolvieron 200, esquema inválido 400, firma inválida 401; persistió exactamente un recibo y un job. El entorno temporal se eliminó al finalizar. |
| 2026-08-30 | ESLint focalizado; `tsc -p apps/api/tsconfig.json`; `node --test scripts/billing.test.mjs scripts/payment-webhook-http.test.mjs`; `docs-check`; `git diff --check` | pass                   | ESLint y tipos sin errores; 13/13 pruebas pasaron; documentación válida; sin errores de whitespace. Los avisos LF/CRLF corresponden al worktree existente.                                                                                                                         |
| 2026-08-30 | `node scripts/run-test-suite.mjs security --grep mercado-pago-webhook`; `node scripts/run-test-suite.mjs security --grep payment-webhook-http`                     | pass                   | 13/13 y 12/12 pruebas respectivamente. Confirmaron fuente única del secreto tipado, variantes diagnósticas sin autorización, separación 400/401, conservación de header/query y ausencia de persistencia para rechazos.                                                            |
| 2026-08-30 | `tsc -p apps/api/tsconfig.json`; ESLint; `node --test scripts/billing.test.mjs`; `node --test scripts/payment-webhook-http.test.mjs`                               | pass experimental      | 13/13 y 1/1 pruebas de la variante que omitía `notification_url`. La variante fue descartada después: staging confirmó que no generaba entregas automáticas. No describe el comportamiento restaurado.                                                                             |
| 2026-08-30 | Suite unitaria completa mediante `scripts/run-test-suite.mjs unit`                                                                                                 | pass                   | 39/39 pruebas sin fallos. Los correlation IDs emitidos fueron UUID sintéticos locales; no se usaron IDs del proveedor, PII ni secretos.                                                                                                                                            |
| 2026-08-30 | Suite de integración completa mediante `scripts/run-test-suite.mjs integration` con Docker local                                                                   | pass                   | 39/39 pruebas sin fallos, incluida idempotencia PostgreSQL. El primer intento sin permiso Docker obtuvo 38/39 y fue reemplazado por esta ejecución autorizada.                                                                                                                     |
| 2026-08-30 | Suite de seguridad completa mediante `scripts/run-test-suite.mjs security` con Docker local                                                                        | pass                   | 52/52 pruebas sin fallos.                                                                                                                                                                                                                                                          |
| 2026-08-30 | E2E técnico mediante `scripts/run-test-suite.mjs e2e`                                                                                                              | pass                   | 25/25 pruebas sin fallos; Compose expuso sólo Nginx y validó persistencia/Webhook sintético.                                                                                                                                                                                       |
| 2026-08-30 | E2E frontend mediante `scripts/run-frontend-e2e.mjs`                                                                                                               | pass                   | CLIENT 5/5 y ADMIN 4/4. Incluye resolución/cargo, proyección segura pendiente/rechazada, reintento sin avance, pago aprobado y conformidad/cierre.                                                                                                                                 |
| 2026-08-30 | Prettier global, ESLint global, `docs-check`, `git diff --check`                                                                                                   | pass                   | Todos los controles finalizaron con código 0. Se aplicó sólo formato mecánico a los siete archivos que impedían el control global.                                                                                                                                                 |
| 2026-08-30 | `tsc --noEmit` directo en los diez paquetes; Prisma generate; builds API/worker/librerías y Next CLIENT/ADMIN                                                      | pass                   | Todos los paquetes compilaron y ambos builds Next finalizaron correctamente. Se usaron binarios directos equivalentes porque el wrapper administrado de pnpm intentaba reinstalar dependencias por cada subproceso; no fue un fallo del código.                                    |

El intento de aplicar Prettier a `features.yaml` y `progress/current.yaml`
detectó errores YAML preexistentes en texto histórico no relacionado (por
ejemplo, notas planas con `:` y backticks). No se reformatearon ni corrigieron
esas secciones para preservar el alcance y los cambios existentes del usuario;
las ediciones de feat-007 se limitaron a estado, bloqueo y nota.

## Criterios de aceptación

| Criterio   | Evidencia esperada   | Resultado                                                                           |
| ---------- | -------------------- | ----------------------------------------------------------------------------------- |
| AC-007-001 | TEST-007-001/005     | pass local                                                                          |
| AC-007-002 | TEST-007-002/005     | pass local                                                                          |
| AC-007-003 | TEST-007-001/009     | pass local                                                                          |
| AC-007-004 | TEST-007-002/006     | pass local/staging                                                                  |
| AC-007-005 | TEST-007-003/012     | pass por contrato y observación staging                                             |
| AC-007-006 | TEST-007-004/007     | pass local; entrega oficial no productiva pendiente en TEST-007-014                 |
| AC-007-007 | TEST-007-006/008     | pass local/staging                                                                  |
| AC-007-008 | TEST-007-005/008     | pass local/staging                                                                  |
| AC-007-009 | TEST-007-008/010     | pass local/staging mediante conciliación                                            |
| AC-007-010 | TEST-007-009/012     | pass local                                                                          |
| AC-007-011 | TEST-007-001/006/012 | pass local                                                                          |
| AC-007-012 | TEST-007-003/012     | pass local/staging                                                                  |
| AC-007-013 | TEST-007-009/011     | pass local                                                                          |
| AC-007-014 | TEST-007-005/011     | pass PostgreSQL                                                                     |
| AC-007-015 | TEST-007-012/013     | pass — frontend 9/9 y técnico 25/25                                                 |
| AC-007-016 | TEST-007-014         | excepción aceptada sólo para staging; Webhook automático 401 y producción bloqueada |

## Verificación manual justificada

### Ejecución parcial en staging no productivo — 2026-08-27

La aplicación, las cuentas de prueba y el endpoint HTTPS fueron configurados por
el operador sin exponer credenciales. El primer inicio de Checkout Pro falló sin
crear una preferencia. Tras corregir la inyección de configuración no productiva,
una preferencia y un pago de prueba aprobado fueron creados. Un Webhook oficial
simulado por Mercado Pago fue aceptado, pero la conciliación autoritativa no
completó la transición; TEST-007-014 continúa pendiente.

| Fecha      | Ambiente              | Identificador PIGAR | Escenario                                                  | HTTP/estado normalizado               | Resultado | Observación técnica                                                                                                                                                                                                                               |
| ---------- | --------------------- | ------------------- | ---------------------------------------------------------- | ------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-27 | staging no productivo | req-…               | Creación de preferencia Checkout Pro                       | 503 / PREFERENCE_CREATION_UNCERTAIN   | fail      | No se creó preferencia en Mercado Pago; no se reintentó para evitar duplicados.                                                                                                                                                                   |
| 2026-08-27 | staging no productivo | req-…               | Preferencia y pago de prueba aprobado                      | Checkout abierto / pago aprobado      | partial   | Pago de prueba realizado; el retorno de navegador no se usó como fuente de verdad.                                                                                                                                                                |
| 2026-08-27 | staging no productivo | req-…               | Webhook `payment` simulado oficial y consulta autoritativa | 200 / PENDIENTE_PAGO tras 90 s        | fail      | La firma/recepción fueron aceptadas; posible lease de trabajo vencida tras redeploy. Simulación oficial, no entrega automática.                                                                                                                   |
| 2026-08-28 | staging no productivo | req-…               | Retorno `success` no autoritativo                          | retorno success / PENDIENTE_PAGO      | pass      | El retorno no produjo por sí mismo el cambio de estado.                                                                                                                                                                                           |
| 2026-08-28 | staging no productivo | req-…               | Pago de prueba aprobado y consulta autoritativa            | PENDIENTE_CONFORMIDAD                 | pass      | Flujo normal de Mercado Pago, sin simulador; transición asíncrona tras validar el pago con el proveedor.                                                                                                                                          |
| 2026-08-28 | staging no productivo | req-…               | Ausencia de Webhook automático y recuperación              | sin POST / PENDIENTE_CONFORMIDAD      | partial   | Recuperación por conciliación observada; la pérdida no fue inducida de forma controlada.                                                                                                                                                          |
| 2026-08-28 | staging no productivo | req-…               | Entrega automática de Webhook `payment`                    | 401                                   | fail      | Mercado Pago entregó; `ts` fue aceptado. La clave fue verificada por el operador en el mecanismo seguro; la firma HMAC aún no valida.                                                                                                             |
| 2026-08-28 | staging no productivo | req-…               | Pago de prueba pendiente (`CONT`)                          | PENDIENTE_PAGO / Webhook 401          | partial   | La solicitud no avanzó, como corresponde a un pago pendiente; no se pudo validar su procesamiento por Webhook real.                                                                                                                               |
| 2026-08-28 | staging no productivo | req-…               | Pago de prueba rechazado (`OTHE`)                          | PENDIENTE_PAGO / Webhook 401          | partial   | La solicitud no avanzó, como corresponde a un pago rechazado; no se pudo validar su procesamiento por Webhook real.                                                                                                                               |
| 2026-08-29 | staging no productivo | req-…               | Regresión tras actualizar SDK a `mercadopago` 3.6.0        | Webhook 401 / orden sin avance        | fail      | Pago de prueba posterior al despliegue; la entrega real continúa rechazada y la recuperación no produjo transición observable.                                                                                                                    |
| 2026-08-30 | staging no productivo | req-…               | Pago aprobado tras desplegar diagnóstico seguro            | IPN 400 / Webhook 401                 | fail      | La API cargó la clave configurada. Se observaron entregas IPN `id/topic`, que no admiten validación secreta, y Webhooks `data.id/type` con `WEBHOOK_SIGNATURE_INVALID`; ninguna variante sombra coincidió. No se conservaron valores ni IDs.      |
| 2026-08-30 | staging no productivo | req-…               | Preferencia nueva sin `notification_url`                   | sin entrega automática                | fail      | El simulador de Webhooks respondió 200, pero el panel, Nginx y los conteos sanitizados de recibos/jobs no registraron una entrega automática. Aplicación, Access Token, comprador y secreto ya estaban verificados; no repetir esas validaciones. |
| 2026-08-30 | staging no productivo | req-…               | Restauración de `notification_url`, simulador y pago nuevo | simulador 200 / conciliación correcta | accepted  | Se desplegaron imágenes del commit `efe6225`; el pago finalizó y la consulta autoritativa mantuvo operativo el flujo. La falla del Webhook automático se acepta sólo en staging y continúa bloqueando producción.                                 |

Controles documentales y de implementación ejecutados localmente el
2026-08-27:

| Comando                                                                                                                        | Salida resumida                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter api build`                                                                                                      | correcto; Prisma Client generado y TypeScript compilado.                                                                                                                                                             |
| `pnpm test:unit -- --grep feat-007`                                                                                            | correcto; 17 pruebas, 0 fallos. Incluye rechazo determinístico sin bloquear un nuevo intento.                                                                                                                        |
| `pnpm lint`                                                                                                                    | correcto; ESLint sin errores.                                                                                                                                                                                        |
| `pnpm --filter api build && pnpm test:unit -- --grep feat-007`                                                                 | correcto; compilación y 17 pruebas, 0 fallos, incluidos `ts` en segundos/milisegundos, arranque y diagnóstico seguro de Webhook.                                                                                     |
| `pnpm --filter api build && pnpm test:unit -- --grep feat-007`                                                                 | correcto; compilación y 17 pruebas, 0 fallos. El receptor delega la firma HMAC en el SDK oficial y conserva la ventana anti-replay para `ts` en segundos/milisegundos.                                               |
| `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json` + `node --test scripts/billing.test.mjs`                      | correcto; TypeScript compiló y 8/8 pruebas focalizadas superaron con `mercadopago` 3.6.0. La prueba de casing confirma el contrato vigente del SDK.                                                                  |
| `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json` + `node --test scripts/billing.test.mjs`                      | correcto; TypeScript compiló y 9/9 pruebas focalizadas superaron. La conciliación aísla errores del proveedor y registra sólo `PAYMENT_PROVIDER_*` seguro.                                                           |
| `prettier --check` + `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json` + `node --test scripts/billing.test.mjs` | correcto; formato válido, TypeScript compiló y 9/9 pruebas focalizadas superaron. Red, timeout y JSON inválido del proveedor se normalizan sin registrar detalles sensibles; `POLL_FAILED` incluye una etapa segura. |
| `prettier --check` + `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json` + `node --test scripts/billing.test.mjs` | correcto; formato válido, TypeScript compiló y 9/9 pruebas focalizadas superaron. La etapa del poll se codifica en `POLL_*_FAILED`, compatible con el logger de esquema fijo.                                        |
| `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json` + `node --test scripts/billing.test.mjs`                      | correcto; TypeScript compiló y 9/9 pruebas focalizadas superaron. La conciliación aísla cada intento y clasifica respuesta inválida, desajuste y almacenamiento mediante códigos seguros.                            |
| `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json` + `node --test scripts/billing.test.mjs`                      | correcto; TypeScript compiló y 9/9 pruebas focalizadas superaron. `in_process` y `authorized` se normalizan a pendiente; el estado no soportado se registra sólo como código seguro.                                 |

TEST-007-014 permanece bloqueado. La creación de preferencia, el retorno no
autoritativo, la consulta autoritativa, el pago aprobado y los estados de
prueba pendiente/rechazado fueron observados en staging no productivo. Sin
embargo, Mercado Pago responde 401 al entregar los Webhooks `payment` reales,
por lo que no se pueden completar válidamente firma/recepción, duplicado,
fuera de orden y pérdida controlada. La acción humana pendiente es escalar el
caso por el canal de soporte de Mercado Pago sin adjuntar secretos ni payloads
sin sanitizar. Los resultados previos de la PoC con mock no sustituyen esta
validación.

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

La migración PostgreSQL y los controles focalizados de permisos, privacidad y
Webhook fueron verificados localmente. La entrega Webhook automática real,
retención/borrado, contracargos, reembolsos, cifrado/backup/hardening continúan
bloqueando producción.

## Revisión independiente final

- Fecha: 2026-08-30.
- Veredicto: `PASS` para `publication_review` e integración en `staging`.
- Alcance: revisión estática de seguridad, proyección CLIENT, E2E nuevos,
  trazabilidad completa, fuente única del secreto, `notification_url` restaurada
  y retiro del trigger temporal.
- Hallazgos: ninguno bloqueante.
- Restricción: AC-007-016 continúa bloqueando producción; el veredicto sólo
  habilita el entorno no productivo.

## Publicación

- Aprobación funcional de staging: otorgada por el usuario el 2026-08-30 con
  conciliación autoritativa y excepción AC-007-016.
- Commit diagnóstico: `7e53a60`, autorizado y publicado el 2026-08-30.
- Commit experimental sin `notification_url`: `c352a92`; revertido
  funcionalmente por `efe6225` tras la validación de staging.
- Commit restaurado desplegado: `efe6225`; imágenes `pigar-app` y `pigar-nginx`
  publicadas y validadas por el operador en staging.
- Integración final en `staging`: `45013b0`; corrección determinística de la
  prueba de privacidad: `8758b78`.
- Calidad remota de `8758b78`: `PASS`, ejecución
  [33337065937](https://github.com/grupoSIM/PIGAR/actions/runs/33337065937).
  Incluyó formato, lint, tipos, unitarias, integración, seguridad, E2E,
  contrato CI y documentación.
- Imágenes `pigar-app`/`pigar-nginx` de `8758b78`: publicación GHCR `PASS`,
  ejecución
  [33337065933](https://github.com/grupoSIM/PIGAR/actions/runs/33337065933),
  con manifiestos `linux/amd64` etiquetados por el SHA completo.
- La primera calidad del commit de integración (`45013b0`, ejecución
  `33323499765`) detectó un falso positivo no funcional: una búsqueda textual
  de `123` podía coincidir aleatoriamente dentro del UUID sintético de
  correlación. Se reemplazó por una comprobación semántica que limita las
  claves del evento y valida únicamente el metadata auditable; el test
  focalizado superó 7/7 localmente y la suite remota posterior quedó verde.
- Inventario de exposición de esta verificación: sólo nombres de workflows,
  conteos, códigos internos, SHAs Git y UUIDs sintéticos generados por tests.
  No se registraron secretos, payloads del proveedor, IDs de pago completos,
  emails ni datos de tarjeta.
- La rama diagnóstica dejó de ser fuente de publicación; sus cambios netos
  necesarios quedaron integrados en `staging` y el trigger temporal fue
  retirado. La rama temporal de integración tiene como único propósito
  conservar trazabilidad local durante este cierre y puede retirarse después
  del 2026-09-06 por el responsable del repositorio.
- Despliegue: staging fue ejecutado previamente por el operador. Esta
  publicación generó imágenes nuevas, pero no realizó despliegue a Hostinger.
  Producción no está autorizada y continúa bloqueada por AC-007-016.

## Reapertura — compuerta de calidad para imágenes

El usuario reabrió el cierre el 2026-08-30 al detectar que
`publish-staging-images` se disparaba en paralelo con `quality`, contradiciendo
la política documentada. El incremento incorpora NFR-007-009, AC-007-017,
TASK-007-012 y TEST-007-016. `quality` llama al workflow reutilizable de
imágenes mediante un job con `needs: verify`, limitado a
`refs/heads/staging`; ambos usan el mismo `github.sha` y sólo el publicador
recibe `packages: write`.

| Fecha      | Verificación                                                                                 | Resultado                                                                                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-30 | `pnpm test:ci-contract`                                                                      | pass 3/3; valida dependencia de `verify`, rama staging, workflow reutilizable, SHA y ausencia de disparadores independientes.                                         |
| 2026-08-30 | Prettier focalizado; ESLint de `scripts/ci-contract.test.mjs`; `node scripts/docs-check.mjs` | pass; todos los archivos de código/documentación afectados tienen formato válido, lint limpio y trazabilidad consistente.                                             |
| 2026-08-30 | `git diff --check`                                                                           | pass; sólo advertencias de conversión LF/CRLF del checkout secundario, sin errores de whitespace.                                                                     |
| 2026-08-30 | `pnpm format:check` global en worktree secundario                                            | no concluyente: señaló 125 archivos preexistentes por conversión CRLF del checkout. No se reescribieron; la CI Linux limpia ejecutará el control global autoritativo. |

La revisión independiente estática emitió `PASS` sin hallazgos P0/P1/P2:
confirmó dependencia y propagación del SHA, omisión ante fallo/cancelación,
restricción a staging, ausencia de callers/disparadores alternativos y privilegio
mínimo. Su observación P3 sobre regex fue resuelta haciendo que el contrato
exija exactamente un caller y dos declaraciones `packages: write` (caller y
reusable).

TEST-007-016 se completó en la ejecución remota
[33338559977](https://github.com/grupoSIM/PIGAR/actions/runs/33338559977)
del SHA `942e0281dc542aa6ebe1d24ff3d326df4e9555cd`. Existió un único run
`quality`: `verify` superó instalación, Prisma, formato, lint, tipos, unitarias,
integración, seguridad, E2E, contrato CI y documentación en 4m22s. Recién tras
su finalización apareció `publish-staging-images / publish`, que construyó y
publicó `pigar-app` y `pigar-nginx` en 1m59s. No se creó un workflow paralelo de
imágenes y ambos tags usan el mismo SHA. AC-007-017 y TASK-007-012 quedan en
`pass`; feat-007 vuelve a `done` sin modificar el bloqueo productivo de
AC-007-016.
