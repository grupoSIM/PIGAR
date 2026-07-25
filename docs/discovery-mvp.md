# Discovery del MVP

- Estado: arquitectura aprobada con condiciones
- Fecha: 2026-07-21
- Aprobación humana: 2026-07-23
- Feature activa: feat-001

Los diseños entregados por Google Stitch fueron inventariados en [design-review-stitch.md](design-review-stitch.md) y se usarán como referencia visual durante specification.

## Objetivo del primer release

Validar el camino feliz de una visita estándar: el cliente crea una solicitud, administración asigna un técnico y actualiza sus hitos, el cliente consulta el estado, paga la tarifa fija y presta conformidad.

## Alcance recomendado

Incluido:

- Portal PWA de cliente y panel web administrativo.
- Identidad, roles y autorización contextual en servidor.
- Catálogo mínimo, zonas y tarifa fija.
- Solicitud con domicilio, texto y hasta un video corto.
- Hasta cinco imágenes opcionales y un video opcional de máximo 30 segundos por solicitud.
- Asignación manual; la sugerencia automática queda fuera.
- Máquina de estados auditable, actualizada por administración.
- Visibilidad para el cliente de `TECNICO_ASIGNADO` y, si administración lo informa, `EN_CAMINO`.
- Pago único mediante Mercado Pago Checkout Pro.
- Conformidad digital desde el portal del cliente y resumen de cierre.
- Consulta de estado dentro del portal; canales externos quedan diferidos.
- Comunicación cliente-administración dentro del sistema; sin contacto directo cliente-técnico.
- Backoffice centrado en la bandeja de solicitudes y órdenes, sin KPIs.
- Video e imágenes privados en el mismo VPS de Hostinger.

Fuera del primer release:

- Presupuesto complejo, seña, reprogramación y garantías.
- Aplicación o portal de operarios.
- Captura, persistencia o visualización de ubicación del técnico.
- Exposición del teléfono del técnico o contacto directo cliente-técnico.
- Asignación automática, mapas de calor y optimización de rutas.
- Dashboard de KPIs y reportes.
- Checkout embebido, tarjetas guardadas y marketplace/split payments.
- Push, email transaccional, chat y automatización de WhatsApp.
- Transcodificación adaptativa de video salvo que la PoC demuestre que es necesaria.

## Stack aprobado con condiciones

| Capa | Decisión propuesta |
|---|---|
| Repositorio | pnpm workspaces + Turborepo, TypeScript estricto |
| Web cliente/admin | Next.js, dos aplicaciones con paquetes compartidos |
| API | NestJS sobre Fastify, REST/OpenAPI |
| Persistencia | PostgreSQL + Prisma en volumen separado; Redis solo si una medición lo justifica |
| Hosting | Un VPS de Hostinger con Docker Compose |
| Entrada/TLS | Nginx como reverse proxy, terminación TLS y entrega interna autorizada |
| Multimedia | Filesystem privado en volumen dedicado del VPS; hasta 5 imágenes y 1 video opcional de 30 s |
| Infraestructura | Docker Compose versionado, imágenes OCI y secretos fuera del repositorio |
| Identidad | Auth0 para autenticación; roles y autorización contextual en PIGAR |
| Pagos | Mercado Pago Checkout Pro |
| Mapas | Google Maps Platform solo para domicilio del cliente; sin tracking |
| Notificaciones | Estado dentro del portal; proveedores externos diferidos |
| Offline | Fuera del MVP; solo borradores locales no sensibles en el portal cliente |

El VPS es el almacenamiento primario solicitado, pero no puede ser la única copia. Antes de producción debe aprobarse un destino externo para backups cifrados y verificarse una restauración completa. No se selecciona silenciosamente ese segundo proveedor.

Las versiones mayores se elegirán entre las versiones estables soportadas al iniciar feat-001 y quedarán fijadas en manifiestos y lockfile. Esta regla evita convertir el ADR en una dependencia de una versión efímera.

## Resultado de la puerta de decisión

El usuario aprobó ADR-001 a ADR-008 con las condiciones indicadas el 2026-07-23. La arquitectura pasa a `approved_with_conditions` y feat-001 a `specification`. Esta aprobación no aprueba la especificación ni autoriza implementación.
