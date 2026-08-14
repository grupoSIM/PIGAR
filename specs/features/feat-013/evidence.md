# Evidencia — feat-013: Sistema visual y experiencia operativa inicial

## Resumen de cambios

- Se incorporó `ProductShell` reutilizable en `@pigar/ui`: cabecera CLIENT,
  navegación ADMIN semántica y sidebar adaptable.
- Se rediseñaron los flujos existentes de CLIENT y ADMIN sin cambiar contratos,
  reglas de negocio, permisos, datos ni rutas.
- Las tipografías se sirven localmente: Inter y Hanken Grotesk incluyen sus
  archivos de licencia OFL. No se solicita ningún recurso visual remoto.
- Se agregaron estados visibles de carga, vacío, error y sesión; los controles
  interactivos usan el mínimo táctil de 48 px.
- El backoffice ofrece drawer accesible en tablet: el control expone su estado y
  conserva acceso a Bandeja, Técnicos y Solicitudes.

## Verificaciones automatizadas

| Fecha | Comando | Resultado | Alcance/notas |
| --- | --- | --- | --- |
| 2026-08-14 | `docker compose --env-file .env -f infra/compose/docker-compose.yml -f infra/compose/docker-compose.auth0-local.yml build --no-cache` | passed | Instalación reproducible y `pnpm build`: 10/10 tareas exitosas; Next compiló y verificó TypeScript para CLIENT y ADMIN. |
| 2026-08-14 | `node scripts/shells.test.mjs` | passed | 2/2: fuentes locales, mínimo táctil y shell/sidebar esperados. |
| 2026-08-14 | `node scripts/docs-check.mjs` y `node scripts/ci-contract.test.mjs` | passed | Documentación válida y contrato CI 3/3. |
| 2026-08-14 | `pnpm test:unit` (imagen Playwright oficial) | passed | 26/26 pruebas unitarias, incluidas las estáticas de shell. |
| 2026-08-14 | `pnpm test:e2e:frontends` (imagen Playwright oficial) | passed | CLIENT 3/3 y ADMIN 3/3; cubre acceso, sesión expirada, seguimiento, shell y navegación accesible. |
| 2026-08-14 | `pnpm --filter @pigar/admin-web test:e2e` (imagen Playwright oficial) | passed | 3/3 tras el ajuste: a 768 px el drawer abre con teclado/lector y expone Técnicos y Solicitudes. |
| 2026-08-14 | `pnpm test:security` | passed | 39/39. Se repararon sólo los enlaces `node_modules` generados desde el lockfile; la prueba Compose verificó red, persistencia, esquema, trigger y concurrencia. |
| 2026-08-14 | `Invoke-WebRequest` a CLIENT, ADMIN, live y ready | passed | Las cuatro URLs devolvieron HTTP 200 tras recrear los contenedores. |
| 2026-08-14 | Inspección visual local en navegador | passed | CLIENT y ADMIN renderizan el sistema visual; a 768 px el drawer ADMIN abre y expone Técnicos/Solicitudes. Se usaron sólo las sesiones y datos sintéticos locales existentes. |

## Criterios de aceptación

| Criterio | Evidencia | Resultado |
| --- | --- | --- |
| AC-013-001 | Fuentes OFL locales, `shells.test.mjs` y build reproducible | passed |
| AC-013-002 | E2E CLIENT 3/3 y HTTP 200 local | passed |
| AC-013-003 | E2E ADMIN 3/3 y HTTP 200 local | passed |
| AC-013-004 | E2E de sesión expirada y estados visibles | passed |
| AC-013-005 | Seguridad 39/39, E2E, controles de 48 px, roles/etiquetas de navegación y UAT inicial aprobada por el usuario | passed |

## Seguridad, datos y migraciones

No hay cambios de datos, API ni migraciones. Las suites existentes de permisos
y proyección siguen siendo parte de la regresión; esta feature sólo altera la
presentación de los flujos ya autorizados.

## UAT visual y accesible

La UAT humana inicial fue aprobada por el usuario el 2026-08-14. Para una
siguiente iteración visual se conserva la siguiente lista con fixtures sintéticos:

- CLIENT: teclado, foco, zoom 200 %, alta de solicitud, adjunto y seguimiento.
- ADMIN: desktop, laptop y tablet; abrir/cerrar drawer, bandeja, técnicos,
  asignación, hito y adjunto privado.
- Confirmar contraste, mensajes de sesión/error y ausencia de PII de CLIENT.

La inspección visual local de escritorio y tablet también superó. La siguiente
iteración deberá separar secciones conforme a las pantallas de Stitch, sin
alterar este alcance ya aprobado.

## Publicación

- Aprobación: usuario, 2026-08-14; autorizó integrar en `staging` y publicar imágenes de staging.
- Revisión independiente: PASS, 2026-08-14. Sin hallazgos bloqueantes; habilita `publication_review`.
- Commit: pendiente.
- Rama: pendiente.
- PR/despliegue: pendiente.
