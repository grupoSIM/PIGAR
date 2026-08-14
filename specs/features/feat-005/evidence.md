# Evidencia — feat-005

Estado: `done`; publicación autorizada por el usuario el 2026-08-14.

## Validación documental — 2026-08-12

- Comandos: `node scripts/docs-check.mjs`; `git diff --check`.
- Resultado: exitoso; los artefactos de discovery/especificación y el diff no reportaron errores. No se ejecutó código de producto, ni se publicó o desplegó infraestructura.

| Criterio   | Evidencia requerida antes de cierre                            |
| ---------- | -------------------------------------------------------------- |
| AC-005-001 | TEST-005-001 y TEST-005-003 con salida resumida.               |
| AC-005-002 | TEST-005-001 y TEST-005-002, incluida concurrencia PostgreSQL. |
| AC-005-003 | TEST-005-001 y TEST-005-002 con transiciones negativas.        |
| AC-005-004 | TEST-005-003 y TEST-005-004 con proyección CLIENT.             |
| AC-005-005 | TEST-005-003 y TEST-005-004 sin filtración de datos sensibles. |

## Verificación de implementación — 2026-08-14

- `pnpm format:check`, `pnpm lint`, `pnpm typecheck` y `pnpm build`: exitosos.
- `pnpm test:unit`: 25 pruebas superadas, incluidas las de motor, contrato y servicio de órdenes.
- `node --test scripts/orders.test.mjs`: 3/3 superadas; cubre asignación idempotente, conflicto de versión y proyección CLIENT sin teléfono, motivos ni IDs internos.
- `pnpm test:security`: reintentada con Docker Desktop; el escenario Compose de superficie/red y las comprobaciones de seguridad se ejecutaron con el runtime local autorizado.
- `pnpm test:integration`: ejecutada con Docker Desktop; Compose aplica las migraciones y valida los servicios técnicos. La prueba técnica comprueba en PostgreSQL las cuatro tablas de la feature, el trigger append-only y una carrera simultánea que deja una única orden por solicitud.
- `pnpm test:e2e:frontends`: ambos proyectos Playwright finalizaron con estado `passed`; ADMIN asigna y marca `EN_CAMINO`, y CLIENT consulta la proyección e historial seguro sin teléfono ni motivo.
- `git diff --check`: exitoso.

| Criterio   | Evidencia                                                                            |
| ---------- | ------------------------------------------------------------------------------------ |
| AC-005-001 | `orders.test.mjs`, migración con `technician_active_phone_check`, UI administrativa. |
| AC-005-002 | `orders.test.mjs`, unicidad de orden y reserva idempotente en migración.             |
| AC-005-003 | `orders.test.mjs`, máquina v1, versión optimista e historial append-only.            |
| AC-005-004 | `orders.test.mjs` y E2E frontend: proyección CLIENT mínima y seguimiento.            |
| AC-005-005 | `orders.test.mjs`, `test:security`, autorización por rol y auditoría sanitizada.     |

La aprobación habilita sólo la implementación local; no autoriza commit, push, PR ni despliegue.

## Revisión independiente — 2026-08-14

- Reviewer independiente: `PASS` para habilitar `publication_review`.
- Verificó contrato ADMIN/DISPATCHER, tareas/evidencia, cobertura de seguridad de órdenes, migración y carrera PostgreSQL, y E2E de asignación/hitos/proyección CLIENT.
- Pendiente: autorización de publicación específica para commit, push, PR o despliegue.

## Regresión local de Auth0 — 2026-08-14

- Se corrigió el fallback de secretos de sesión de ambos portales: una variable
  específica vacía ya no anula `AUTH0_SECRET`.
- El modo Compose de pruebas manuales usa explícitamente `--env-file .env` y
  publica sólo cliente `localhost:3000` y administración `localhost:3002`.
- Verificación: `node --test scripts/staging-auth-config.test.mjs` superó; las
  rutas de login cliente y administración respondieron HTTP 307 localmente.

## Regresión de sesión CLIENT — 2026-08-14

- Se incorporó un enlace visible de `Cerrar sesión` para todo CLIENT con sesión
  presente, junto con un enlace de reinicio de acceso si la API informa que la
  sesión ya no autoriza la consulta de solicitudes.
- Prueba de regresión agregada: `CLIENT puede reiniciar el acceso si vence su
sesión` en `apps/customer-web/e2e/home.spec.ts`; verifica ambos enlaces y el
  mensaje de sesión vencida con una respuesta HTTP 401 sintética.
- Verificación ejecutada: `pnpm --filter @pigar/customer-web typecheck` y la
  reconstrucción de Compose local superaron; cliente y administración
  respondieron HTTP 200 en `localhost:3000` y `localhost:3002`.
- La re-ejecución canónica de E2E y la revisión independiente posterior se
  registran en la sección de re-verificación de este documento.

## Regresión de entrega de adjuntos ADMIN — 2026-08-14

- Diagnóstico: los enlaces de adjuntos abiertos desde el puerto local de
  administración omitían Nginx; al redirigirlos a la capa privada, el archivo
  llegaba sin su MIME y el navegador mostraba sus bytes como texto. La
  recreación de servicios también podía dejar Nginx apuntando a una dirección
  interna anterior.
- Corrección: el API devuelve `200`, `Content-Type` detectado e `inline`; el
  enlace local de administración usa la capa privada `localhost:8088`, y
  Compose reinicia Nginx al actualizar sus dependencias.
- Verificación: `pnpm --filter @pigar/admin-web typecheck`, E2E de admin
  (3/3) y `node --test scripts/requests.test.mjs` (7/7) superaron. La
  comprobación manual autorizada mostró el adjunto PNG con `image/png` y
  resolución 562×1015 tras la recreación local.

## UAT local interactiva — 2026-08-14

- Aprobada por el usuario: login CLIENT, consulta de solicitudes e historial,
  administración de técnico, asignación y actualización de hitos, reflejo de
  estados del lado CLIENT y apertura de adjuntos privados desde ADMIN.
- Esta aprobación valida el comportamiento interactivo local. No autoriza
  commit, push, PR ni despliegue, y no reemplaza la repetición de verificaciones
  automatizadas ni la revisión independiente requeridas antes de publicación.

## Re-verificación posterior a hotfixes — 2026-08-14

- Calidad: `pnpm format:check`, `pnpm lint`, `pnpm typecheck` y `pnpm build`
  superaron.
- Dominio e integración: `pnpm test:unit` superó 26/26 y
  `pnpm test:integration` superó 26/26.
- Seguridad y PostgreSQL: se ejecutaron `pnpm test:security`,
  `node --test scripts/e2e-technical.test.mjs` y
  `node --test scripts/orders.test.mjs`; los comandos finalizaron
  exitosamente. El escenario técnico mantiene la verificación Compose de la
  migración, trigger append-only y carrera de orden única.
- E2E frontend: `pnpm test:e2e:frontends` superó; CLIENT 3/3 en el puerto
  aislado `3100` y ADMIN 3/3, incluyendo bandeja segura, reinicio de
  autorización y enlace de entrega privada. Las advertencias de configuración
  Auth0 durante la fixture no afectan el bypass de autenticación exclusivo de
  E2E.
- Documentación: `node scripts/docs-check.mjs` y `git diff --check`
  superaron.

## Revisión independiente posterior a hotfixes — 2026-08-14

- Reviewer independiente: `PASS` para habilitar nuevamente
  `publication_review`.
- Verificó el runner canónico de E2E, CLIENT 3/3 aislado en el puerto 3100,
  ADMIN 3/3 en el puerto 3001, la evidencia de calidad y `git diff --check`.
- Pendiente: autorización explícita de publicación antes de commit, push, PR o
  despliegue.

## Publicación — 2026-08-14

- El usuario autorizó la publicación de feat-005. Alcance: commit y push de
  la rama dedicada; no se autorizó PR ni despliegue.
- Rama publicada: `codex/feat-005-operational-orders`. Propósito: integración
  de feat-005; responsable: Codex; retiro: después de integrar el commit en la
  rama objetivo aprobada.
