# Evidencia — feat-001: Fundaciones técnicas y arquitectura ejecutable

## Resumen de cambios

- TASK-001 completada: Git inicializado localmente, monorepo pnpm/Turborepo, TypeScript estricto, aplicaciones y paquetes base creados.
- La regla automatizada impide dependencias de framework o proveedor en `@pigar/domain`.
- No se habilitó el script nativo opcional de `sharp`; no se usa optimización de imágenes en este incremento.
- TASK-002 completada: shells diferenciados de clientes y administración, con idioma `es-AR`, región principal semántica, encabezado `h1` y foco visible.
- TASK-003 completada: API NestJS/Fastify con `GET /api/health/live` y `GET /api/health/ready`, worker ejecutable y healthchecks/contrato verificables.
- TASK-004 completada: Prisma 7 con adaptador PostgreSQL, migración técnica inicial, notas de avance/reversión y compose local exclusivo para la base de prueba.
- `ready` consulta PostgreSQL: sin `DATABASE_URL` responde 503 con `SERVICE_NOT_READY`; con PostgreSQL migrado responde 200. `live` no depende de la base.
- TASK-005 completada: Compose local con Nginx como única entrada, redes `edge`/`backend`, migración previa al arranque, healthchecks, límites base y volúmenes separados de PostgreSQL y multimedia.
- TASK-006 completada: PoC interna de multimedia por streaming, sin endpoint de producto ni ruta física pública.
- TASK-007 completada: PoC interna de pagos mediante mock contractual; autentica HMAC, consulta una fuente autoritativa, deduplica eventos y concilia intenciones pendientes sin exponer endpoint ni habilitar cobros.
- TASK-008 completada: comandos raíz de calidad para formato, lint, tipos/build y suites unitarias, integración, seguridad y E2E técnica; `--grep` exige una prueba existente y no permite éxitos vacíos.
- TASK-009 completada: configuración tipada para API y worker, validación temprana de entorno/puerto/host, requisitos sensibles de producción y `.env.example` sin valores reales.
- TASK-010 completada: registrador estructurado compartido, correlation ID en healthchecks, logs sanitizados de API/worker y catálogo operativo de alertas sin proveedor externo.
- TASK-011 completada: contrato puro y versionado de estados de orden/pago, tabla de transiciones y pruebas tabulares; la autorización por actor queda aislada para TASK-012.
- TASK-012 completada: matriz de permisos v1, autorización pura de transiciones y pruebas negativas que niegan toda identidad/capacidad al técnico durante el MVP.
- TASK-013 completada: revisión local de red, multimedia, logs, secretos y datos sintéticos; los hallazgos de auditoría remota de dependencias y escaneo/pin por digest de imágenes quedan explícitos y bloquean producción.
- TASK-014 completada: workflow bloqueante de GitHub Actions para calidad y meta-prueba local de regresiones controladas; no incluye secretos ni despliegue.
- TASK-015 completada: registro fechado de capacidad, límites de Compose, cuotas/costes de referencia, cifrado, despliegue, backup y restauración; no se seleccionaron ni contrataron proveedores adicionales.
- TASK-016 completada: contrato OpenAPI sincronizado con healthchecks reales, incluyendo respuesta RFC 7807 y correlation ID; con ello se completa TASK-003.
- TASK-017 completada: matriz de evidencia consolidada, limitaciones actualizadas y paquete de revisión independiente preparado; la feature queda en verificación hasta ejecutar CI remoto y resolver bloqueantes de producción.

## Verificaciones automatizadas

| Fecha | Comando | Resultado | Alcance/notas |
|---|---|---|---|
| 2026-07-23 | `CI=true pnpm install --frozen-lockfile --ignore-scripts` | pass | Instalación reproducible con lockfile; scripts de dependencias deshabilitados. |
| 2026-07-23 | `pnpm test:architecture` | pass | 1 prueba: dominio sin Next, Nest, Fastify ni Prisma. |
| 2026-07-23 | `pnpm typecheck` | pass | 10 workspaces compilados sin errores de tipos. |
| 2026-07-23 | `pnpm build` | pass | 10 workspaces; ambas aplicaciones Next.js generan rutas estáticas `/`. |
| 2026-07-23 | `pnpm format:check && pnpm lint` | pass | Formato y lint del código/configuración introducidos por este incremento. |
| 2026-07-23 | `pnpm test:shells` | pass | 2 pruebas de estructura semántica, foco visible y contenido dentro del alcance MVP. |
| 2026-07-23 | Arranque local temporal + `Invoke-WebRequest` a puertos 3001/3002 | pass | Ambas webs respondieron HTTP 200 y el contenido esperado; procesos detenidos al finalizar. |
| 2026-07-23 | `pnpm test:api` | partial | Healthchecks de API responden 200 y cumplen el esquema; falta degradación ante PostgreSQL de TASK-004. |
| 2026-07-23 | `pnpm test:worker` | pass | Worker inicia y completa un ciclo ocioso; logs solo contienen evento, servicio y timestamp. |
| 2026-07-23 | `pnpm format:check && pnpm lint && pnpm typecheck && pnpm build` | pass | Calidad global posterior a API/worker: 10 workspaces sin errores. |
| 2026-07-24 | `DATABASE_URL=<sintética> pnpm --filter @pigar/api exec prisma migrate dev --name technical_foundations` | pass | Generó y aplicó `20260724153616_technical_foundations` en PostgreSQL local sintético. |
| 2026-07-24 | Reinicio de PostgreSQL local + `prisma migrate deploy` + consulta de tablas + `GET /api/health/ready` | pass | Tras reinicio persistieron las cuatro tablas técnicas; no hubo migraciones pendientes y readiness devolvió HTTP 200. |
| 2026-07-24 | `pnpm format:check && pnpm lint && pnpm test:architecture && pnpm test:api && pnpm typecheck && pnpm build` | pass | Formato, lint, límite arquitectónico, degradación de API, tipos y build de los 10 workspaces. |
| 2026-07-24 | `docker compose -f infra/compose/docker-compose.yml up --build -d` + rutas Nginx + inspección de puertos | pass | Cliente, backoffice y readiness respondieron vía Nginx; únicamente Nginx publicó un puerto del host. |
| 2026-07-24 | Denegación de `/media/*` + marker sintético en volumen + reinicio de PostgreSQL/API | pass | Multimedia física no es pública; PostgreSQL, readiness y volumen compartido se recuperaron tras reinicio. |
| 2026-07-24 | `pnpm lint`, pruebas existentes, typecheck y build; `docker compose ... config --quiet`; `nginx -t` | pass | Calidad de código vigente, sintaxis Compose y configuración Nginx verificadas. |
| 2026-07-24 | `node --test scripts/media-poc.test.mjs` | pass | 3 pruebas: video sintético de 50 MB con heap acotado, checksum/rename atómico y validación de MIME, tamaño, duración, cuota, actor cruzado, interrupción y TTL. |
| 2026-07-24 | Carga sintética interna en contenedor API + consulta Prisma + limpieza | pass | Metadato mínimo `media_poc_object` persistido en PostgreSQL y eliminado junto al objeto físico de prueba. |
| 2026-07-24 | Compose + solicitud externa a `/internal-media/*` + `nginx -t` | pass | Nginx declaró entrega interna y devolvió 404 para acceso externo directo. |
| 2026-07-24 | `pnpm test:payment-poc` | pass | 4 pruebas deterministas: firma inválida no consulta ni aprueba; ocho eventos concurrentes producen una única aplicación; un evento pendiente seguido de uno aprobado no infiere el estado; una intención sin webhook se concilia contra el mock contractual. |
| 2026-07-24 | `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:payment-poc` | pass | Formato, lint, tipos de los 10 workspaces y PoC de pagos superados. |
| 2026-07-24 | `pnpm test:unit` + filtros de `pnpm test:integration` | pass | Suite unitaria y los filtros `health-degraded`, multimedia y pagos ejecutaron los casos identificados; un filtro inexistente finalizó con error controlado. |
| 2026-07-24 | `pnpm test:e2e --grep network-surface` | pass | Compose temporal aislado: cliente, administración y readiness respondieron; `/media` devolvió 404; PostgreSQL/API se reiniciaron y solo Nginx quedó declarado con puerto publicado. |
| 2026-07-24 | `pnpm test --grep config-secrets` | pass | Producción sin `DATABASE_URL`, puerto/intervalo inválidos y `.env.example` sin secretos: los errores solo revelan el nombre de la variable. |
| 2026-07-24 | `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:api && pnpm test:worker` | pass | Formato, lint, tipos de 10 workspaces, healthcheck degradado y worker verificados tras integrar configuración. |
| 2026-07-25 | `pnpm test --grep log-sanitization` + `pnpm test:security --grep log-sanitization` | pass | Logs contienen timestamp UTC, nivel, servicio, entorno, correlation ID, evento, duración y código; se omiten autorización y payloads sintéticos. |
| 2026-07-25 | `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:api && pnpm test:worker` | pass | API propaga `x-request-id` y registra health telemetry; worker emite el mismo contrato estructurado. |
| 2026-07-25 | `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test --grep order-state-machine` | pass | Contrato v1 verifica transiciones permitidas/rechazadas de orden y pago, reasignación versionada con historial y que pago pendiente/rechazado no adelanta la orden. |
| 2026-07-25 | `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:security --grep permission-matrix` | pass | La matriz v1 limita acciones por actor, niega elevación de privilegios y deniega al técnico todas las acciones y transiciones. |
| 2026-07-25 | `pnpm test:security --grep network-surface` | pass | Compose temporal publicó solo Nginx, denegó `/media` y recuperó readiness tras reiniciar PostgreSQL/API. |
| 2026-07-25 | `pnpm test:integration --grep media-invalid` + `pnpm test:security --grep media-cross-access` + `pnpm test:security --grep log-sanitization` | pass | Se verificaron rechazos multimedia, aislamiento cruzado y sanitización de logs; la búsqueda estática no encontró patrones de secretos versionados. |
| 2026-07-25 | `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm test:ci-contract` | pass | Calidad local y meta-prueba de CI superadas; las regresiones controladas de formato, lint, tipos y suites finalizan de forma no exitosa. |
| 2026-07-25 | `pnpm docs:check && pnpm test:ci-contract && pnpm format:check && pnpm lint && pnpm typecheck` | pass | Registro de capacidad/recuperación completo, CI actualizado para verificarlo y calidad estática sin errores. |
| 2026-07-25 | `pnpm test:api` + `pnpm test:integration --grep health-degraded` | pass | Contrato OpenAPI y API real validan liveness 200, readiness 503 sin PostgreSQL, `application/problem+json` y `X-Request-ID`. |
| 2026-07-25 | `pnpm format:check && pnpm lint && pnpm typecheck && pnpm build && pnpm test:unit && pnpm test:integration && pnpm test:security && pnpm test:e2e && pnpm test:api && pnpm test:ci-contract && pnpm docs:check` | pass | Batería final local: build y 10/10 unitarias, 10/10 integración, 13/13 seguridad, 1/1 E2E, 2/2 API y 2/2 contrato CI; Compose temporal se limpió al finalizar. |

## Criterios de aceptación

| Criterio | Evidencia | Resultado |
|---|---|---|
| AC-001 | Build, typecheck y test de límites de dependencias del 2026-07-23 | pass |
| AC-002 | `pnpm test:shells` y verificación HTTP local del 2026-07-23 | pass |
| AC-003 | `pnpm test:api` del 2026-07-25 | pass: contrato OpenAPI y healthchecks de API sincronizados. |
| AC-004 | `pnpm test:integration --grep health-degraded` del 2026-07-25 | pass: liveness permanece 200, readiness devuelve 503 y los errores/logs no filtran configuración sensible. |
| AC-005 | TEST-006 del 2026-07-25 y objeto sintético persistido/reiniciado del 2026-07-24 | pass: volumen y PostgreSQL se preservan y readiness se recupera. |
| AC-006 | `pnpm test:security --grep network-surface` del 2026-07-25 | pass: solo Nginx se publica y multimedia/API/worker/PostgreSQL no son accesibles externamente. |
| AC-007 | PoC multimedia de 50 MB y entrega interna Nginx del 2026-07-24 | pass |
| AC-008 | Casos negativos y denegación cruzada de `media-poc.test.mjs` del 2026-07-24 | pass |
| AC-009 | `pnpm test:payment-poc` del 2026-07-24: firma HMAC, fuente autoritativa y deduplicación concurrente | pass |
| AC-010 | `pnpm test:payment-poc` del 2026-07-24: conciliación de intención pendiente con evento perdido | pass |
| AC-011 | GitHub Actions run `30168736165`, `pnpm format:check && pnpm typecheck && pnpm test:ci-contract` del 2026-07-25 | partial: la primera ejecución remota falló por resolución de tipos de paquetes internos en checkout limpio; se corrigió `typecheck` para compilar dependencias `^build` y se actualizaron acciones a runtimes Node 24. Nueva ejecución remota pendiente. |
| AC-012 | Tests `config-secrets` y `log-sanitization` del 2026-07-24/25 | pass: configuración temprana y logs estructurados/sanitizados verificados. |
| AC-013 | `pnpm test --grep order-state-machine` y `pnpm test:security --grep permission-matrix` del 2026-07-25 | pass: contrato de estados/pago y matriz de permisos verifican combinaciones permitidas, pagos pendientes/rechazados y técnico sin acceso. |
| AC-014 | `pnpm docs:check` del 2026-07-25 y `docs/runbooks/capacity-and-recovery.md` | pass: capacidad, límites, cuotas fechadas, cifrado, despliegue y bloqueantes de backup/restauración documentados. |

## Verificación manual justificada

El navegador integrado no pudo alcanzar los puertos `127.0.0.1` del entorno de ejecución por aislamiento de red. Se sustituyó la inspección visual local por pruebas estructurales y respuestas HTTP del servidor Next.js levantado en el mismo proceso de verificación. La revisión visual en un navegador con acceso al VPS/desarrollo queda pendiente para una futura verificación manual, pero no bloquea este shell estático.

## Seguridad, datos y migraciones

- La migración inicial solo crea soporte técnico: outbox, jobs reclamados, recibos deduplicados de proveedor y metadatos de multimedia PoC.
- No contiene datos personales, domicilios, ubicaciones, URLs firmadas ni payloads externos completos. La URL usada en pruebas fue exclusivamente local y sintética.
- El procedimiento forward/rollback está documentado en `apps/api/prisma/MIGRATIONS.md`; Prisma Migrate no hace rollback automático.
- Toda futura evidencia debe usar datos sintéticos y omitir credenciales, datos personales, rutas privadas y payloads sensibles.
- La PoC de pagos conserva únicamente hashes de identificadores sintéticos en la traza de pruebas; el secreto HMAC es sintético y nunca se registra.
- `.env.example` usa solo valores locales no sensibles; `DATABASE_URL` queda vacío y los validadores no incorporan valores de variables en sus errores.
- El catálogo de alertas se documenta en `docs/runbooks/observability.md`; no se seleccionó ni configuró proveedor externo de monitoreo.

## Limitaciones y deuda aceptada

- Backup externo y restauración completa son obligatorios antes de producción.
- Retención multimedia requiere validación legal.
- El VPS de desarrollo confirmado tiene 2 vCPU, 8 GB RAM, 100 GB de disco y 8 TB de transferencia; el dimensionamiento productivo y los límites finales dependen de mediciones.
- Costes y cuotas de proveedores están fechados como referencias; su aprobación y activación de cuentas continúan pendientes.

## Publicación

- Aprobación: el usuario autorizó el 2026-07-25 crear el repositorio GitHub público `grupoSIM/PIGAR`, realizar el commit inicial y hacer push.
- Repositorio: `https://github.com/grupoSIM/PIGAR` (público, creado sin README, `.gitignore` ni licencia para preservar los artefactos locales).
- Commit y rama: autorizados; publicación inicial prevista en `main`.
- PR/despliegue: no autorizado. Hostinger continúa reservado exclusivamente para testing/staging; producción requiere un entorno y aprobación independientes.

## Correctivo de CI — 2026-07-25

- Diagnóstico remoto: `gh run view 30168736165 --repo grupoSIM/PIGAR --log-failed` identificó que `@pigar/worker` no resolvía `@pigar/config` ni `@pigar/observability` en un checkout limpio; las otras marcas de error eran propagación de ese fallo.
- Corrección: `turbo.json` hace que `typecheck` dependa de `^build`, generando las declaraciones de paquetes internos antes de validarlos.
- Warning Node 20: provenía de los runtimes internos de `actions/checkout@v4`, `actions/setup-node@v4` y `pnpm/action-setup@v4`; el workflow ya ejecutaba PIGAR sobre Node 24. Se actualizaron a `checkout@v7`, `setup-node@v7` y `pnpm/action-setup@v6`, sin habilitar la compatibilidad insegura de Node 20.
- Verificación local: `pnpm format:check && pnpm typecheck && pnpm test:ci-contract` — pass (14/14 tareas de Turbo; 2/2 pruebas de contrato CI).
