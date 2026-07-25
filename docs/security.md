# Seguridad y privacidad

## Datos sensibles del dominio

- Identidad y contacto de clientes y operarios.
- Domicilios y ubicación actual/histórica.
- Videos, fotografías, audio y firmas de conformidad.
- Datos operativos, cotizaciones, pagos y reclamos.

## Controles mínimos

- Autorización en servidor por rol, propiedad de recurso y contexto de la orden.
- Cifrado en tránsito y cifrado en reposo adecuado al VPS, sus volúmenes y backups; el mecanismo concreto debe definirse antes de aprobar la especificación.
- Almacenamiento privado por defecto. En el filesystem del VPS no se exponen rutas físicas: la API autoriza el acceso y Nginx realiza la entrega interna según ADR-006. Si se migra a object storage, se usarán buckets privados y URLs firmadas de vida corta.
- Webhooks con validación criptográfica, idempotencia y protección contra replay.
- Secretos solo mediante variables/gestor de secretos; rotación y separación por ambiente.
- Auditoría de accesos administrativos y transiciones críticas.
- Minimización, retención y borrado definidos por categoría de dato.
- Rate limiting y prevención de abuso en autenticación, cargas, pagos y notificaciones.

## Revisión obligatoria

Cada feature debe declarar datos leídos/escritos, actores autorizados, amenazas relevantes, retención, contenido de logs y pruebas negativas de permisos.

Antes de producción se debe realizar modelado de amenazas, revisión legal/privacidad aplicable y un plan de respuesta a incidentes.
