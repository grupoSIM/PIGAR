# Discovery — feat-005: Motor de estados, asignación manual y trazabilidad

- Estado: `discovery`.
- Inicio: 2026-08-12.
- Dependencia: `feat-004` cerrada e integrada en `main`.
- Decisiones relacionadas: [ADR-005](adr/ADR-005.md),
  [ADR-007](adr/ADR-007.md) y [ADR-008](adr/ADR-008.md).
- Límite: este discovery no habilita código, migraciones, proveedores,
  publicación ni despliegue.

## Objetivo

Convertir una solicitud con evidencia operable de feat-004 en una orden
operativa con asignación manual de un técnico registrado internamente, hitos
actualizados sólo por administración y un historial inmutable visible de forma
segura para el cliente. No se crea una cuenta, aplicación, token ni tracking
para el técnico.

El contrato v1 ya reservado en `packages/contracts` define los estados
`SOLICITADA`, `TECNICO_ASIGNADO`, `EN_CAMINO`, `EN_ATENCION`,
`TRABAJO_FINALIZADO`, `PENDIENTE_PAGO`, `PENDIENTE_CONFORMIDAD`, `CERRADA` y
`CANCELADA`. Esta feature debe decidir qué tramo vuelve funcional sin invadir
el cobro de feat-007 ni la conformidad posterior.

## Alcance candidato

- Crear y persistir una orden desde una solicitud `READY_FOR_OPERATION`, sin
  reescribir su domicilio, oferta congelada ni adjuntos.
- Mantener un registro mínimo de técnicos para asignación interna, sin
  identidad, sesión, portal ni ubicación dentro de PIGAR.
- Permitir a `ADMIN` y/o `DISPATCHER`, según aprobación, asignar, reasignar y
  actualizar hitos operativos con control de versión optimista, motivo cuando
  corresponda e historial inmutable UTC.
- Presentar una bandeja operativa y detalle protegido para administración;
  presentar al `CLIENT` sólo su estado, historial permitido y hora de cada
  actualización, sin contactos, ubicación ni información interna del técnico.
- Autorizar en servidor por rol, propiedad y recurso; auditar mutaciones y
  lecturas operativas sin domicilios, coordenadas, contactos, adjuntos ni
  secretos en logs.
- Incorporar migración forward-only, contrato HTTP versionado, pruebas de
  transiciones, concurrencia, permisos negativos e E2E de los portales.

## Fuera de alcance

- Aplicación, cuenta, token, ubicación, mapa, teléfono o contacto directo del
  técnico; la coordinación externa de administración con el técnico permanece
  fuera de PIGAR, conforme ADR-005 y ADR-007.
- Pagos, webhooks, conciliación, generación de cobro, conformidad, presupuesto,
  reprogramación, notificaciones o chat: corresponden a feat-007, feat-008 y
  feat-009.
- Asignación automática, agenda, disponibilidad, rutas, ETA, KPIs y dashboard.
- Offline, caché persistente de domicilio/tokens/multimedia, proveedores nuevos
  y producción.

## Decisiones abiertas que requieren aprobación humana

| ID | Decisión | Recomendación inicial | Impacto |
| --- | --- | --- | --- |
| DEC-005-001 | Creación de la orden | Crear la orden al aceptar operativamente una solicitud `READY_FOR_OPERATION`; la misma acción puede incluir la primera asignación. | Define trazabilidad, idempotencia y qué aparece en la bandeja. |
| DEC-005-002 | Registro de técnicos | Registro interno mínimo con nombre visible para administración y estado activo/inactivo; sólo `ADMIN` lo administra y `ADMIN`/`DISPATCHER` pueden seleccionar un técnico activo. No guardar datos de contacto salvo decisión explícita. | Introduce datos de personas y autorización administrativa. |
| DEC-005-003 | Hitos funcionales | Habilitar hasta `TRABAJO_FINALIZADO`: asignar, reasignar, marcar `EN_CAMINO`, iniciar atención, finalizar trabajo y cancelar conforme al contrato v1. `PENDIENTE_PAGO` se activa recién en feat-007. | Delimita la frontera con pagos. |
| DEC-005-004 | Roles operativos | `ADMIN` y `DISPATCHER` asignan/reasignan/actualizan hitos; sólo `ADMIN` administra registros de técnicos. | Determina permisos y pruebas negativas. |
| DEC-005-005 | Cancelación | Permitir sólo a `ADMIN`/`DISPATCHER` desde `SOLICITADA`, `TECNICO_ASIGNADO` o `EN_CAMINO`, siempre con motivo obligatorio; el cliente no cancela desde el portal en este incremento. | Afecta experiencia del cliente, historial y operación. |
| DEC-005-006 | Visibilidad del cliente | Mostrar estado actual, hora UTC presentada localmente e historial seguro; mostrar el nombre del técnico asignado sólo si se aprueba expresamente. Nunca teléfono, WhatsApp, coordenadas, mapa ni ETA. | Afecta privacidad y UX según ADR-005/007. |

## Decisiones confirmadas el 2026-08-12

| Decisión | Resolución | Estado |
| --- | --- | --- |
| DEC-005-001 | La primera asignación de una solicitud `READY_FOR_OPERATION` crea la orden y la deja en `TECNICO_ASIGNADO`. No existe una aceptación previa separada. | aprobada para MVP |
| DEC-005-002 | El registro interno de técnicos conserva nombre completo, teléfono y estado activo/inactivo. Sólo `ADMIN` administra el registro; `ADMIN` y `DISPATCHER` sólo pueden asignar técnicos activos. El teléfono es para coordinación administrativa externa y nunca se expone al cliente. | aprobada para MVP, requiere revisión arquitectónica focalizada de datos personales |
| DEC-005-003 | feat-005 habilita hitos desde la asignación hasta `TRABAJO_FINALIZADO`. La creación de cobro y estados de pago/conformidad quedan en feat-007. | aprobada para MVP |
| DEC-005-004 | `ADMIN` y `DISPATCHER` pueden asignar, reasignar y actualizar hitos operativos; sólo `ADMIN` administra técnicos. | aprobada para MVP |
| DEC-005-005 | Sólo `ADMIN` y `DISPATCHER` pueden cancelar antes de iniciar atención, siempre con motivo obligatorio. El `CLIENT` no puede cancelar desde el portal en este incremento. | aprobada para MVP |
| DEC-005-006 | El `CLIENT` ve el nombre completo del técnico asignado para seguridad, además del estado e historial seguro. No ve teléfono, WhatsApp, coordenadas, mapa ni ETA. | aprobada para MVP, requiere controles de minimización |
| DEC-005-007 | El teléfono es obligatorio para que un técnico esté activo y sea asignable. | aprobada para MVP |
| DEC-005-008 | Ante cancelación, el `CLIENT` ve únicamente el estado `CANCELADA`; el motivo es exclusivamente operativo. | aprobada para MVP |

## Riesgos y controles candidatos

| Riesgo | Control verificable propuesto |
| --- | --- |
| Salto, doble envío o edición del historial | Tabla de transiciones permitidas, versión optimista, idempotencia de comando, append-only y prueba concurrente. |
| Asignar un técnico inactivo o inexistente | Validación transaccional de registro activo y FK restrictiva; reasignación conserva versiones históricas. |
| Cliente ve datos internos o ajenos | Proyección separada por actor, control de propiedad/rol y pruebas negativas para otro CLIENT, técnico y visitante. |
| Operación sin evidencia requerida | Sólo solicitudes `READY_FOR_OPERATION` pueden crear orden/asignarse. |
| Pago adelantado manualmente | feat-005 no crea ni confirma pagos; ningún estado posterior a `TRABAJO_FINALIZADO` se habilita aquí. |
| Auditoría con datos sensibles | Eventos con IDs opacos, acción, resultado, actor y UTC; sin domicilio, coordenadas, contacto, binarios ni secretos. |

## Dependencias y preparación de especificación

`feat-004` ya ofrece solicitudes con oferta congelada, domicilio y multimedia
privada. La nueva orden debe referenciarla sin duplicar ni ampliar los datos
sensibles. La máquina de estados y la matriz de permisos de feat-001 son un
contrato de partida: cualquier cambio material de estados, roles o datos de
técnicos requiere revisión arquitectónica y aprobación humana antes de la
especificación.

La incorporación del teléfono del técnico, aunque sólo sea visible para
administración, activa la puerta de arquitectura por datos personales. La
revisión focalizada debe confirmar: cifrado en tránsito y reposo aplicable al
VPS de staging, autorización exclusiva de roles operativos, proyección de
cliente sin teléfono, logs/auditoría sanitizados, retención/borrado pendiente
de validación legal antes de producción y pruebas negativas de acceso cruzado.

Una vez resueltas DEC-005-001 a DEC-005-006, se podrán elaborar
`requirements.md`, `design.md`, `api-contract.yaml`, `acceptance.md`,
`tasks.md`, `test-plan.md` y `evidence.md` con IDs trazables. La aprobación de
especificación seguirá siendo una puerta humana separada y previa a cualquier
modificación de código.
