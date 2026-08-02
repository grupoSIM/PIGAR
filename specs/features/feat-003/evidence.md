# Evidencia — feat-003: Catálogo de servicios, zonas y tarifas

Estado: revisión independiente `pass` el 2026-08-02. No hay publicación registrada.

## TASK-003-001

- Requisitos/aceptación: `REQ-003-001`, `REQ-003-002`, `AC-003-001`, `AC-003-002`.
- Cambio: migración forward-only `20260802090000_catalog` con categorías, zona y tarifas; restricción parcial de una sola zona activa, referencias `RESTRICT` y seed sintético idempotente de Visita Simple / ARS 50.000.
- Comando: `pnpm --filter @pigar/api build`.
- Resultado: exitoso; Prisma Client 7.9.0 generado y TypeScript de `@pigar/api` compiló sin errores.

## TASK-003-002

- Requisitos/aceptación: `REQ-003-003`, `REQ-003-004`, `AC-003-003` a `AC-003-005`.
- Cambio: importes se validan como strings decimales de dos posiciones, exclusivamente `ARS`; PostgreSQL impide importe/vigencia inválidos y solapamientos de tarifas publicadas. La oferta expone únicamente datos comerciales y su versión. Las solicitudes futuras deberán copiar esos campos en `QuotedOffer`; no se creó la entidad de feat-004.
- Comandos: `pnpm test:unit -- --grep catalog`; `pnpm test:integration -- --grep catalog`.
- Resultado: exitoso; 11/11 y 11/11 pruebas pasaron respectivamente, incluyendo dinero decimal, vigencia, oferta vigente, restricción de zona y contrato/migración.

## TASK-003-003

- Requisitos/aceptación: `REQ-003-006`, `AC-003-006`, `AC-003-007`.
- Cambio: los endpoints mutables exigen `ADMIN`; `DISPATCHER` sólo consulta el catálogo operativo y `CLIENT` queda denegado. Cada mutación registra actor, resultado, correlación, tipo de evento e ID opaco del recurso; no guarda payload, PII, domicilio, coordenadas ni secretos.
- Comando: `pnpm test:security -- --grep catalog`.
- Resultado: exitoso; 12/12 pruebas pasaron, con denegaciones para CLIENT/DISPATCHER, consulta permitida para DISPATCHER y auditoría sanitizada.

## TASK-003-004

- Requisitos/aceptación: `REQ-003-005`, `AC-003-001`, `AC-003-004`.
- Cambio: endpoint público limitado `/v1/catalog/offers`, endpoints protegidos de administración y textos de portal/backoffice con el alcance comercial aprobado.
- Comandos: `pnpm test:e2e`; `pnpm format:check`; `pnpm lint`; `pnpm typecheck`.
- Resultado: exitoso; E2E Compose 2/2 verificó que Nginx sirve Visita Simple / ARS 50.000 desde la migración y seed reales; formato, lint y los 14 paquetes de typecheck finalizaron sin errores.

## Nota de publicación

El usuario autorizó el 2026-08-02 crear el commit local y hacer push. No autorizó PR ni despliegue.

- Commit de implementación: `d16d85462383ed91f266392d37f2977b01647f7e`
  (`feat(catalog): agregar catálogo de servicios y tarifas`).
- Rama de publicación: `codex/feat-003-catalog`.
- Push: `origin/codex/feat-003-catalog`, completado el 2026-08-02. No se creó PR ni se desplegó.
- Push: `origin/codex/feat-003-catalog`, completado el 2026-08-02. No se creó PR ni se desplegó.

- Commit de implementación: `d16d85462383ed91f266392d37f2977b01647f7e`
  (`feat(catalog): agregar catálogo de servicios y tarifas`).
- Rama de publicación: `codex/feat-003-catalog`.

## Revisión independiente — Quality Reviewer (2026-08-02)

- Veredicto: **fail**. La feature permanece en `verification`; no está habilitado el
  paso a `publication_review` hasta corregir y verificar el hallazgo bloqueante.
- Trazabilidad: `tasks.md` no tiene tareas abiertas y cada criterio de
  `acceptance.md` referencia las tareas/evidencia correspondientes. Se revisaron
  los cambios locales de catálogo, contrato, migración y pruebas.
- Revisión de implementación: la migración es forward-only, usa `RESTRICT` para
  las referencias y aplica restricciones de zona activa única, ARS, importe
  positivo y no solapamiento de tarifas publicadas. La API limita la vista pública
  a datos comerciales, aplica `ADMIN` a mutaciones y permite sólo lectura a
  `DISPATCHER`; la auditoría guarda únicamente identificadores opacos.
- Comando: `C:\\nvm4w\\nodejs\\pnpm.cmd format:check`.
  Resultado: pass; Prettier informó que todos los archivos coinciden con el estilo.
- Comando: `C:\\nvm4w\\nodejs\\pnpm.cmd lint`.
  Resultado: pass; ESLint terminó sin errores.
- Comando: `C:\\nvm4w\\nodejs\\pnpm.cmd typecheck`.
  Resultado: pass; 14/14 tareas Turbo correctas.
- Comando: `C:\\nvm4w\\nodejs\\pnpm.cmd test:unit`.
  Resultado: **fail**; 15/16 pruebas pasaron. Hallazgo bloqueante
  `QR-003-001`: `scripts/shells.test.mjs`, escenario “cada shell comunica PIGAR y
  preserva el alcance del MVP”, falla porque la página modificada
  `apps/customer-web/app/page.tsx` ya no contiene el texto `PIGAR` requerido por
  la prueba. Es una regresión introducida dentro de la superficie modificada para
  la feature.
- Comando: `C:\\nvm4w\\nodejs\\pnpm.cmd test:integration -- --grep catalog`.
  Resultado: pass; 11/11 pruebas, incluidas resolución de dinero/tarifa, zona
  única, validación y contrato/migración. El intento de la suite de integración
  completa excedió el límite local de 64 segundos sin resultado concluyente; no se
  contabiliza como pass.
- Comando: `C:\\nvm4w\\nodejs\\pnpm.cmd test:security -- --grep catalog`.
  Resultado: pass; 12/12 pruebas, incluidas denegaciones de administración y
  auditoría sanitizada.
- Comando: `C:\\nvm4w\\nodejs\\pnpm.cmd test:e2e`.
  Resultado: pass; 2/2 pruebas. Compose verificó por Nginx la oferta real
  Visita Simple / ARS 50.000, la reinicialización y la superficie de red.
- Limitaciones: no se realizaron commit, push, PR ni despliegue; no se ejecutó una
  publicación. La suite de integración completa debe reintentarse tras corregir
  `QR-003-001` antes de emitir un veredicto positivo.

## Corrección QR-003-001 (2026-08-02)

- Cambio: el título de la página pública vuelve a incluir la marca PIGAR, sin
  modificar el alcance comercial aprobado.
- Comandos: `pnpm format:check`; `pnpm test:unit`; `pnpm test:integration`.
- Resultado: exitoso; formato correcto, 16/16 pruebas unitarias y 16/16 pruebas
  de integración pasaron. El reintento de integración completa eliminó la
  limitación registrada por el reviewer. Pendiente de nuevo veredicto
  independiente.

## Revisión independiente final — Quality Reviewer (2026-08-02)

- Veredicto: **pass**. `QR-003-001` quedó resuelto: el título de
  `apps/customer-web/app/page.tsx` declara nuevamente PIGAR y conserva el texto
  comercial aprobado.
- Comando: `C:\\nvm4w\\nodejs\\pnpm.cmd format:check`.
  Resultado: pass; Prettier no reportó diferencias de formato.
- Comando: `C:\\nvm4w\\nodejs\\pnpm.cmd test:unit`.
  Resultado: pass; 16/16, incluido el escenario de shell que previamente fallaba.
- Comando: `C:\\nvm4w\\nodejs\\pnpm.cmd test:integration`.
  Resultado: pass; 16/16. El resultado elimina la limitación anterior de la suite
  completa de integración.
- Alcance de regresión: la corrección sólo modifica el título de la página pública;
  las verificaciones de lint, typecheck, seguridad focalizada (12/12) y E2E Compose
  (2/2) de la revisión inmediatamente anterior siguen siendo aplicables y pasaron.
- Gate: se aprueba la verificación independiente y la feature puede pasar a
  `publication_review`. La aprobación de publicación sigue pendiente: no se
  realizó commit, push, PR ni despliegue.
