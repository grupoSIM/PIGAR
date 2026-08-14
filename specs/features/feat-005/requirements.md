# Requisitos — feat-005: Motor de estados, asignación manual y trazabilidad

- Estado: `implementation`.
- Dependencia: feat-004 cerrada e integrada.
- Arquitectura: `approved_with_conditions`, usuario, 2026-08-12.

## Objetivo

Convertir una solicitud operable en orden con técnico asignado, hitos manuales hasta `TRABAJO_FINALIZADO` e historial verificable. El técnico no tiene cuenta, token ni acceso a PIGAR.

## Actores

| Actor               | Permitido                                                   | Prohibido                                     |
| ------------------- | ----------------------------------------------------------- | --------------------------------------------- |
| CLIENT              | Consulta segura de sus órdenes.                             | Asignar, transicionar o ver teléfono/motivos. |
| DISPATCHER          | Consultar, asignar, reasignar, actualizar hitos y cancelar. | Administrar técnicos, historial o pagos.      |
| ADMIN               | Lo anterior y administración de técnicos.                   | Eludir transiciones o editar historial.       |
| Técnico / visitante | Ningún acceso.                                              | Cuenta, token, portal o API.                  |

## Requisitos funcionales

### REQ-005-001 — Técnicos internos

ADMIN crea, consulta, edita y desactiva técnicos con nombre completo, teléfono obligatorio y estado `ACTIVE`/`INACTIVE`. Sólo un técnico activo con teléfono válido se asigna. Los registros históricos no se borran. El teléfono sólo se devuelve a ADMIN/DISPATCHER, nunca a CLIENT.

### REQ-005-002 — Primera asignación

ADMIN o DISPATCHER asigna un técnico activo a una solicitud `READY_FOR_OPERATION`. Una transacción crea la orden, aplica `SOLICITADA -> TECNICO_ASIGNADO`, conserva la referencia a solicitud/oferta y agrega historial. El comando usa clave idempotente: reintento igual devuelve la misma orden, payload incompatible se rechaza y una solicitud no recibe dos órdenes.

### REQ-005-003 — Hitos y cancelación

Sólo ADMIN/DISPATCHER reasignan, marcan `EN_CAMINO`, inician atención, finalizan trabajo y cancelan. El servidor valida tabla v1 y versión optimista: sin saltos, retrocesos ni estados posteriores a `TRABAJO_FINALIZADO`. Reasignación y cancelación exigen motivo; cancelar sólo antes de `EN_ATENCION`.

### REQ-005-004 — Historial y proyección

Cada cambio incrementa versión y agrega historial inmutable con actor, acción, estado previo/posterior, UTC y motivo interno cuando aplique. CLIENT consulta sólo su orden y ve estado, hora, historial seguro y nombre completo asignado. Al cancelar, ve sólo `CANCELADA`, sin motivo. Nunca recibe teléfono, ubicación, ETA, WhatsApp, IDs internos ni datos de otro cliente.

### REQ-005-005 — Auditoría y UI segura

El servidor autoriza por rol, propiedad y recurso. Audita mutaciones/lecturas operativas con IDs opacos, actor, acción, resultado, correlation ID y UTC, sin teléfono, nombre, domicilio, coordenadas, adjuntos, motivos ni secretos. La UI administra bandeja/asignación/hitos y el cliente consulta sin caché persistente de datos sensibles.

## Requisitos no funcionales

- NFR-005-001: asignación y transiciones atómicas, idempotentes y seguras ante concurrencia mediante restricciones, transacción y versión.
- NFR-005-002: migraciones forward-only; no borrar ni reescribir solicitud, oferta, multimedia, técnico histórico ni historial.
- NFR-005-003: teléfono y nombre son datos personales minimizados por actor; retención/borrado quedan bloqueantes antes de producción.
- NFR-005-004: operación online; sin persistir teléfonos, domicilios, tokens, multimedia ni borradores operativos en navegador.

## Fuera de alcance

Pagos, cobro, conformidad, presupuesto, reprogramación, notificaciones, contacto cliente-técnico, tracking, agenda, asignación automática, portal para técnicos y producción.
