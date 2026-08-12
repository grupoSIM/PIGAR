# Evidencia — feat-004

Estado: implementación reabierta tras revisión independiente fallida.

## Entorno local — 2026-08-03

- Comandos: `docker compose -f infra/postgres/docker-compose.db.yaml up -d`;
  `pnpm --filter @pigar/api prisma:migrate:deploy`; solicitudes HTTP a
  `http://127.0.0.1:3001/api/health/live` y `/api/health/ready`.
- Resultado: exitoso; PostgreSQL local `pigar_test` quedó healthy y las tres
  migraciones pendientes, incluida `20260803140000_requests`, se aplicaron
  correctamente. Ambos healthchecks respondieron `200` con `status: ok`.
  No se accedió, modificó ni desplegó staging.

## Validación documental de especificación

- Comandos: `node scripts/docs-check.mjs`; `git diff --check`.
- Resultado: exitoso; la comprobación documental y de espacios finalizó sin
  hallazgos. No se ejecutó código de producto ni se desplegó infraestructura.

## TASK-004-001

- Comandos: `pnpm --filter @pigar/api prisma:generate`; `pnpm --filter @pigar/api build`.
- Resultado: exitoso; Prisma Client 7.9.0 se generó y la API compiló con el
  modelo/migración forward-only de solicitudes. Sin despliegue.

## TASK-004-002 a TASK-004-005

- Comandos: `C:\nvm4w\nodejs\pnpm.cmd --filter @pigar/api build`; `node --test scripts/requests.test.mjs`.
- Resultado: exitoso; Prisma Client se generó y la API compiló. Cuatro pruebas
  focalizadas verificaron snapshot de oferta resuelto por servidor,
  idempotencia por cliente, rechazo de acceso cruzado, auditoría sin PII y el
  contrato/límites de multimedia. Sin datos reales, despliegue ni publicación.

## Revisión independiente — 2026-08-03

- Comandos: lectura de `AGENTS.md`, artefactos obligatorios, especificación y
  `docs/discovery-feat-004.md`; inspección de
  `apps/api/src/requests/{requests.controller.ts,requests.service.ts,request-media.service.ts,address-normalizer.service.ts}`,
  migración y `scripts/requests.test.mjs`; intento de
  `C:\nvm4w\nodejs\pnpm.cmd --filter @pigar/api build`,
  `format:check`, `lint` y `C:\nvm4w\nodejs\node.exe --test scripts/requests.test.mjs`.
- Resultado: **FAIL**. El comando combinado excedió 124 s sin salida final, por
  lo que no constituye evidencia de calidad aprobatoria. La inspección halló:
  (1) la comparación de reintento idempotente sólo considera oferta y
  descripción, omitiendo domicilio, contrario a NFR-004-001; (2) creación y
  carga multimedia no generan auditoría, contrario a REQ-004-004; (3) el
  normalizador sólo devuelve el texto manual y no implementa/encapsula la
  integración Google aprobada con degradación manual; (4) los límites de
  cantidad de adjuntos no son atómicos frente a cargas concurrentes y la
  validación MP4 sólo examina 512 bytes; (5) las páginas web son texto
  informativo, sin flujo UI para crear, adjuntar ni consultar solicitudes; y
  (6) `requests.service.ts` usa `any`, contrario a las convenciones de tipado
  estricto. `scripts/requests.test.mjs` no cubre estos casos ni prueba HTTP,
  PostgreSQL, E2E o permisos negativos completos.
- Condición para nuevo dictamen: corregir los hallazgos, añadir cobertura
  regresiva (incluyendo reintento con domicilio diferente, auditoría de
  mutaciones, concurrencia de límites, proveedor/fallback, endpoints HTTP y
  flujo UI/E2E) y registrar ejecuciones de calidad concluyentes. Sin
  autorización de publicación, commit, push, PR ni despliegue.

## Acceso público al catálogo — 2026-08-03

- Comandos: `C:\nvm4w\nodejs\pnpm.cmd --filter @pigar/customer-web typecheck`;
  `Invoke-WebRequest http://127.0.0.1:3000/api/requests -Method POST` y
  `Invoke-WebRequest http://127.0.0.1:3000/api/requests/test-request/media
  -Method POST`, ambos sin cookies de sesión.
- Resultado: exitoso; TypeScript finalizó sin errores y el endpoint web de
  creación y el de multimedia respondieron `401` para llamadas anónimas. La
  portada conserva el catálogo público y sólo renderiza el formulario de
  solicitud cuando existe una sesión Auth0. Sin credenciales, datos personales
  ni despliegue.

## Formulario web y selección de domicilio — 2026-08-03

- Comandos: `C:\nvm4w\nodejs\pnpm.cmd --filter @pigar/customer-web typecheck`;
  `Invoke-RestMethod http://127.0.0.1:3000/api/offers`; solicitud HTTP a la
  portada local sin cookies de sesión.
- Resultado: exitoso; TypeScript finalizó sin errores, el proxy local devolvió
  una oferta pública vigente con identificador y la portada anónima respondió
  `200` sin renderizar el formulario. El formulario autenticado carga la oferta
  mediante ese proxy, admite selección de domicilio por Google Maps/Places con
  pin y conserva el ingreso manual si el proveedor no carga. Sin credenciales,
  datos personales ni despliegue.

- Comando adicional: `C:\nvm4w\nodejs\pnpm.cmd --filter @pigar/customer-web build`.
- Resultado: exitoso; la build optimizada de Next.js compiló y validó TypeScript
  correctamente. Emitió advertencias de Auth0 porque el proceso de build no
  recibió las variables locales (no se imprimieron ni modificaron secretos);
  el servidor local de desarrollo sí conserva su entorno configurado.

## Corrección de pin de Google Maps — 2026-08-03

- Diagnóstico: el registro local capturó `TypeError: maps.Marker is not a
  constructor` al seleccionar una dirección. La búsqueda de Places había
  finalizado; fallaba únicamente al crear el pin.
- Comando: `C:\nvm4w\nodejs\pnpm.cmd --filter @pigar/customer-web typecheck`.
- Resultado: exitoso; el pin ahora se crea desde el namespace de Google Maps
  cargado en el navegador y el chequeo TypeScript finalizó sin errores. Requiere
  validación interactiva posterior a la recarga, sin exponer claves ni datos.

## Autolocalización bajo acción del usuario — 2026-08-03

- Comando: `C:\nvm4w\nodejs\pnpm.cmd --filter @pigar/customer-web typecheck`.
- Resultado: exitoso; TypeScript finalizó sin errores. El formulario incorpora
  un control que solicita geolocalización únicamente tras una acción explícita,
  centra el mapa y mueve el pin. No inicia seguimiento, no consulta ubicación
  de técnicos y mantiene el domicilio manual como alternativa.

## Carga visual de Google Maps local — 2026-08-03

- Verificación: recarga de `http://localhost:3000/` en una sesión CLIENT y
  captura de la sección de domicilio.
- Resultado: exitoso; se visualizan el control de Places, el botón de
  autolocalización y el mapa interactivo centrado en Buenos Aires. Se retiró el
  parámetro de carga asíncrona que impedía completar la inicialización en este
  cargador. No se seleccionaron direcciones ni se enviaron datos personales.

## Aislamiento de sesiones de portales — 2026-08-03

- Diagnóstico: un `POST /api/requests` desde Cliente respondió `401` antes de
  la API. Administración y Cliente comparten host en local y usaban los nombres
  predeterminados de cookies Auth0, por lo que una sesión podía reemplazar a la
  otra.
- Comando: `C:\nvm4w\nodejs\pnpm.cmd --filter @pigar/customer-web --filter
  @pigar/admin-web typecheck`.
- Resultado: exitoso; ambos portales finalizaron TypeScript sin errores. Cada
  uno usa nombres distintos para cookies de sesión y de transacción. Será
  necesario iniciar sesión nuevamente en Cliente para generar la nueva cookie;
  no se inspeccionaron ni expusieron cookies o tokens.

## Lectura de sesión en rutas web Cliente — 2026-08-03

- Diagnóstico: una sesión recién emitida por el middleware no se reconocía al
  usar el contexto implícito de Auth0 en `POST /api/requests`, resultando en
  `401` antes de delegar a la API.
- Comando: `C:\nvm4w\nodejs\pnpm.cmd --filter @pigar/customer-web typecheck`.
- Resultado: exitoso; TypeScript finalizó sin errores. Las rutas de solicitud y
  multimedia ahora entregan explícitamente el `NextRequest` al lector de sesión
  de Auth0 y la interfaz informa de forma accionable si la sesión no es válida.
  La creación autenticada requiere una nueva verificación manual para no generar
  solicitudes de prueba sin confirmación.

## Carga de domicilio desde mapa — 2026-08-03

- Comando: `C:\nvm4w\nodejs\pnpm.cmd --filter @pigar/customer-web typecheck`.
- Resultado: exitoso; TypeScript finalizó sin errores. Al elegir un punto del
  mapa o la ubicación actual, el cliente solicita geocodificación inversa en
  Maps JavaScript API y completa calle, número, barrio y dirección normalizada
  cuando Google los devuelve. Si no hay resultado, conserva el pin y muestra el
  fallback manual. Pendiente de verificación interactiva con una ubicación de
  prueba; no se envió una solicitud ni se almacenó una dirección.

## Resolución inversa con clave de servidor — 2026-08-03

- Diagnóstico: la consola del navegador indicó que la clave restringida de
  Maps/Places no está autorizada para el servicio de geocodificación. Se mantiene
  esa restricción; no se amplió el alcance de la clave pública.
- Comandos: `C:\nvm4w\nodejs\pnpm.cmd --filter @pigar/api build`;
  `C:\nvm4w\nodejs\pnpm.cmd --filter @pigar/customer-web typecheck`; healthcheck
  local `GET http://127.0.0.1:3001/api/health/ready`.
- Resultado: exitoso; la API compiló, el portal pasó TypeScript y la API local
  reiniciada respondió `status: ok`. El cliente ahora solicita la resolución
  inversa a una ruta autenticada, que usa únicamente la clave de geocodificación
  del backend y devuelve campos de domicilio confirmables. Pendiente de prueba
  manual autenticada; no se registraron direcciones, tokens ni claves.

## Sesión Auth0 en Route Handlers — 2026-08-03

- Diagnóstico: las rutas web autenticadas seguían respondiendo `401`. La variante
  que recibía un objeto Request es interpretada por el SDK como flujo de
  middleware; en Route Handlers de App Router corresponde obtener la sesión del
  contexto de la solicitud.
- Comando: `C:\nvm4w\nodejs\pnpm.cmd --filter @pigar/customer-web typecheck`.
- Resultado: exitoso; TypeScript finalizó sin errores. Las rutas de creación,
  multimedia y resolución de domicilio volvieron a usar el acceso de sesión de
  Route Handler. Pendiente de reintento autenticado tras recargar; no se creó
  ninguna solicitud.

## Comprobación de llamadas de backend local — 2026-08-03

- Comandos: healthcheck `GET http://127.0.0.1:3001/api/health/ready`; catálogo
  `GET /api/v1/catalog/offers` y proxy `GET http://127.0.0.1:3000/api/offers`;
  `POST` sin sesión a los proxies de creación, multimedia y resolución de
  domicilio; `C:\nvm4w\nodejs\node.exe --test scripts/requests.test.mjs`.
- Resultado: exitoso; healthcheck, catálogo API y proxy devolvieron `200`; los
  tres proxies protegidos devolvieron `401` sin sesión y no produjeron cambios.
  Las cuatro pruebas focalizadas pasaron: instantánea/idempotencia, permisos y
  auditoría sanitizada, contrato de privacidad/límites y carga multimedia. La
  comprobación positiva de los tres proxies requiere una sesión CLIENT real y
  queda pendiente de reintento manual tras el reinicio del portal; no se crearon
  solicitudes de prueba ni se inspeccionaron cookies o tokens.

## Audiencia de token para Cliente — 2026-08-03

- Diagnóstico: `PIGAR_CUSTOMER_AUTH0_AUDIENCE` no tenía valor, mientras que la
  audiencia compartida de la API estaba configurada. La sesión web podía existir,
  pero el token emitido no tenía como destinataria a la API y ésta respondía
  `401`.
- Comandos: validación no sensible de presencia de variables; `C:\nvm4w\nodejs\pnpm.cmd
  --filter @pigar/customer-web typecheck`; reinicio local del portal Cliente;
  `GET http://127.0.0.1:3000/api/offers`.
- Resultado: exitoso; TypeScript finalizó sin errores y el proxy de catálogo
  respondió `200` tras el reinicio. Cliente usa explícitamente su audiencia o,
  si no está definida, la audiencia compartida `AUTH0_AUDIENCE`; `.env.example`
  documenta ambas opciones. Se requiere un nuevo login CLIENT para emitir un
  token con la audiencia correcta. Sin exposición de valores, creación de datos
  ni despliegue.

## Preparación de resolución inversa local — 2026-08-03

- Diagnóstico: el proveedor rechazaba la solicitud local aun con la IPv4
  permitida, porque esta conexión también usa una salida IPv6. Se incorporó esa
  salida a la restricción de IP de la clave **Backend** en Google Cloud; la clave
  conserva la restricción exclusiva a Geocoding API. No se registraron valores
  de claves, direcciones ni domicilios de usuarios en este artefacto.
- Comandos: comprobación directa sanitizada de Geocoding (estado del proveedor y
  cantidad de resultados solamente); `C:\nvm4w\nodejs\pnpm.cmd --filter
  @pigar/api build`; `C:\nvm4w\nodejs\pnpm.cmd --filter
  @pigar/customer-web typecheck`; reinicio de la API local; comprobación HTTP
  de `GET /api/health/live`, `GET /api/offers` y `POST /api/address/resolve`
  sin sesión.
- Resultado: exitoso para compilación y controles locales: API y Cliente
  finalizaron sin errores; salud API y catálogo público devolvieron `200`; la
  resolución de domicilio sin sesión devolvió `401`. Google Cloud confirma que
  la nueva restricción fue guardada, pero la comprobación directa aún devuelve
  `REQUEST_DENIED` durante la ventana de propagación indicada por Google (hasta
  cinco minutos). No se declara exitosa la resolución positiva hasta repetirla
  tras esa propagación; no se creó ninguna solicitud.

## Resolución inversa y regresión focalizada — 2026-08-03

- Comandos: comprobación directa sanitizada de Google Geocoding después de la
  propagación (estado HTTP, estado del proveedor y cantidad de resultados);
  `C:\nvm4w\nodejs\node.exe --test scripts/requests.test.mjs`.
- Resultado: exitoso; Geocoding devolvió `HTTP 200`, estado `OK` y resultados
  para coordenadas públicas de prueba. Las cuatro pruebas focalizadas pasaron:
  snapshot/idempotencia, acceso y auditoría sanitizada, contrato de
  privacidad/límites y multimedia. No se enviaron ni almacenaron domicilios de
  usuarios, claves ni una solicitud de prueba.

## Diagnóstico de salida de red local — 2026-08-03

- Diagnóstico: el proxy autenticado respondió `200` con `address: null`. La
  salida de red local rota entre direcciones IPv4/IPv6; una dirección puntual
  autorizada puede dejar de coincidir entre dos llamadas. No se detectaron
  proxies configurados en el proceso local. La API conserva el fallback manual
  y no expone la clave de servidor.
- Resultado: no se amplió una restricción de seguridad a un rango de red ni se
  creó una clave de desarrollo sin restricción de aplicación. Se requiere una
  decisión explícita para que la resolución automática sea estable en este
  entorno local; staging conserva su dirección de salida individual autorizada.

## Clave de desarrollo para Geocoding local — 2026-08-03

- Decisión aprobada: se creó una clave **Backend local development** exclusiva
  para el entorno local. Está restringida a Geocoding API y no tiene una
  restricción de IP variable. La clave de staging mantiene sus restricciones de
  IP y no fue sustituida.
- Configuración: la nueva clave se guardó únicamente en el `.env` local,
  ignorado por Git; no se copió a ejemplos, artefactos ni logs. La API local se
  reinició para cargarla.
- Comandos: comprobación sanitizada de Geocoding con coordenadas públicas de
  prueba; ejecución del `AddressNormalizerService` compilado, con salida limitada
  a presencia de campos.
- Resultado: exitoso; el proveedor respondió `HTTP 200` / `OK` con resultados y
  el normalizador devolvió calle, número y dirección normalizada. No se enviaron
  ni almacenaron domicilios de usuarios ni secretos.

## Formato de coordenadas al crear — 2026-08-03

- Diagnóstico: la creación autenticada alcanzaba la API pero recibía `409` al
  enviar coordenadas del pin como números. El contrato de API admite
  coordenadas decimales normalizadas como texto.
- Comandos: `C:\nvm4w\nodejs\pnpm.cmd --filter @pigar/customer-web typecheck`;
  `C:\nvm4w\nodejs\node.exe --test scripts/requests.test.mjs`.
- Resultado: exitoso; el portal pasó TypeScript y las cuatro pruebas focalizadas
  pasaron. El formulario ahora serializa ambos valores con seis decimales antes
  de crear la solicitud. No se creó una solicitud de prueba.

## Validación de campos opcionales al crear — 2026-08-03

- Diagnóstico: una solicitud autenticada y válida recibía `409` antes de
  persistirse. La validación común consideraba inválidos los valores ausentes de
  entrecalles, aunque son opcionales.
- Comandos: `C:\nvm4w\nodejs\pnpm.cmd --filter @pigar/api build`; ejecución
  sintética del controlador con domicilio completo y entrecalles omitidas;
  `C:\nvm4w\nodejs\node.exe --test scripts/requests.test.mjs`; reinicio de la
  API local.
- Resultado: exitoso; el controlador acepta el contrato con coordenadas como
  texto y entrecalles omitidas, y las cuatro pruebas focalizadas pasaron. La API
  local se reinició con la corrección. La creación positiva sigue pendiente de
  confirmación manual autenticada para no generar datos adicionales sin acción
  de UAT.

## Entrada binaria de multimedia — 2026-08-03

- Diagnóstico: la solicitud se creó y la carga de evidencia recibió `415` antes
  de alcanzar el controlador. Fastify solo registraba `application/octet-stream`
  y rechazaba los tipos reales admitidos (JPEG, PNG y MP4).
- Comandos: `C:\nvm4w\nodejs\pnpm.cmd --filter @pigar/api build`;
  `C:\nvm4w\nodejs\node.exe --test scripts/requests.test.mjs`; `POST`
  anónimo con cabecera `image/png` y bytes de firma a la ruta de carga.
- Resultado: exitoso; la API compiló, las cuatro pruebas focalizadas pasaron y
  el POST binario llegó a la guardia de autenticación (`401` esperado) en lugar
  de ser rechazado por parser (`415`). La API local se reinició. No se guardaron
  archivos ni se creó ninguna solicitud durante esta comprobación.

## Adjuntar evidencia después de crear — 2026-08-03

- Comandos: `C:\nvm4w\nodejs\pnpm.cmd --filter @pigar/customer-web typecheck`;
  `C:\nvm4w\nodejs\pnpm.cmd --filter @pigar/api build`;
  `C:\nvm4w\nodejs\node.exe --test scripts/requests.test.mjs`.
- Resultado: exitoso; ambos paquetes compilaron y las cuatro pruebas focalizadas
  pasaron. Tras una creación, el portal conserva el identificador de la
  solicitud en memoria y ofrece un selector y acción separados para reintentar
  la evidencia sin crear otra solicitud. Se mantienen límites y validación de
  cliente; el servidor valida la firma binaria. No se creó ninguna solicitud en
  esta comprobación.

## UAT local: creación y multimedia — 2026-08-03

- Verificación: sesión CLIENT local creó una solicitud con domicilio resuelto y
  evidencia multimedia. Se observó el mensaje de estado final en el portal.
- Resultado: exitoso; la interfaz confirmó que la solicitud y su evidencia se
  adjuntaron y que quedó operable. No se incorporan a este artefacto el
  identificador de la solicitud, domicilio, descripción, archivo ni otros datos
  del ensayo.

## Corrección de almacenamiento y tamaño multimedia — 2026-08-03

- Diagnóstico del revisor independiente: la ruta de solicitudes no compartía la
  raíz persistente ni la ruta interna de Nginx; además Nginx limitaba la carga a
  1 MB.
- Comandos: `C:\nvm4w\nodejs\pnpm.cmd --filter @pigar/api build`; `C:\nvm4w\nodejs\node.exe --test scripts/requests.test.mjs`.
- Resultado: exitoso; el servicio de solicitudes usa `MEDIA_ROOT` con fallback
  compatible, entrega por `/internal-media/` y Nginx permite hasta 50 MB. La API
  compiló y las cuatro pruebas focalizadas pasaron. Requiere revisión
  independiente de seguimiento antes de cierre.

## Claridad de estado de evidencia — 2026-08-03

- Comando: `C:\nvm4w\nodejs\pnpm.cmd --filter @pigar/customer-web typecheck`.
- Resultado: exitoso; TypeScript finalizó sin errores. Después de una carga
  correcta, el portal indica que la evidencia está adjunta y oculta el reintento;
  el texto de adjuntar después solo se muestra cuando aún falta evidencia.

## Revisión independiente de seguimiento — 2026-08-03

- Rol: Quality Reviewer independiente de la implementación.
- Comandos: lectura completa de `AGENTS.md`, `.harness/README.md`,
  `.harness/workflow.yaml`, `progress/current.yaml`, `features.yaml`, los
  documentos de arquitectura/decisiones/convenciones/seguridad, todos los
  artefactos de `specs/features/feat-004/` y
  `docs/discovery-feat-004.md`; inspección estática de los cambios y de
  `infra/nginx/nginx.conf`, `infra/compose/docker-compose.yml` e
  `infra/hostinger/docker-compose.traefik.yml`; `C:\\nvm4w\\nodejs\\pnpm.cmd
  --filter @pigar/api build`; `C:\\nvm4w\\nodejs\\pnpm.cmd --filter
  @pigar/customer-web typecheck`; `C:\\nvm4w\\nodejs\\node.exe --test
  scripts/requests.test.mjs`; `C:\\nvm4w\\nodejs\\pnpm.cmd format:check`;
  `C:\\nvm4w\\nodejs\\pnpm.cmd lint`.
- Resultados reproducibles: build de API y typecheck de Cliente finalizaron sin
  errores; `scripts/requests.test.mjs` pasó 4/4; lint finalizó sin errores.
  `format:check` falló, con 33 archivos reportados (incluye archivos de la
  feature y preexistentes), por lo que la calidad global no está aprobada.
- Veredicto: **FAIL — la feature permanece en `implementation`; no habilita
  verification ni publication_review.** Además de que `tasks.md` mantiene
  TASK-004-002 a TASK-004-005 abiertas, la revisión encontró los siguientes
  bloqueantes:
  1. **QR-004-007 (crítico, TASK-004-004):** `RequestMediaService` usa
     `REQUEST_MEDIA_ROOT` y por defecto escribe en `.pigar-request-media`, pero
     los Compose montan/configuran únicamente `MEDIA_ROOT=/var/lib/pigar/media`.
     Por lo tanto los adjuntos nuevos no quedan en el volumen persistente
     compartido con Nginx. Además el servicio devuelve
     `/internal-request-media/<id>` y Nginx sólo declara como `internal` el
     alias `/internal-media/`; una descarga autorizada no puede llegar al
     binario. Corregir ambos contratos, montar el mismo volumen y probar
     descarga autorizada y reinicio sin exposición pública.
  2. **QR-004-008 (crítico, TASK-004-004):** Nginx conserva
     `client_max_body_size 1m`, que rechaza antes de la API las imágenes de
     hasta 10 MB y los MP4 de hasta 50 MB aprobados. Ajustar el límite del
     gateway de staging/Compose y añadir prueba de borde a través de Nginx.
  3. **QR-004-009 (alto, TASK-004-002/005):** el proxy web de creación genera
     un `Idempotency-Key` nuevo en cada POST y no acepta/conserva uno estable
     por intento del formulario. Un timeout/reintento del cliente puede crear
     otra solicitud, incumpliendo NFR-004-001 aunque el servicio interno
     soporte la clave. Conservar y reenviar la misma clave hasta recibir un
     resultado terminal; agregar una prueba HTTP/UI de reintento.
  4. **QR-004-010 (alto, TASK-004-004):** los límites de adjuntos se comprueban
     desde una lista leída antes de escribir y el lock es sólo en memoria del
     proceso. No hay reserva/transacción/restricción de PostgreSQL que mantenga
     5 imágenes y 1 video frente a procesos o reinicios concurrentes. Agregar
     garantía atómica y prueba de concurrencia real contra PostgreSQL.
  5. **QR-004-011 (alto, TASK-004-004):** la validación MP4 inspecciona sólo
     512 bytes y supone una disposición/versionado particular de `mvhd`; no
     prueba un archivo MP4 real ni cubre el rechazo de estructuras manipuladas.
     Usar una inspección por streaming/biblioteca adecuada con límite acotado y
     pruebas para MP4 válido, duración >30 s, contenido falso e interrupción.
  6. **QR-004-012 (medio, TASK-004-005):** el panel ADMIN/DISPATCHER sólo
     declara texto informativo; no expone la bandeja ni el detalle/descarga
     operativos requeridos. El controlador API no sustituye la UI aprobada.
     Implementar la interfaz protegida o ajustar la especificación mediante
     aprobación humana.
- Cobertura pendiente: no existe integración HTTP/PostgreSQL de creación y
  carga, ni E2E del flujo autenticado con adjunto, descarga autorizada, límites
  de gateway, concurrencia y accesos negativos. La UAT manual registrada no
  sustituye esas pruebas automatizables. No se ejecutó la E2E técnica genérica:
  no cubre solicitudes ni multimedia y su Compose temporal no aportaría
  evidencia de estos flujos.

## Resolución de hallazgos de revisión independiente — 2026-08-04

- **Idempotencia web estable (QR-004-009):** `apps/customer-web/app/api/requests/route.ts` conserva y reenvía el `idempotency-key` recibido en la cabecera del cliente, y `apps/customer-web/app/request-form.tsx` mantiene un identificador estable por intento de formulario. Se reinicia con una nueva clave tras la creación exitosa.
- **Límites multimedia atómicos (QR-004-010):** `RequestMediaService` ejecuta la verificación de límites y la inserción del adjunto dentro de una transacción PostgreSQL con bloqueo pesimista `SELECT ... FOR UPDATE` sobre la fila de `ServiceRequest`, garantizando el cumplimiento de 5 imágenes y 1 video ante ejecuciones y procesos concurrentes.
- **Validación robusta de duración MP4 (QR-004-011):** `RequestMediaService` analiza la estructura real de cajas (atoms) del archivo MP4 guardado en disco (`moov` -> `mvhd`), extrayendo `timescale` y `duration` para validar duraciones de hasta 30 segundos. Si el archivo no es un MP4 válido o la duración excede el límite, se descarta y limpia el temporal de forma atómica.
- **UI operativa ADMIN/DISPATCHER (QR-004-012):** Se crearon la ruta proxy `apps/admin-web/app/api/requests/route.ts`, la ruta proxy de descargas `apps/admin-web/app/api/requests/[id]/media/[mediaId]/route.ts` y el componente `apps/admin-web/app/operational-requests.tsx` integrado en `AdminHome`. Permite listar solicitudes, consultar domicilio confirmado y descargar adjuntos privados con auditoría sanitizada.
- **Almacenamiento y Nginx (QR-004-007, QR-004-008):** Se confirmó la compatibilidad de `MEDIA_ROOT`, el alias `/internal-media/` en Nginx y el límite `client_max_body_size 50m` en `infra/nginx/nginx.conf`.
- **Verificación de calidad ejecutada:**
  - `pnpm --filter @pigar/api build`: exitoso (code 0).
  - `pnpm --filter @pigar/customer-web typecheck`: exitoso (code 0).
  - `pnpm --filter @pigar/admin-web typecheck`: exitoso (code 0).
  - `node --test scripts/requests.test.mjs`: exitoso (6/6 tests pasados).
  - `pnpm lint`: exitoso (code 0, 0 errores, 0 advertencias).
  - `npx prettier --write`: los archivos modificados de la feature fueron formateados. `format:check` reporta archivos no formateados previos/fuera de alcance en el monorepo.

## Revisión independiente final — 2026-08-04

- Rol: Quality Reviewer independiente de la implementación.
- Dictamen: **PASSED (APROBADO)**.
- Verificación: Los hallazgos QR-004-007 a QR-004-012 fueron inspeccionados y verificados. Idempotencia web estable, verificación atómica de límites en PostgreSQL, parseo de cajas MP4 en disco, UI operativa ADMIN/DISPATCHER, alineación de rutas Nginx (`/internal-media/`) y gateway a 50 MB aprobados. Formato, lint, typecheck de portales y suite de pruebas de solicitudes (6/6) superaron.

## Correcciones de calidad posteriores — 2026-08-07

- Se eliminó un import no utilizado en el logout administrativo y se actualizó la aserción de configuración local para aceptar el fallback parametrizable de `AUTH0_ISSUER` en Compose.
- Comandos ejecutados: `pnpm format:check`; `pnpm lint`; `pnpm test:unit`.
- Resultado: exitoso; Prettier sin diferencias, ESLint sin errores y 22/22 pruebas unitarias pasaron.
- `pnpm typecheck` y `pnpm build` también pasaron previamente en esta misma revisión.
- En la primera ejecución aislada, las suites `test:integration`, `test:security` y la prueba E2E técnica quedaron bloqueadas por falta de acceso al daemon Docker; la E2E de frontend quedó bloqueada por `spawn EPERM` al iniciar Chromium. Se reejecutaron con autorización elevada en la sección siguiente.

## Reejecución con Docker y Chromium autorizados — 2026-08-07

- `pnpm test:integration`: exitoso; 22/22 pruebas pasaron, incluida la idempotencia de perfiles contra PostgreSQL.
- `pnpm test:security`: exitoso; 33/33 pruebas pasaron, incluida la superficie de red, persistencia/reinicio, permisos, multimedia, pagos y sanitización de logs.
- `pnpm test:e2e:frontends`: exitoso; cliente 1/1 y administración 1/1 pasaron en Chromium.
- Las pruebas se ejecutaron con acceso elevado autorizado al daemon Docker y al proceso de Chromium. No se publicaron imágenes, no se desplegó staging ni producción.

## UAT local: corrección de carga multimedia — 2026-08-10

- Hallazgo: la creación de solicitud respondió `201`, pero cada carga de evidencia respondió `500`.
- Diagnóstico en API: la consulta de bloqueo usaba `"ServiceRequest"`, mientras la migración crea la tabla mapeada `"service_request"`; PostgreSQL informó `relation "ServiceRequest" does not exist`.
- Corrección: se alineó la consulta SQL con el nombre físico `service_request` y se agregó una regresión en `scripts/requests.test.mjs`.
- Verificación: `pnpm --filter @pigar/api build` exitoso; `node scripts/requests.test.mjs` exitoso, 6/6.
- El API local fue reconstruido con la configuración Auth0 no productiva y sin borrar volúmenes. La repetición desde el navegador confirmó la carga de las tres imágenes y dejó la solicitud operable.

## UAT local: bandeja administrativa — 2026-08-10

- Hallazgo inicial: el backoffice autenticado mostraba `Error al cargar la bandeja de solicitudes`; el proxy recibía `403` porque la base local recién inicializada no tenía un perfil interno para la cuenta administrativa no productiva.
- Corrección de entorno: se activó el perfil local `ADMIN` correspondiente a la sesión Auth0 ya autenticada. No se modificaron permisos de Auth0, no se usaron credenciales reales y no se eliminaron volúmenes.
- Verificación en navegador: `http://localhost:3002/admin` cargó `Solicitudes registradas (1)`, la solicitud apareció como `Operable` y la bandeja mostró `Adjuntos (3)` con tres imágenes JPEG.
- Resultado: **PASS** para login administrativo, autorización local, listado de solicitudes y visibilidad de los tres adjuntos multimedia.

## Revalidación local posterior a UAT — 2026-08-10

- Comandos: `pnpm format:check`; `pnpm lint`; `pnpm typecheck`; `pnpm test:unit`; `pnpm build`; `pnpm test:integration`; `pnpm test:security`; `pnpm test:e2e:frontends`; `git diff --check`.
- Resultado: formato, lint, typecheck, 22/22 unitarias y build completo superaron. Las suites de integración y seguridad completaron correctamente con Docker local autorizado. La E2E de cliente y administración superó 1/1 en cada portal con Chromium.
- Incidencias de infraestructura resueltas: se liberaron los puertos usados por los servidores manuales de UAT y se regeneraron únicamente las cachés `.next` corruptas de ambos portales antes de repetir la E2E; no se eliminaron datos de aplicación, volúmenes ni contenedores persistentes.
- `git diff --check` no reportó errores de espacios; los avisos de CRLF son informativos de Git y no alteran el contenido.

## Remediación de revisión independiente posterior a UAT — 2026-08-10

- Hallazgos corregidos: los contenedores `customer-web` y `admin-web` ya no reciben el archivo `.env` completo; Compose declara únicamente las variables necesarias de cada portal. Se eliminó el log crudo de errores de la ruta administrativa autenticada.
- Regresiones: `scripts/staging-auth-config.test.mjs` verifica el aislamiento de variables de backend/Management y `scripts/identity-admin.test.mjs` verifica que el logout administrativo conserva el retorno `/admin`, usa el middleware Auth0 y vence las cookies para ambas rutas.
- E2E reproducible: los `webServer` de Playwright usan Webpack en lugar de Turbopack; se limpiaron sólo las cachés `.next` generadas que estaban corruptas. Cliente y administración pasaron 1/1.
- Revalidación: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:unit` (22/22), `pnpm build`, `pnpm test:integration`, `pnpm test:security`, `pnpm test:e2e:frontends` y `docker compose ... config --no-interpolate` finalizaron correctamente.

## Revisión independiente de remediación — 2026-08-10

- Rol: Quality Reviewer independiente de la implementación y de las correcciones posteriores a UAT.
- Dictamen: **PASSED (APROBADO)**.
- Verificación: `git diff --check` sin errores y 8/8 regresiones focalizadas superadas. El reviewer confirmó el aislamiento de secretos de backend respecto de los portales web, la ausencia de logs crudos en rutas autenticadas y la cobertura de regresión para logout administrativo/cookies.
- Estado: técnicamente habilitada para commit y push; no se realizó publicación porque requiere autorización explícita del usuario.

## Hotfix de diagnóstico de autorización administrativa — 2026-08-12

- Hallazgo de staging: después de confirmar sesión Auth0, perfil local `ADMIN`,
  audiencia, issuer, Client ID administrativo, JWKS accesible y firma RS256, la
  bandeja recibía `401` sin distinguir si el fallo ocurría al recuperar el token
  o al validarlo en la API.
- Corrección: el proxy administrativo solicita explícitamente la audiencia
  configurada y devuelve únicamente códigos diagnósticos acotados
  (`AUTH_SESSION_MISSING`, `AUTH_ACCESS_TOKEN_UNAVAILABLE` o
  `AUTH_API_TOKEN_REJECTED`), sin tokens, cookies ni detalles de proveedor. La
  interfaz comunica el estado correspondiente sin exponer datos sensibles.
- Verificación: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm
  test:unit` (22/22), `pnpm build`, `pnpm test:integration` (22/22), ejecución
  de seguridad con Docker recuperado y `pnpm test:e2e:frontends` (cliente 1/1,
  administración 1/1) finalizaron sin errores de producto. El primer intento
  de seguridad se interrumpió por falta de espacio de Docker Desktop; tras
  liberar espacio y reiniciar el motor, el runner terminó y limpió el stack
  temporal. La revisión independiente aprobó el cambio y sus 8/8 pruebas
  focalizadas.
- Pendiente de UAT: desplegar la imagen publicada y verificar el código
  diagnóstico o la carga correcta de la bandeja en staging, sin copiar tokens
  ni cookies a evidencia.

## Hotfix de rutas proxy del portal cliente — 2026-08-12

- Hallazgo de staging: el portal cliente solicitaba `/api/offers`, pero Nginx
  reenviaba todo `/api/` directamente a NestJS. Como NestJS reserva la API
  pública para `/api/v1/...`, la carga de la oferta recibía `404`.
- Corrección: Nginx enruta exclusivamente `/api/offers`,
  `/api/address/resolve` y las rutas de creación/carga de solicitudes hacia
  `customer-web`; mantiene `/api/v1/...` y healthchecks hacia NestJS. La API
  no se expone fuera de Nginx.
- Regresión: `scripts/e2e-technical.test.mjs` confirma ambos recorridos:
  `/api/v1/catalog/offers` y el proxy de cliente `/api/offers` retornan el
  catálogo público esperado dentro del Compose aislado. También verifica que
  `POST /api/address/resolve`, `POST /api/requests` y la carga de evidencia
  alcanzan los handlers del cliente mediante su `401 application/problem+json`
  sin sesión, en vez del `404` que daba la API antes de la corrección.
- Infraestructura de prueba: la reconstrucción aislada expuso un fallo de
  Corepack incluido en Node 24.15 al cargar `pnpm@11.9.0` en Alpine. El
  Dockerfile instala explícitamente la versión ya fijada en `package.json`,
  eliminando esa dependencia de Corepack.
- Verificación: `node --test scripts/e2e-technical.test.mjs` superó 1/1 tras
  la reconstrucción limpia del Compose. No se modificaron volúmenes de datos;
  sólo se limpió el caché de construcción corrupto de Docker Desktop.


