# Diseño — feat-005: Motor de estados, asignación manual y trazabilidad

## Modelo y consistencia

Se agregan `Technician`, `WorkOrder`, `WorkOrderTransition` y reserva de idempotencia de asignación. `WorkOrder.requestId` es único y referencia la solicitud existente sin copiar domicilio, multimedia ni oferta. `Technician` contiene nombre completo, teléfono y estado. La orden contiene estado, versión, técnico actual opcional y UTC. Cada cambio inserta transición append-only en la misma transacción que actualiza versión.

La primera asignación bloquea solicitud/reserva, verifica `READY_FOR_OPERATION` y técnico activo, crea la orden en `SOLICITADA` y aplica `ASSIGN_TECHNICIAN` a `TECNICO_ASIGNADO`. Unicidad de `requestId`, clave idempotente por actor/comando y versión optimista evitan duplicación y escrituras obsoletas.

## Estados implementados

```text
SOLICITADA --asignar--> TECNICO_ASIGNADO
TECNICO_ASIGNADO --reasignar--> TECNICO_ASIGNADO
TECNICO_ASIGNADO --en camino--> EN_CAMINO
TECNICO_ASIGNADO|EN_CAMINO --iniciar atención--> EN_ATENCION
EN_ATENCION --finalizar--> TRABAJO_FINALIZADO
SOLICITADA|TECNICO_ASIGNADO|EN_CAMINO --cancelar con motivo--> CANCELADA
```

No se ejecutan acciones de pago/conformidad; `TRABAJO_FINALIZADO` es terminal para este incremento.

## API y UI

- `POST/GET/PATCH /v1/admin/technicians`: sólo ADMIN; teléfono nunca en respuesta de CLIENT.
- `POST /v1/admin/requests/{requestId}/assignment`: ADMIN/DISPATCHER, `Idempotency-Key`, crea orden y primera asignación.
- `GET /v1/admin/orders` y `POST /v1/admin/orders/{id}/transitions`: administración operativa, versión esperada y motivo cuando aplique.
- `GET /v1/requests/{requestId}/order`: proyección por actor y propiedad.

Administración ofrece bandeja, asignación y actualización de hitos. Cliente ve estado, historial seguro y nombre completo tras asignación; cancelación es sólo `CANCELADA`. Ninguna vista de cliente muestra teléfono, coordenadas, mapa, ETA, WhatsApp o ubicación.

## Seguridad y migración

Autorización de servidor antes de lecturas/escrituras. Los motivos son internos y no llegan al cliente. Migración aditiva con FKs restrictivas, índices de bandeja, unicidad de orden por solicitud y notas de forward-fix. La retención del teléfono se decide antes de producción.
