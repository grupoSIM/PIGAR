# Arquitectura de PIGAR

Estado: arquitectura y especificación de feat-001 aprobadas; implementación en curso.

## Contexto del producto

PIGAR conecta clientes, operarios de campo y administración para gestionar solicitudes, asignaciones, diagnósticos, reparaciones, presupuestos, pagos, conformidad, garantía y calificaciones.

## Límites iniciales del sistema

- Portal mobile-first de clientes.
- Panel web de administración.
- Backend/API como autoridad de permisos, órdenes y transiciones.
- Base relacional para trazabilidad transaccional.
- Almacenamiento privado para video e imágenes en el mismo VPS del backend, aislado detrás de un adaptador.
- Integraciones externas aisladas detrás de adaptadores: pagos, mapas, identidad y notificaciones.

## Límite aprobado de producto para el MVP

- No existe aplicación ni acceso autenticado para operarios.
- Administración asigna al técnico y actualiza los hitos operativos.
- El cliente puede ver `TECNICO_ASIGNADO` y, opcionalmente, `EN_CAMINO`.
- No se captura, persiste ni muestra la ubicación del técnico.
- Toda comunicación dentro del sistema es entre cliente y administración; no se exponen datos de contacto del técnico.
- Administración puede coordinar con el técnico por WhatsApp fuera de PIGAR; esa comunicación no se integra ni audita en el MVP.
- El backoffice inicial consiste en una bandeja de solicitudes y órdenes, sin dashboard de KPIs.
- El domicilio del cliente sí forma parte de la solicitud y continúa siendo un dato sensible.
- Backend, backoffice, base de datos y almacenamiento primario se despliegan inicialmente en un VPS de Hostinger exclusivamente como entorno de testing/staging para el equipo y el cliente; no constituye producción.
- La producción se diseñará y aprobará como un entorno separado después de finalizar el desarrollo y cumplir los bloqueantes de seguridad, recuperación y capacidad.

## Principios obligatorios

- La orden de trabajo es un agregado con máquina de estados explícita e historial inmutable de transiciones.
- El servidor valida actor, transición, versión y precondiciones; la UI no es una barrera de seguridad.
- Pagos y webhooks son idempotentes. La acreditación confirmada por proveedor es distinta de la intención de pago.
- Los binarios no se almacenan en el filesystem efímero de la aplicación. En el MVP, la API recibe cargas por streaming hacia el volumen privado del VPS y Nginx entrega descargas mediante autorización interna, según ADR-006.
- Ubicación, firma y multimedia se tratan como datos sensibles con acceso y retención limitados.
- Las integraciones externas no contaminan el dominio: se usan puertos/adaptadores y contratos testeables.

## ADR aceptadas con condiciones

- ADR-001: monorepo y stack web del cliente/backoffice.
- ADR-002: backend, base de datos y modelo de despliegue.
- ADR-003: proveedor de identidad y matriz de roles.
- ADR-004: Mercado Pago (Checkout Pro/API), conciliación y webhooks.
- ADR-005: domicilio, mapas y ausencia de tracking.
- ADR-006: almacenamiento local al VPS, carga y ciclo de vida multimedia.
- ADR-007: notificaciones push, email y WhatsApp.
- ADR-008: alcance online del MVP y futura estrategia offline.

La aprobación de estas ADR habilita `specification` para feat-001. No aprueba la especificación ni autoriza implementación. Las condiciones exigibles antes de aprobar la especificación y antes de producción se registran en [architecture-review.md](architecture-review.md) y `progress/current.yaml`.
