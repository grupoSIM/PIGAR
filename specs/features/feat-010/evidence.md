# Evidencia — feat-010: Calificaciones e incidencias de postventa

## Estado y alcance

Estado: `done`; la matriz de pruebas y calidad está completa con
comandos y salidas vigentes. La novena revisión independiente emitió PASS en
`review-9.md` sobre el estado actual. La validación remota del commit
`c6a5518e02dd89cff528131ecb84c3ba6cd88e91` pasó calidad y publicó las imágenes
de staging.

La implementación incluye migración, API y dos interfaces. Fue integrada en
`staging` y autorizada para integración en `main`; no se abrió PR ni se ejecutó
un despliegue productivo.

## Resumen de cambios propuestos

- Calificación única, inmutable e idempotente por orden `CERRADA` y propietario.
- Incidencia estructurada con una activa por orden e historial append-only.
- Triage/cierre ADMIN/DISPATCHER sin mutar orden, dinero ni conformidad.
- `OTRO` limitado a NFKC+trim 1..100, sin HTML, URL, adjunto, logging o
  propagación innecesaria.
- Consulta sólo en portal, sin garantía, avisos, proveedor, canal ni outbox.

## Verificaciones documentales

| Fecha      | Comando                                                                                                                                                    | Resultado    | Alcance/notas                                                                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-08-31 | `pnpm docs:check`; `pnpm exec prettier --check ...`                                                                                                        | no ejecutado | El wrapper intentó purgar/reinstalar `node_modules` y abortó por falta de TTY; no se contabiliza como fallo de los artefactos.                               |
| 2026-08-31 | `node scripts/docs-check.mjs` mediante el runtime local del workspace                                                                                      | passed       | Código 0, sin salida. Es verificación documental, no prueba de producto.                                                                                     |
| 2026-08-31 | `node node_modules/prettier/bin/prettier.cjs --check "specs/features/feat-010/*.md" "specs/features/feat-010/api-contract.yaml"` mediante el runtime local | passed       | La primera pasada detectó cuatro archivos; tras formato mecánico focalizado, la repetición informó que los siete artefactos cumplen estilo y parseó el YAML. |
| 2026-08-31 | PowerShell: control regex de definiciones/referencias en `specs/features/feat-010`                                                                         | passed       | `REQ=9 NFR=8 AC=13 TASK=8 TEST=13`; 51 IDs únicos referenciados, 0 faltantes y 0 definiciones duplicadas.                                                    |
| 2026-08-31 | PowerShell: control de estado `features.yaml`/`progress/current.yaml`                                                                                      | passed       | Proyecto y feat-010 en `spec_review`, feature activa correcta y `approvals.specification.status: pending`.                                                   |
| 2026-08-31 | `git diff --check`                                                                                                                                         | passed       | Código 0; sólo avisos LF/CRLF preexistentes del checkout, sin errores de whitespace.                                                                         |

## Implementación en curso

| Fecha      | Comando                                                                                                                                        | Resultado | Alcance/notas                                                                                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-01 | Node 22: `pnpm --filter @pigar/api build`                                                                                                      | passed    | Prisma regenerado y TypeScript de API compilado; no se registraron datos sensibles.                                                                                                |
| 2026-09-01 | Node 22: `pnpm --filter @pigar/customer-web build`; `pnpm --filter @pigar/admin-web build`                                                     | passed    | Ambos frontends compilaron con las rutas de postventa.                                                                                                                             |
| 2026-09-01 | Docker local sintético: `pnpm --filter @pigar/api prisma:migrate:deploy` con PostgreSQL en puerto local                                        | passed    | Aplicó forward-only `20260901090000_feat_010_aftercare`; no hay backfill ni borrado.                                                                                               |
| 2026-09-01 | Node 22: `DATABASE_URL=<local synthetic> node --test scripts/aftercare-postgres.test.mjs`                                                      | passed    | PostgreSQL real verificó rating único, incidencia activa única, triggers append-only y FK restrictiva usando sólo fixtures sintéticos.                                             |
| 2026-09-01 | Node 22: `pnpm test:unit -- --grep feat-010`                                                                                                   | passed    | 14 archivos de la suite se ejecutaron sin fallos; los dos escenarios feat-010 de allowlists y aislamiento pasaron.                                                                 |
| 2026-09-01 | Node 22 + PostgreSQL sintético: `pnpm test:integration -- --grep aftercare`                                                                    | passed    | 15 archivos de integración completaron sin fallos; incluye la verificación PostgreSQL de feat-010.                                                                                 |
| 2026-09-01 | Node 22: `pnpm --filter @pigar/api build`; `node --test scripts/aftercare.test.mjs`                                                            | passed    | Compilación y dos pruebas focalizadas tras incorporar límites por perfil para lecturas, escrituras y transiciones.                                                                 |
| 2026-09-01 | Node 22: `pnpm lint`; `pnpm typecheck`; `git diff --check`                                                                                     | passed    | Lint y typecheck globales pasaron; el diff no tiene errores de whitespace. `pnpm format:check` continúa fallando por 59 archivos preexistentes fuera del alcance de feat-010.      |
| 2026-09-01 | Node 22 + PostgreSQL sintético: `pnpm test:security -- --grep feat-010`                                                                        | passed    | 18 archivos finalizaron sin fallos; cubre validación segura y constraints reales de postventa.                                                                                     |
| 2026-09-01 | Node 22: `pnpm test:e2e:frontends`                                                                                                             | passed    | La suite existente CLIENT pasó 6/6. No cubre todavía casos específicos de postventa, por lo que no se usa para cerrar AC-010-012.                                                  |
| 2026-09-01 | Node 22: `pnpm --filter @pigar/customer-web run test:e2e -- --grep postventa`                                                                  | passed    | La suite CLIENT pasó 7/7, incluido alta de calificación y apertura de incidencia estructurada con fixtures sintéticos.                                                             |
| 2026-09-01 | Node 22: `pnpm --filter @pigar/admin-web run test:e2e -- --grep incidencia`                                                                    | passed    | La suite ADMIN pasó 5/5, incluido triage y cierre de incidencia estructurada con fixtures sintéticos.                                                                              |
| 2026-09-01 | Node 22: `pnpm --filter @pigar/api build`; `node --test scripts/aftercare.test.mjs`                                                            | passed    | Auditoría administrativa minimizada compilada y pruebas focalizadas 2/2 superadas; sólo registra actor, acción, resultado, ID opaco y correlación.                                 |
| 2026-09-01 | Node 22: `pnpm build`                                                                                                                          | passed    | Los 10 paquetes del monorepo compilaron. Las advertencias de Auth0 corresponden a configuración vacía local de build, sin secretos ni tráfico externo.                             |
| 2026-09-01 | Node 22: `node scripts/docs-check.mjs`; `git diff --check`                                                                                     | passed    | La consistencia documental y el diff se validaron sin errores; los avisos LF/CRLF son propios del checkout.                                                                        |
| 2026-09-01 | Node 22: `pnpm test:unit`                                                                                                                      | passed    | Suite unitaria global: 46/46 pruebas superadas. La instalación local requirió restaurar enlaces ya presentes en el lockfile; no se modificaron dependencias versionadas.           |
| 2026-09-01 | Node 22 sin `DATABASE_URL`: `pnpm test:integration`                                                                                            | passed    | Suite de integración global aprobada en su modo de degradación; las constraints de PostgreSQL real se verifican por separado con `scripts/aftercare-postgres.test.mjs`.            |
| 2026-09-01 | Node 22: `pnpm --filter @pigar/api build`; `node --test scripts/aftercare.test.mjs`                                                            | passed    | Regresión de privacidad: `OTRO` rechaza también dominios sin esquema; build y pruebas focalizadas 2/2 superados.                                                                   |
| 2026-09-01 | `git diff -- apps/api apps/customer-web apps/admin-web scripts` con búsqueda de exclusiones                                                    | passed    | No se agregaron garantía, remedio comercial, pagos, proveedor, webhook, notificaciones ni outbox; coincidencias encontradas pertenecen a código y suites preexistentes.            |
| 2026-09-01 | Node 22: `node scripts/docs-check.mjs`; `git diff --check`                                                                                     | passed    | Documentación de migración/retención de staging para feat-010 validada; sin errores de documentación ni whitespace.                                                                |
| 2026-09-01 | Node 22: `pnpm --filter @pigar/api build`; `node --test scripts/aftercare.test.mjs`                                                            | passed    | Pruebas focalizadas 3/3: allowlists/privacidad, aislamiento de dominio y límites 429 de escritura/transición por perfil.                                                           |
| 2026-09-01 | Node 22: `pnpm --filter @pigar/api build`; `node --test scripts/aftercare.test.mjs`                                                            | passed    | Rate limiting de escrituras CLIENT validado por perfil (10/min) y por IP (30/min), sin persistir ni auditar la IP.                                                                 |
| 2026-09-01 | Node 22: `node node_modules/prettier/bin/prettier.cjs --check …`                                                                               | passed    | Tras autorización humana para reformatear archivos preexistentes, todos los archivos incluidos en `format:check` cumplen Prettier.                                                 |
| 2026-09-01 | Node 22: ESLint global; `turbo run build`; `turbo run typecheck`                                                                               | passed    | Lint, build de 10 paquetes y typecheck global completaron sin fallos. Auth0 sólo emitió advertencias esperadas por configuración local vacía.                                      |
| 2026-09-01 | Node 22: `node scripts/run-test-suite.mjs unit`                                                                                                | passed    | 47/47 pruebas unitarias superadas, incluidas las tres focalizadas de feat-010.                                                                                                     |
| 2026-09-01 | Node 22 + Docker local: `node scripts/run-test-suite.mjs integration`                                                                          | passed    | 49 superadas, 0 fallos y 1 skip condicional; PostgreSQL real de feat-010 se ejecutó previamente con `DATABASE_URL` sintética.                                                      |
| 2026-09-01 | Node 22 + Docker local: `node scripts/run-test-suite.mjs security`                                                                             | passed    | 62 superadas, 0 fallos y 1 skip condicional; incluye aislamiento y controles de postventa.                                                                                         |
| 2026-09-01 | Node 22 + Chromium local: `node scripts/run-frontend-e2e.mjs`                                                                                  | passed    | CLIENT 7/7 y ADMIN 5/5, con alta de rating/incidencia y transición triage/cierre.                                                                                                  |
| 2026-09-01 | Revisión independiente                                                                                                                         | failed    | No habilita publicación: P0-RV-010-001 a P0-RV-010-004 en `review.md` (idempotencia concurrente, paginación contractual, `Retry-After` y trazabilidad de aceptación).              |
| 2026-09-01 | Docker local, PostgreSQL temporal: `node --test --test-name-pattern="carreras de servicio" apps/api/src/aftercare/aftercare-postgres.test.mjs` | passed    | 1/1: 20 carreras reales de rating, incidencia y transición; replay con misma clave, 409 por payload/versión incompatibles y ningún P2002 expuesto.                                 |
| 2026-09-01 | Docker local, PostgreSQL temporal: `node --test --test-name-pattern="Nest/Fastify" apps/api/src/aftercare/aftercare-postgres.test.mjs`         | passed    | 1/1: HTTP real 401/403/404/409/413/415/429, `Retry-After`, `application/problem+json`, DTO inválido y forma exacta de soporte/incidente.                                           |
| 2026-09-01 | Docker local: `pnpm format:check`                                                                                                              | not_run   | El artefacto de build no contiene los archivos raíz requeridos; montar el workspace disparó una reinstalación que abortó para no purgar `node_modules`. No se acredita formato.    |
| 2026-09-01 | Docker QA: `pnpm format:check`; `pnpm lint`                                                                                                    | passed    | Formato y ESLint globales finalizaron con código 0 tras formatear sólo los dos archivos de postventa señalados por Prettier.                                                       |
| 2026-09-01 | Docker QA: `pnpm --filter @pigar/api prisma:generate && pnpm typecheck && pnpm build`                                                          | passed    | Prisma generado; typecheck 14/14 y build 10/10 superados. Las advertencias Auth0 sólo corresponden a configuración local vacía.                                                    |
| 2026-09-01 | Docker QA: `pnpm test:unit`                                                                                                                    | passed    | 51/51 pruebas unitarias superadas, incluidas las siete focalizadas de feat-010.                                                                                                    |
| 2026-09-01 | Docker Playwright: `pnpm test:e2e:frontends`                                                                                                   | passed    | CLIENT 7/7 y ADMIN 5/5; incluye alta de calificación/incidencia y triage/cierre con fixtures sintéticos.                                                                           |
| 2026-09-01 | Docker QA: `pnpm docs:check`; `git diff --check`                                                                                               | passed    | Chequeo documental sin salida de error y diff sin errores de whitespace; los avisos CRLF son propios del checkout.                                                                 |
| 2026-09-01 | Docker QA: `pnpm test:security`                                                                                                                | not_run   | La suite ejecutó 64 controles y sólo fallaron tres wrappers que intentan invocar Docker desde dentro del contenedor (`spawn docker ENOENT`); no se acredita la suite completa.     |
| 2026-09-01 | Docker QA conectado a PostgreSQL temporal: `pnpm test:integration -- --grep feat-010`                                                          | not_run   | El build previo de la suite no pudo descargar el motor Prisma (`EAI_AGAIN`); las pruebas reales focalizadas de PostgreSQL y HTTP se conservan como evidencia independiente arriba. |

### Evidencia vigente de verification y cierre independiente

Los registros históricos anteriores se preservan como trazabilidad. Esta tabla
es la evidencia autoritativa posterior a las dos revisiones fallidas: no expone
payloads, IDs, correlaciones ni contenido de `otherMessage`.

| Fecha      | Comando                                                                                                                 | Resultado | Salida resumida                                                                                                                                                                                                                                                                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-01 | Docker: `node --test apps/api/src/aftercare/aftercare-postgres.test.mjs`                                                | passed    | 2/2: PostgreSQL real y Nest/Fastify. Veinte carreras de rating, incidencia y transición: replay por misma clave, 409 para payload/versión incompatibles y ningún P2002/500 expuesto. Incluye snapshots inmutables de orden, transiciones, cargo, pago, conformidad, outbox y notificaciones; ciclo cerrar/abrir nuevo, cursor y p95 local menor a 500 ms. |
| 2026-09-01 | Node 22: `node scripts/run-test-suite.mjs integration`                                                                  | passed    | 54 superadas, 0 fallos, 2 skips condicionales; incluye el wrapper Docker de FEAT-010.                                                                                                                                                                                                                                                                     |
| 2026-09-01 | Node 22: `node scripts/run-test-suite.mjs security`                                                                     | passed    | Suite de seguridad sin fallos; validación de allowlists, contrato, aislamiento y migración de postventa.                                                                                                                                                                                                                                                  |
| 2026-09-01 | Docker QA: `pnpm format:check`; `pnpm lint`; `pnpm --filter @pigar/api prisma:generate && pnpm typecheck && pnpm build` | passed    | Formato y lint con código 0; Prisma generado, typecheck 14/14 y build 10/10.                                                                                                                                                                                                                                                                              |
| 2026-09-01 | Docker QA: `pnpm test:unit`; Docker Playwright: `pnpm test:e2e:frontends`                                               | passed    | Unit 51/51; E2E CLIENT 7/7 y ADMIN 5/5.                                                                                                                                                                                                                                                                                                                   |
| 2026-09-01 | Docker QA: `pnpm docs:check`; `git diff --check`                                                                        | passed    | Documentación válida y diff sin errores de whitespace; avisos CRLF son del checkout.                                                                                                                                                                                                                                                                      |

| 2026-09-02 | Revisión independiente de correcciones | failed | Cuatro P0 nuevos: replay HTTP debía ser 200, auditoría de rechazos, precondición CERRADA de soporte y cursor inexistente como 400. Se registran para trazabilidad; no habilita publicación. |
| 2026-09-02 | Docker PostgreSQL/Nest: `node --test apps/api/src/aftercare/aftercare-postgres.test.mjs` | passed | 2/2 tras corregir los cuatro P0: replay HTTP 200, auditoría con outcomes seguros, soporte de orden no cerrada 409 y cursor válido/no existente 400. |
| 2026-09-02 | Node 22: `pnpm format:check`; `pnpm lint`; `pnpm typecheck`; `pnpm build`; `pnpm test:unit`; `pnpm test:security` | passed | Formato, lint, typecheck y build finalizaron con código 0; unit 51/51 y la suite de seguridad completó sin fallos. |
| 2026-09-02 | Revisión independiente final | failed | P0 contractual adicional: la primera transición HTTP devolvía 201 en lugar del 200 exclusivo del contrato. Se registró en `review-4.md`; no habilita publicación. |
| 2026-09-02 | Docker PostgreSQL/Nest: `node --test apps/api/src/aftercare/aftercare-postgres.test.mjs` | passed | 2/2 tras corregir la transición: el primer `START_TRIAGE` HTTP devuelve 200, y continúan pasando las carreras, contratos y controles previos. |
| 2026-09-02 | Quinta revisión independiente de cierre | failed | P0-RV-010-011: las rutas privadas de lectura permitían ADMIN/DISPATCHER. Se registró en `review-5.md`; no habilita publicación. |
| 2026-09-02 | Docker PostgreSQL/Nest: `node --test apps/api/src/aftercare/aftercare-postgres.test.mjs` | passed | 2/2 tras corregir P0-RV-010-011: ADMIN/DISPATCHER reciben 403 en las dos rutas privadas; mantienen vigencia las carreras, contratos, 401/403/404/409/413/415/429 y controles de privacidad. |
| 2026-09-02 | Sexta revisión independiente de cierre: build API y Docker PostgreSQL/Nest | passed | `review-6.md`: build de API con código 0 y prueba independiente 2/2. Confirmó el cierre de P0-RV-010-011, contratos, carreras, auditoría/métricas minimizadas y ausencia de cambios fuera de alcance. |
| 2026-09-02 | Node 22: `pnpm format:check`; `node scripts/docs-check.mjs`; `git diff --check` | passed | Formato global conforme; documentación válida y diff sin errores de whitespace. Los avisos CRLF pertenecen al checkout y no son errores. |
| 2026-09-02 | Node 22: `pnpm lint` | passed | ESLint global finalizó con código 0 después de declarar explícitamente los globals Node usados por la prueba PostgreSQL de feat-010. |
| 2026-09-02 | Node 22: `pnpm typecheck`; `pnpm build` | passed | Typecheck 14/14 y build 10/10; API, CLIENT y ADMIN compilaron con las rutas, filtros e historiales de postventa corregidos. |
| 2026-09-02 | Node 22: `node --test scripts/aftercare.test.mjs` | passed | 8/8 pruebas focalizadas; allowlists, privacidad, aislamiento, proxies, filtros, rate limits, cursor, replay y `Retry-After`. |
| 2026-09-02 | Node 22: `node scripts/run-test-suite.mjs unit` | passed | 52/52 pruebas unitarias, incluidas las ocho pruebas focalizadas de feat-010. |
| 2026-09-02 | Docker/Chromium: `node scripts/run-frontend-e2e.mjs` | passed | CLIENT 7/7 y ADMIN 5/5; incluye foco por teclado, payload de historial con `createdAt`, filtros de bandeja y triage/cierre. |
| 2026-09-02 | Docker: `node scripts/aftercare-postgres.test.mjs` | passed | 2/2 escenarios activos, 0 fallos y 2 skips condicionales; migración, carreras de 20 comandos, contrato HTTP, snapshots de no mutación y p95 local. |
| 2026-09-02 | Revisión independiente final posterior a `review-6.md` | failed | `review-7.md`: P0 en el mapeo del proxy ADMIN y P1 de accesibilidad, consulta de soporte por orden, contrato UUID/cursor, orden de bandeja, fingerprint ligado al recurso y trazabilidad; no habilita publicación. |
| 2026-09-02 | Node 22: `pnpm --filter @pigar/api build`; `node --test scripts/aftercare.test.mjs`; typecheck ADMIN/CLIENT | passed | Build API, prueba focalizada 8/8 y typecheck de ambos frontends tras las correcciones del Reviewer; incluye proxy, UUID/cursor, idempotencia por recurso y estados accesibles. |
| 2026-09-02 | Docker PostgreSQL/Nest: `node scripts/aftercare-postgres.test.mjs` | passed | 2/2 escenarios activos, 0 fallos y 2 skips condicionales después de las correcciones; incluyó rechazo UUID inválido, cursor >512, alcance de idempotencia, carreras, contrato HTTP y migración. |
| 2026-09-02 | Docker/Chromium: `node scripts/run-frontend-e2e.mjs` | passed | CLIENT 7/7 y ADMIN 6/6; incluyó contador/foco de errores, filtros, triage/cierre y consulta ADMIN de rating/incidencias por orden cerrada. |
| 2026-09-02 | Revisión independiente de seguimiento | failed | `review-8.md`: la bandeja ADMIN aún ocultaba errores de carga/transición; no habilita publicación. |
| 2026-09-02 | Docker/Chromium: `pnpm --filter @pigar/admin-web run test:e2e` | passed | ADMIN 7/7; incluye error de carga, reintento, error de transición, filtros, triage/cierre y consulta de soporte por orden. |
| 2026-09-02 | Revisión independiente final de seguimiento | passed | `review-9.md`: PASS sobre el estado actual; habilita `publication_review`. No autoriza commit, push, PR, publicación ni despliegue. |
| 2026-09-02 | Node 22: `pnpm typecheck`; `pnpm format:check`; `node scripts/docs-check.mjs`; `git diff --check` | passed | Typecheck global 14/14, formato del alcance de calidad, documentación y whitespace sin errores; los avisos CRLF son del checkout. |
| 2026-09-02 | Node 22 + Chromium: `CI=1 PIGAR_E2E_PORT=3102 playwright test --grep "registra una calificación"` | passed | E2E focalizado 1/1; confirma que CLIENT vuelve a consultar incidencias al pulsar `Actualizar` y refleja `EN_TRIAGE` sin recargar la página completa. |

## Criterios de aceptación

| Criterio   | Evidencia requerida                                    | Resultado |
| ---------- | ------------------------------------------------------ | --------- |
| AC-010-001 | TEST-010-001, TEST-010-003, TEST-010-004, TEST-010-007 | passed    |
| AC-010-002 | TEST-010-002, TEST-010-003, TEST-010-008, TEST-010-012 | passed    |
| AC-010-003 | TEST-010-004, TEST-010-011                             | passed    |
| AC-010-004 | TEST-010-003, TEST-010-006                             | passed    |
| AC-010-005 | TEST-010-001, TEST-010-003, TEST-010-005               | passed    |
| AC-010-006 | TEST-010-001, TEST-010-003, TEST-010-005, TEST-010-011 | passed    |
| AC-010-007 | TEST-010-003, TEST-010-006, TEST-010-009               | passed    |
| AC-010-008 | TEST-010-005, TEST-010-007                             | passed    |
| AC-010-009 | TEST-010-008                                           | passed    |
| AC-010-010 | TEST-010-009                                           | passed    |
| AC-010-011 | TEST-010-011                                           | passed    |
| AC-010-012 | TEST-010-010, TEST-010-012                             | passed    |
| AC-010-013 | TEST-010-007, TEST-010-008, TEST-010-013               | passed    |

## Verificación manual justificada

No ejecutada. La UAT corresponde a una fase posterior a implementación,
aprobación de especificación y autorización de staging.

## Seguridad, datos y migraciones

- Datos propuestos: estrellas/motivo allowlist y, sólo para `OTRO`, mensaje
  normalizado; tipo/estado/historial estructurado de incidencia.
- Actores: CLIENT propietario; ADMIN/DISPATCHER sólo consulta y triage/cierre.
- Retención: sin borrado automático en staging; producción bloqueada hasta
  validación legal.
- Migración: aditiva y forward-only, con FKs `RESTRICT`, restricciones, índices
  e historial append-only; la matriz de calidad y migración está verificada en
  las corridas de PostgreSQL registradas arriba.
- Logs/evidencia: no deben contener `otherMessage`, PII, datos de pago,
  multimedia, secretos, URLs o payloads.

## Limitaciones y deuda aceptada

- Las allowlists, los estados mínimos y los límites de rate limit fueron
  aprobados con la especificación; cualquier ampliación requiere discovery nuevo.
- Garantía y todo remedio comercial permanecen fuera de alcance.
- Producción continúa bloqueada por retención/borrado legal y condiciones de
  plataforma; TEST-007-014/AC-007-016 mantiene el bloqueo exclusivo del Webhook
  de Mercado Pago sin formar parte de feat-010.

## Publicación

- Aprobación de especificación: `approved`.
- Aprobación de publicación: `approved` por el usuario el 2026-09-02.
- Commit de implementación: `c6a5518e02dd89cff528131ecb84c3ba6cd88e91`.
- Workflow remoto: #82, calidad e imágenes de staging `success`.
- Integración: `staging` y `main`; no se abrió PR ni se ejecutó un despliegue productivo.
