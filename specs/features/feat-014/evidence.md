# Evidencia — feat-014: Alineación visual integral con Stitch

- Estado: `done`; implementación, verificación técnica, revisión independiente
  PASS y publicación en staging completadas.
- Esta evidencia cubre discovery, implementación visual, regresión funcional y
  verificaciones reproducibles de feat-014.

## Resumen de cambios de discovery

- Se creó la feature `feat-014` y el contrato documental inicial.
- Se inspeccionaron las 9 pantallas CLIENT, 8 pantallas ADMIN y ambos
  `DESIGN.md`; los 17 `code.html` se trataron sólo como referencia estática.
- Se compararon rutas, JSX, CSS, E2E y el shell compartido actual.
- Se documentaron las funciones posteriores a Stitch que deben conservarse:
  notificaciones, pagos/conformidad, rating/incidencias y acciones operativas.
- La implementación se limitó a shell, tokens y presentación CLIENT/ADMIN; no se
  modificó dependencia, contrato, dato, proveedor ni lógica de negocio.
- El usuario aprobó el discovery, los seis artefactos y DEC-014-001 a
  DEC-014-005 el 2026-09-03. Esta aprobación habilita implementación, no
  publicación.

## Verificaciones de discovery

| Fecha      | Comando/inspección                                                                               | Resultado | Alcance/notas                                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-03 | `rg --files stitch/aplicacion_cliente stitch/backoffice`                                         | passed    | Inventario: 9 `screen.png` CLIENT, 8 ADMIN, 17 `code.html` y 2 `DESIGN.md`.                                                                                         |
| 2026-09-03 | Inspección visual de los 17 `screen.png` con visor local                                         | passed    | Se revisaron layout, color, tipografía, densidad, componentes y contenido no transferible.                                                                          |
| 2026-09-03 | Extracción local de texto visible de los 17 `code.html`                                          | passed    | Confirmó estructuras y contenido inválido: PII ficticia extranjera, contacto/tracking, KPIs, sugerencias y flujos diferidos. No se ejecutó HTML/script.             |
| 2026-09-03 | `rg --files apps/customer-web apps/admin-web packages/ui` + lectura focalizada de JSX/CSS/E2E    | passed    | Inventario actual de rutas, componentes, estilos, estados y pruebas.                                                                                                |
| 2026-09-03 | Búsqueda focalizada de notificaciones, postventa, incidencias, pagos y conformidad               | passed    | Detectó funciones posteriores a feat-013 y ausencia de estilos específicos para varios bloques CLIENT/ADMIN.                                                        |
| 2026-09-03 | Revisión de `feat-013`, `feat-007`, `feat-009`, `feat-010` y `docs/design-review-stitch.md`      | passed    | Límites funcionales y decisiones UI-D01..D03 preservados.                                                                                                           |
| 2026-09-03 | Intento de levantar CLIENT con runtime pnpm integrado                                            | not run   | pnpm solicitó eliminar/reinstalar `node_modules` por diferencia de runtime; se respondió “No” para preservar el worktree. No se declara captura ni prueba.          |
| 2026-09-03 | Prettier parse de `features.yaml`; `--check` sobre `progress/current.yaml` y los seis artefactos | passed    | `features.yaml` parsea como YAML; progress y los Markdown coinciden con el formato Prettier. Dos notas históricas con `:` se entrecomillaron sin cambiar contenido. |
| 2026-09-03 | `node scripts/docs-check.mjs`                                                                    | passed    | La validación documental existente terminó con código 0.                                                                                                            |
| 2026-09-03 | Validación focalizada de existencia y trazabilidad de IDs                                        | passed    | 6 archivos, 10 REQ, 12 AC, 18 TASK y 12 TEST; cada REQ/AC tiene referencias cruzadas requeridas.                                                                    |
| 2026-09-03 | `git diff --check -- features.yaml progress/current.yaml specs/features/feat-014`                | passed    | Sin errores de whitespace en los archivos de feat-014.                                                                                                              |
| 2026-09-03 | Aprobación explícita del usuario en el chat                                                      | passed    | Discovery, especificación y DEC-014-001 a DEC-014-005 aprobadas; habilita implementación y mantiene publicación pendiente.                                          |

## Criterios de aceptación

| Criterio        | Evidencia                                                                                             | Resultado                             |
| --------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------- |
| AC-014-001..012 | Detalle auditable en la sección `Evidencia auditable por criterio`, con comandos y artefactos por AC. | verified; revisión independiente PASS |

## Implementación y verificación técnica

Se consolidaron tokens y patrones locales en `packages/ui`, `apps/customer-web`
y `apps/admin-web`, conservando los contratos y acciones existentes. Se
mantuvieron fuera de alcance las superficies Stitch no soportadas: KPIs,
tracking/ETA, contacto directo, sugerencias, exportación, canales push/SMS,
mapas operativos y portales de operarios.

Los contextos ahora tienen navegación real y URLs separadas: CLIENT expone
`/`, `/requests`, `/requests/new` y `/profile`; ADMIN expone `/admin`,
`/admin/requests` y `/admin/technicians`. El drawer ADMIN gestiona foco inicial,
Escape, ciclo de Tab y restauración del foco al botón de apertura.

| Fecha      | Comando/inspección                                                                                                                                   | Resultado | Resumen seguro                                                                                                                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-03 | `prettier --check` sobre features, progress, specs y archivos CLIENT/ADMIN/UI + `git diff --check`                                                   | passed    | Todos los archivos objetivo usan el formato del repositorio; sin errores de whitespace.                                                                                                                       |
| 2026-09-03 | `eslint` focalizado + `node scripts/shells.test.mjs` + `node scripts/docs-check.mjs` + `node scripts/ci-contract.test.mjs`                           | passed    | Lint sin hallazgos; shells 2/2; contrato CI 3/3; documentación válida.                                                                                                                                        |
| 2026-09-03 | `tsc -p packages/ui/tsconfig.json --noEmit`                                                                                                          | passed    | Typecheck de UI compartida sin errores.                                                                                                                                                                       |
| 2026-09-03 | `next build` en `apps/customer-web` y `apps/admin-web`                                                                                               | passed    | Ambos builds Next.js 16.2.11 compilaron, pasaron TypeScript y generaron sus rutas; sólo warnings esperables de Auth0 sin credenciales locales.                                                                |
| 2026-09-03 | `node scripts/run-test-suite.mjs unit`                                                                                                               | passed    | 52 tests: 52 pass, 0 fail, 0 skipped.                                                                                                                                                                         |
| 2026-09-03 | Playwright CLIENT directo con `PIGAR_E2E_PORT=3100`                                                                                                  | passed    | 8/8 escenarios CLIENT: acceso, contextos, estados, pagos, conformidad, notificaciones, rating e incidencia.                                                                                                   |
| 2026-09-03 | `apps/customer-web/node_modules/.bin/playwright.cmd test --config=playwright.config.ts` con `PIGAR_E2E_PORT=3100`                                    | passed    | Repetición final de la suite CLIENT: 8 tests passed, 0 failed; confirmó navegación por contextos y estados de pago, conformidad y postventa.                                                                  |
| 2026-09-03 | Playwright ADMIN directo contra `http://127.0.0.1:3001`                                                                                              | passed    | 8/8 escenarios ADMIN: bandeja, contextos, drawer/foco, adjuntos, asignación, hitos, cargo e incidencias.                                                                                                      |
| 2026-09-03 | `apps/admin-web/node_modules/.bin/playwright.cmd test --config=playwright.config.ts`                                                                 | passed    | Repetición final de la suite ADMIN: 8 tests passed, 0 failed; confirmó rutas reales y foco inicial, Tab, Escape y restauración del drawer.                                                                    |
| 2026-09-03 | `node scripts/run-test-suite.mjs integration`                                                                                                        | passed    | 57 tests: 55 pass, 0 fail, 2 skipped por diseño. PostgreSQL real disponible mediante Docker Desktop.                                                                                                          |
| 2026-09-03 | Repetición escalada de `node scripts/run-test-suite.mjs integration`                                                                                 | passed    | 57 tests: 55 pass, 0 fail, 2 skipped; confirmó PostgreSQL real y contratos de pagos/órdenes/transiciones.                                                                                                     |
| 2026-09-03 | `node scripts/run-test-suite.mjs security`                                                                                                           | passed    | 70 tests: 68 pass, 0 fail, 2 skipped por diseño.                                                                                                                                                              |
| 2026-09-03 | Repetición escalada de `node scripts/run-test-suite.mjs security`                                                                                    | passed    | 70 tests: 68 pass, 0 fail, 2 skipped; confirmó roles, PII, recursos y superficies permitidas.                                                                                                                 |
| 2026-09-03 | Playwright estructural CLIENT en 360/390/768/1280 y ADMIN en 768/1024/1440/1600                                                                      | passed    | Sin overflow horizontal en los 8 viewports; headings presentes, rutas separadas, controles navegables y 0 recursos visuales remotos.                                                                          |
| 2026-09-03 | Inspección CUA del árbol accesible y estados cargando/error; checklist CSS de foco, touch, drawer/rail y reduced motion + caso Playwright Escape/Tab | passed    | Shells separados, navegación real, foco inicial/ciclo/restauración del drawer, estados semánticos, `aria-live`/`aria-busy` y `prefers-reduced-motion`.                                                        |
| 2026-09-03 | Inspección visual CLIENT/ADMIN junto a `stitch/**/screen.png` + captura sintética en 28 contextos                                                    | passed    | Artefactos `artifacts/feat-014-visual/*.png` (28 capturas en 8 viewports); se alinearon jerarquía, color, cards, stepper, timeline, rail/drawer y densidad; se excluyeron funciones no soportadas por el MVP. |

## Evidencia auditable por criterio

| Criterio   | Pantalla/viewport y artefacto                                                                                | Prueba y resultado                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| AC-014-001 | `artifacts/feat-014-visual/`: CLIENT 360/390/768/1280 y ADMIN 768/1024/1440/1600                             | Tokens locales, Prettier, unit 52/52 y ausencia de recursos remotos; verified.                             |
| AC-014-002 | Acceso/shell CLIENT en 360/390/768/1280; capturas sintéticas completas en `artifacts/feat-014-visual/`       | Build CLIENT, AX tree CUA y estructura Playwright; verified.                                               |
| AC-014-003 | Inicio, Mis solicitudes y Nueva solicitud CLIENT en 360/390/768/1280                                         | E2E CLIENT 8/8 y estados de oferta/domicilio/evidencia; verified.                                          |
| AC-014-004 | Cards/timeline CLIENT y estados de orden                                                                     | E2E CLIENT + security 68/68; PII ajena/contacto/ETA no presentes; verified.                                |
| AC-014-005 | Pago, reintento y conformidad CLIENT                                                                         | E2E CLIENT + integration 55/55; verified.                                                                  |
| AC-014-006 | Notificaciones, rating e incidencias CLIENT                                                                  | E2E CLIENT 8/8 + security 68/68; degradación y allowlists preservadas; verified.                           |
| AC-014-007 | Shell ADMIN drawer/rail en 768/1024/1440/1600; capturas sintéticas completas en `artifacts/feat-014-visual/` | E2E ADMIN 8/8 + estructura Playwright en 768/1024/1440/1600; verified.                                     |
| AC-014-008 | Bandeja/detalle ADMIN, lista densa y estados                                                                 | E2E ADMIN 8/8 + security; sin KPIs, tracking, recomendaciones, exportación ni nueva orden falsa; verified. |
| AC-014-009 | Técnicos/asignación ADMIN en 768/1024/1440/1600                                                              | E2E ADMIN + estructura responsive; asignación manual sin métricas inferidas; verified.                     |
| AC-014-010 | Hitos, resolución, cargo y soporte ADMIN                                                                     | E2E ADMIN + integration/security; acciones y confirmaciones existentes conservadas; verified.              |
| AC-014-011 | Loading/vacío/error/success CLIENT/ADMIN en 8 viewports                                                      | Checker estructural Playwright, AX tree CUA, foco, reduced motion y `aria-live`/`aria-busy`; verified.     |
| AC-014-012 | Capturas sintéticas `artifacts/feat-014-visual/*.png` + README de cobertura y matriz de comandos anterior    | 16 E2E, unit/integration/security, builds, lint, docs y diff-check; verified; Reviewer independiente PASS. |

El comando canónico `pnpm test:e2e:frontends` también se intentó sin alterar el
worktree, pero pnpm abortó antes de ejecutar por la diferencia entre el runtime
declarado y el `node_modules` existente (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`).
Los mismos 16 escenarios se ejecutaron directamente con Playwright contra los
servidores ya levantados, con resultado verde, sin reinstalar dependencias.

## Seguridad, datos y migraciones

Sólo se leyeron fuentes locales y referencias Stitch. No se usaron credenciales,
servicios externos, datos reales o URLs firmadas. No hay API, modelo, migración,
logging, retención o despliegue nuevo.

## Limitaciones y decisiones pendientes

- DEC-014-001 a DEC-014-005 están aprobadas.
- La comparación visual se realizó por inspección CUA contra las referencias
  Stitch; no se incorporó una dependencia ni un umbral pixel-diff no aprobado.
- TEST-014-009 se verificó con checker estructural Playwright, AX tree CUA y una
  medición WCAG local reproducible: 86 elementos CLIENT y 28 ADMIN, 0 fallos,
  mínimos 5.89 y 5.59 respectivamente; no se incorporó una dependencia de axe
  no aprobada.

## Revisiones independientes

- 2026-09-03 — Primera pasada: `FAIL`. Se detectaron inconsistencias
  documentales en `features.yaml`, `acceptance.md` y `evidence.md`; fueron
  corregidas y validadas con `docs-check` y `git diff --check`.
- 2026-09-03 — Segunda pasada: `FAIL`. Se detectó cobertura visual incompleta,
  navegación con destino/activo incorrectos y TEST-014-009 sin medición WCAG.
- 2026-09-03 — Correcciones de segunda pasada aplicadas: se generaron capturas
  sintéticas limpias para CLIENT 360/390/768/1280 y ADMIN 768/1024/1440/1600;
  `ProductShell` ahora recibe el contexto de ruta y marca `aria-current` sólo
  en el destino activo; se ejecutó la medición local de contraste con 0 fallos.
- Nueva revisión independiente: `PASS`, 2026-09-03. Se habilitó
  `publication_review`.

## Publicación

- Aprobación de especificación: usuario, 2026-09-03T09:05:42-03:00.
- Revisión independiente: `PASS`, 2026-09-03; habilitó `publication_review`.
- Autorización humana de publicación: usuario, mensaje «perfecto, publica en staging»,
  2026-09-03.
- Commits publicados en `staging`: `32f116a` y corrección `dcf71a8a72ea521826ed87139d31495cae041aee`.
- CI remoto: [staging quality #33762658191](https://github.com/grupoSIM/PIGAR/actions/runs/33762658191),
  `success`; verify y `publish-staging-images / publish` pasaron.
- Imágenes publicadas: `ghcr.io/gruposim/pigar-app:dcf71a8a72ea521826ed87139d31495cae041aee`
  y `ghcr.io/gruposim/pigar-nginx:dcf71a8a72ea521826ed87139d31495cae041aee`.
- No se creó PR ni se realizó despliegue productivo.

## Correcciones posteriores a la revisión de staging

| Fecha      | Comando/inspección                                                                                             | Resultado | Resumen seguro                                                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-03 | Inspección CUA autenticada de `/admin`, `/admin/requests`, `/admin/technicians`, `/requests/new` y `/requests` | passed    | Confirmó la navegación administrativa ilegible a 1280 px, el stepper y select duplicados, la redirección de notificaciones y los estados/códigos expuestos.          |
| 2026-09-03 | Corrección focalizada en `packages/ui`, `apps/admin-web` y `apps/customer-web`                                 | passed    | Se hicieron visibles las etiquetas ADMIN, se eliminó la duplicación del formulario, se conservó el contexto al leer notificaciones y se agregaron etiquetas humanas. |
| 2026-09-03 | `prettier --check` sobre los archivos modificados + `git diff --check`                                         | passed    | Todos los archivos objetivo usan el formato del repositorio; no se detectaron errores de whitespace.                                                                 |
| 2026-09-03 | `eslint` focalizado sobre CLIENT y ADMIN                                                                       | passed    | Sin hallazgos.                                                                                                                                                       |
| 2026-09-03 | `tsc --noEmit -p apps/customer-web/tsconfig.json` y `tsc --noEmit -p apps/admin-web/tsconfig.json`             | passed    | Ambos typechecks finalizaron con código 0.                                                                                                                           |
| 2026-09-03 | `next build` en `apps/customer-web` y `apps/admin-web`                                                         | passed    | Ambos builds de producción compilaron y generaron rutas; sólo warnings locales de Auth0 sin credenciales.                                                            |
