# Requisitos — feat-001: Fundaciones técnicas y arquitectura ejecutable

- Estado: approved
- Aprobación humana: usuario, 2026-07-23
- Alcance de la aprobación: requisitos, diseño, aceptación, tareas, pruebas, contrato API y condiciones documentadas.

## Objetivo y alcance

Crear una base ejecutable, reproducible y verificable para PIGAR que materialice ADR-001 a ADR-008 sin implementar todavía los flujos funcionales del producto.

Incluye:

- Monorepo TypeScript con dos aplicaciones web, API, worker y paquetes compartidos.
- Entorno local y de VPS reproducible mediante Docker Compose.
- PostgreSQL y volumen multimedia separados del filesystem efímero de contenedores.
- Contrato mínimo de healthchecks.
- PoC aislada de carga multimedia por streaming.
- PoC aislada de validación, idempotencia y conciliación de eventos de Mercado Pago Sandbox.
- Comandos de calidad, CI, configuración segura, observabilidad y documentación operativa mínima.
- Contratos arquitectónicos de estados y permisos que implementarán features posteriores.

## Fuera de alcance

- Pantallas funcionales de clientes o administración más allá de shells identificables.
- Registro, login o integración productiva con Auth0.
- Solicitudes, asignaciones, pagos o cargas multimedia disponibles a usuarios finales.
- Acceso o aplicación para técnicos.
- Tracking o persistencia de ubicación del técnico.
- Chat, email, push, SMS o WhatsApp integrado.
- Dashboard de KPIs.
- Producción, despliegue público, credenciales reales, commit, push o PR.

## Actores y permisos

`feat-001` no habilita acciones de negocio. Define la matriz que deben respetar las features posteriores:

| Actor | Alcance futuro permitido | Prohibiciones |
|---|---|---|
| `CLIENT` | Crear y consultar solicitudes propias; gestionar multimedia propia; iniciar pagos y conformidad propios | Acceder a recursos de otro cliente, asignar técnicos o cambiar estados administrativos |
| `DISPATCHER` | Consultar solicitudes y órdenes; asignar registros de técnicos; actualizar estados operativos; consultar multimedia por finalidad operativa | Administrar roles, acceder sin motivo operativo o modificar confirmaciones del proveedor de pagos |
| `ADMIN` | Capacidades de `DISPATCHER`, administración de perfiles internos y configuración autorizada | Eludir transiciones, alterar historial o marcar pagos como aprobados manualmente |
| Técnico sin acceso | Ninguna acción autenticada en PIGAR durante el MVP | Recibir cuenta, token, portal o API |
| Sistema/proveedor verificado | Aplicar resultados idempotentes de jobs y webhooks | Actuar sin firma/consulta válida o fuera de una transición permitida |

## Requisitos funcionales

### REQ-001 — Estructura del monorepo

- When: se inicializa el repositorio técnico.
- Where: raíz de PIGAR.
- The system shall: usar pnpm workspaces y Turborepo; contener `apps/customer-web`, `apps/admin-web`, `apps/api`, `apps/worker` y paquetes compartidos explícitos para contratos, dominio, UI, configuración y utilidades.
- Errores y límites: no se permite dependencia desde paquetes de dominio hacia Next.js, NestJS, Prisma o SDK de proveedores.

### REQ-002 — Shells web independientes

- When: se ejecuta o compila el workspace.
- Where: aplicaciones cliente y administración.
- The system shall: producir dos aplicaciones Next.js independientes, identificadas como PIGAR, con TypeScript estricto, layout mínimo y health/build verificable.
- Errores y límites: no se incorporan prototipos Stitch directamente, datos reales, KPIs, mapas de técnicos ni flujos de operarios.

### REQ-003 — API y worker ejecutables

- When: se inicia el entorno.
- Where: API NestJS sobre Fastify y worker del mismo monorepo.
- The system shall: iniciar ambos procesos con configuración validada; la API expone `GET /health/live` y `GET /health/ready`; el worker demuestra un ciclo de job reclamado desde PostgreSQL sin Redis.
- Errores y límites: readiness debe fallar si una dependencia obligatoria no está disponible; liveness no debe consultar proveedores externos.

### REQ-004 — Persistencia base

- When: se levanta un entorno vacío.
- Where: PostgreSQL y Prisma.
- The system shall: aplicar una migración inicial reproducible que habilite las tablas técnicas mínimas para outbox/jobs, eventos idempotentes y metadatos de PoC, con notas forward y rollback.
- Errores y límites: no se crean aún entidades funcionales completas de cliente, solicitud, orden o pago; no se almacenan secretos ni payloads sensibles completos.

### REQ-005 — Topología reproducible de despliegue

- When: se ejecuta Docker Compose.
- Where: desarrollo y documento de despliegue a VPS.
- The system shall: aislar Nginx, dos webs, API, worker y PostgreSQL; publicar únicamente Nginx; usar redes internas, healthchecks, límites de recursos y volúmenes persistentes separados para PostgreSQL y multimedia.
- Errores y límites: ningún servicio interno ni ruta física multimedia queda expuesto directamente; no se asume alta disponibilidad en un único VPS.

### REQ-006 — PoC de multimedia privada por streaming

- When: una prueba autenticada de la PoC envía un archivo permitido.
- Where: adaptador local de almacenamiento.
- The system shall: transmitir a archivo temporal con memoria acotada, validar cantidad/tamaño/MIME, calcular checksum, finalizar mediante rename atómico y entregar mediante autorización interna de Nginx.
- Errores y límites: máximo propuesto de 5 imágenes de 10 MB y 1 video de 50 MB/30 segundos por solicitud; los límites quedan sujetos a evidencia de PoC. Ante error o interrupción se elimina o recolecta el temporal. La PoC no es un endpoint de producto.

### REQ-007 — PoC de pagos idempotentes

- When: Mercado Pago Sandbox envía o se simula un evento.
- Where: adaptador aislado de Checkout Pro.
- The system shall: verificar autenticidad, registrar identificadores mínimos, consultar la fuente autoritativa, deduplicar concurrencia y demostrar conciliación de una intención pendiente.
- Errores y límites: retorno del navegador, evento inválido o dato no confirmado nunca produce aprobación; no se guardan tarjetas, credenciales ni payloads sensibles completos. La PoC no habilita cobros reales.

### REQ-008 — Comandos de calidad y CI

- When: una persona o CI verifica el repositorio.
- Where: raíz del monorepo.
- The system shall: ofrecer comandos únicos para formato, lint, typecheck/build, unit, integración y E2E técnico; CI debe ejecutarlos en un entorno limpio y bloquear ante fallos.
- Errores y límites: ninguna categoría exigida por `.harness/workflow.yaml` puede quedar simulada o declararse exitosa sin salida y evidencia.

### REQ-009 — Configuración y secretos

- When: inicia cualquier proceso.
- Where: aplicaciones, API, worker y Compose.
- The system shall: validar variables por ambiente, suministrar `.env.example` sin valores reales, separar credenciales y fallar con mensajes no sensibles cuando falte configuración obligatoria.
- Errores y límites: no se registran tokens, domicilios, coordenadas, URLs firmadas, payloads de webhook ni rutas físicas privadas.

### REQ-010 — Observabilidad y operación base

- When: API, worker, Nginx o base procesan una operación técnica.
- Where: logs y documentación operativa.
- The system shall: emitir logs estructurados con timestamp UTC, nivel, servicio y correlation ID; documentar métricas/alertas mínimas de CPU, memoria, disco, errores, jobs y capacidad multimedia.
- Errores y límites: observabilidad no debe aumentar exposición de datos sensibles; no se implementa un dashboard de KPIs de negocio.

### REQ-011 — Contrato de estados del MVP

- When: features posteriores implementen solicitudes, órdenes y pagos.
- Where: paquete compartido de contratos/dominio.
- The system shall: reservar una máquina de estados explícita, versionada y validada en servidor, conforme al contrato de `design.md`; pagos se modelan separadamente del estado operativo.
- Errores y límites: no se aceptan estados libres, saltos arbitrarios, edición del historial ni ubicación del técnico. En `feat-001` solo se define y prueba el contrato, no se expone el flujo funcional.

### REQ-012 — Registro de capacidad y proveedores

- When: se cierre la especificación técnica de la fundación.
- Where: documentación operativa.
- The system shall: registrar una línea base de capacidad, límites por contenedor, presupuesto/cuotas a validar para Auth0, Google Maps y Mercado Pago, y la regla de cifrado en reposo/backup.
- Errores y límites: no se contrata ni selecciona silenciosamente un plan de VPS o proveedor de backup; cualquier valor económico debe fecharse y confirmarse antes de producción.

## Requisitos no funcionales

- NFR-001 Seguridad: superficie pública limitada a Nginx; configuración segura por defecto; dependencias fijadas; pruebas negativas de rutas internas, secretos y archivos.
- NFR-002 Rendimiento: healthcheck local p95 menor a 250 ms sin carga; streaming de un archivo de 50 MB no debe crecer linealmente en memoria y deberá cumplir el umbral fijado por la PoC.
- NFR-003 Disponibilidad/offline: reinicios de contenedores no pierden PostgreSQL ni archivos finalizados; el MVP requiere conexión y no implementa sincronización offline.
- NFR-004 Privacidad y retención: PoC solo con datos sintéticos; temporales con TTL; retención de producto de 180 días es una hipótesis pendiente de validación legal.
- NFR-005 Observabilidad: logs estructurados y correlacionables, sin datos personales ni secretos; healthchecks distinguen vivo de listo.
- NFR-006 Portabilidad y recuperación: entorno reproducible desde host limpio; migraciones, volúmenes y adaptadores permiten migrar fuera del VPS; backup externo queda bloqueante para producción.
- NFR-007 Accesibilidad: shells web deben ofrecer estructura semántica, foco visible, navegación por teclado y contraste WCAG AA como base.

## Supuestos y preguntas abiertas

Los siguientes puntos no impiden redactar la especificación, pero deberán quedar aprobados junto con ella o verificados antes de producción según corresponda:

- CAP-001: el VPS de desarrollo confirmado dispone de 2 vCPU, 8 GB RAM, 100 GB de disco y 8 TB de transferencia incluida. Las PoC y mediciones de `feat-001` se ejecutarán contra esta capacidad; la periodicidad de la cuota de transferencia debe confirmarse en el plan.
- CAP-001-PROD: el dimensionamiento productivo no se deriva automáticamente del VPS de desarrollo; se propondrá después de medir CPU, memoria, disco, transferencia y concurrencia.
- CAP-002: presupuesto operativo y cuotas de Auth0, Google Maps y Mercado Pago se documentarán con fecha durante `TASK-015`.
- SEC-001: se solicitará evidencia de cifrado de disco al proveedor del VPS. Si no existe, producción requerirá un volumen cifrado administrable con claves fuera del repositorio; backups serán cifrados del lado de PIGAR en todos los casos.
- RET-001: 180 días después del cierre es solo una hipótesis de diseño para multimedia.
- UX-001: “comunicación cliente-administración” significa estados e historial dentro del portal; no incluye chat en el MVP.
- GIT-001: la carpeta `.git` observada está vacía; la inicialización real del repositorio forma parte de implementación y no autoriza commit o publicación.

## Dependencias

- ADR-001 a ADR-008 aceptadas con condiciones.
- Diseños Stitch inventariados en `docs/design-review-stitch.md`.
- Docker Engine/Compose, Node.js, pnpm y PostgreSQL en versiones estables soportadas al iniciar implementación.
- Cuentas no productivas o mocks contractuales para Auth0, Google Maps y Mercado Pago.
- Aprobación humana de esta especificación antes de modificar código.
