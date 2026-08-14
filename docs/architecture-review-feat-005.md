# Revisión arquitectónica focalizada — feat-005

- Fecha: 2026-08-12.
- Estado: `approved_with_conditions`.
- Aprobación humana: usuario, 2026-08-12.
- Alcance: orden operativa, asignación manual, técnico registrado internamente,
  historial de estados y proyección segura para cliente.
- No habilita especificación, implementación, publicación ni despliegue.

## Dictamen recomendado

`approved_with_conditions` si se respetan ADR-005, ADR-007 y ADR-008 y los
controles siguientes quedan incluidos en la especificación. No se propone una
nueva ADR: no se agrega proveedor, tracking, identidad para técnicos ni canal
de comunicación dentro de PIGAR.

## Datos y minimización

El técnico es un registro operativo, no una cuenta ni un principal de
autenticación. Se conservarán nombre completo, teléfono y estado activo/inactivo
para coordinación de administración fuera de PIGAR. El teléfono sólo se entrega
a `ADMIN` y `DISPATCHER` por necesidad operativa; la proyección del `CLIENT`
incluye el nombre completo una vez asignado, pero nunca teléfono, WhatsApp,
ubicación, mapa, ETA ni otra información de contacto.

La especificación deberá definir retención y borrado como bloqueantes antes de
producción. En staging se aplican autorización, minimización de logs, cifrado en
tránsito y los controles de almacenamiento aprobados para el VPS; no se
registran teléfonos, nombres, domicilio, coordenadas, adjuntos ni secretos en
logs/auditoría.

## Consistencia y autorización

- Sólo una solicitud `READY_FOR_OPERATION` puede recibir su primera asignación,
  que crea la orden de forma transaccional e idempotente.
- La orden referencia solicitud y técnico por IDs opacos, conserva el snapshot
  de oferta existente y no duplica domicilio ni multimedia.
- El servidor valida transición, versión optimista, rol, técnico activo y motivo
  obligatorio para reasignación/cancelación. El historial es append-only.
- `ADMIN` administra registros de técnicos; `ADMIN` y `DISPATCHER` asignan,
  reasignan, actualizan hitos y cancelan antes de atención. `CLIENT`, visitante
  y técnico sin cuenta reciben denegación para estas mutaciones.
- feat-005 termina en `TRABAJO_FINALIZADO`; no crea pagos ni permite adelantar
  estados de pago/conformidad reservados para feat-007.

## Pruebas exigidas para la futura especificación

- Integración PostgreSQL para primera asignación concurrente, versión obsoleta,
  técnico inactivo, reasignación e historial inmutable.
- Seguridad para acceso cruzado de CLIENT, técnico sin cuenta y visitante; para
  teléfono sólo visible a roles operativos; y para proyección de cliente sin
  datos de contacto/ubicación.
- E2E de bandeja administrativa, asignación inicial, actualización de hitos y
  consulta cliente tras refrescar, sin caché persistente de datos sensibles.
- Verificación de logs/auditoría sanitizados y de que ninguna transición permite
  saltar a pago o conformidad.

## Condiciones antes de producción

- Validar legalmente retención, borrado y base de tratamiento del teléfono y
  nombre completo del técnico.
- Verificar cifrado en reposo del VPS/volúmenes, backup externo cifrado,
  restauración, hardening, capacidad y respuesta a incidentes, conforme a
  `progress/current.yaml`.

## Puerta solicitada

La aprobación humana fue otorgada con las condiciones de que el teléfono sea
obligatorio para técnicos activos/asignables, sólo se entregue a roles
operativos y el cliente vea únicamente `CANCELADA`, no el motivo. La aprobación
arquitectónica no autoriza implementación ni publicación; la especificación
requiere su propia puerta humana.
