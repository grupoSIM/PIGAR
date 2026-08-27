# Discovery — feat-007: Resolución administrativa, cobro y conformidad

- Estado: `specification` — decisiones de discovery aprobadas por el usuario el
  2026-08-17.
- Inicio: 2026-08-17.
- Dependencias: `feat-003` y `feat-005` cerradas e integradas en `main`.
- Decisión relacionada: [ADR-004](adr/ADR-004.md).
- Límite: este discovery no habilita código, migraciones, credenciales,
  publicación, despliegue ni cobros reales.

## Objetivo

Completar el camino feliz de la Visita Simple después de
`TRABAJO_FINALIZADO`: administración registra la resolución, el sistema cobra
el importe ARS congelado en la solicitud mediante Mercado Pago Checkout Pro,
el proveedor confirma autoritativamente el pago y el cliente presta conformidad
desde su portal antes de cerrar la orden.

La feature debe mantener separados el estado de la orden, el cargo comercial y
cada intento de pago. El retorno del navegador nunca confirma un pago y ningún
actor administrativo puede marcarlo manualmente como aprobado.

## Base ya aprobada

- La Visita Simple tiene un precio final versionado; cada solicitud conserva su
  propia instantánea de categoría, moneda, importe y versión.
- La orden llega a `TRABAJO_FINALIZADO` mediante feat-005.
- El contrato v1 reserva
  `TRABAJO_FINALIZADO -> PENDIENTE_PAGO -> PENDIENTE_CONFORMIDAD -> CERRADA`.
- El pago usa Mercado Pago Checkout Pro detrás de un puerto de proveedor.
- Sólo una consulta autenticada al proveedor puede producir `APPROVED`.
- Un pago pendiente o rechazado no adelanta la orden; un rechazo permite otro
  intento sin reescribir el anterior.
- Webhooks, conciliación e idempotencia fueron probados con un mock contractual;
  la validación con cuentas de prueba reales sigue pendiente.

## Alcance candidato

- Registrar una resolución administrativa estructurada al finalizar la visita,
  sin alterar el precio congelado ni introducir presupuestos complejos.
- Crear una única obligación de cobro por orden y uno o más intentos históricos,
  con una sola preferencia activa a la vez.
- Permitir al `CLIENT` propietario iniciar o retomar Checkout Pro y consultar el
  estado seguro del cobro.
- Recibir Webhooks HTTPS, validar la firma vigente de Mercado Pago, consultar el
  pago en forma autoritativa y aplicar el resultado idempotentemente.
- Conciliar periódicamente intentos no terminales y recuperar Webhooks perdidos.
- Permitir conformidad explícita del `CLIENT` autenticado sólo después de pago
  aprobado, conservando versión del texto aceptado y fecha UTC.
- Mostrar en CLIENT y ADMIN el resumen, importe, estado de pago e historial que
  corresponda a cada actor, sin exponer secretos ni payloads del proveedor.
- Incorporar migraciones aditivas, contrato HTTP, pruebas de concurrencia,
  permisos negativos, integración PostgreSQL/proveedor y E2E de ambos portales.

## Fuera de alcance

- Presupuesto complejo, seña, cuotas propias, pagos parciales, propinas,
  reprogramación o modificación manual del importe.
- Checkout embebido, tarjetas guardadas, marketplace, split payments o PCI
  directo en PIGAR.
- Reembolsos, contracargos, devoluciones, cancelación posterior al inicio de
  atención y conciliación contable/fiscal avanzada.
- Firma manuscrita, imagen de firma, biometría, geolocalización o contacto
  cliente-técnico.
- Reclamos, garantías y calificaciones, que pertenecen a feat-010.
- Notificaciones externas, producción y credenciales o transacciones reales.

## Decisiones abiertas que requieren aprobación humana

| ID | Decisión | Recomendación inicial | Impacto |
| --- | --- | --- | --- |
| DEC-007-001 | Resultado de la visita | Registrar `RESUELTO_EN_VISITA` o `REQUIERE_PRESUPUESTO`, más un resumen breve visible al cliente. Ambos resultados cobran la Visita Simple; el trabajo adicional queda para feat-008. | Define el cierre comercial sin introducir presupuesto complejo. |
| DEC-007-002 | Momento de generar el cargo | Al registrar la resolución sobre una orden `TRABAJO_FINALIZADO`, crear idempotentemente un único cargo y pasar a `PENDIENTE_PAGO`. El cliente crea/reutiliza un intento al pulsar “Pagar”. | Separa obligación de cobro de la interacción con el proveedor. |
| DEC-007-003 | Importe cobrable | Usar exclusivamente moneda e importe de la oferta congelada en la solicitud. ADMIN/DISPATCHER no pueden editar, bonificar ni agregar conceptos en esta feature. | Evita discrepancias con catálogo e historial. |
| DEC-007-004 | Reintentos de pago | Mantener un solo intento activo; un intento `REJECTED`/`CANCELLED` conserva historial y permite crear otro. `PENDING` se concilia y no habilita otro intento simultáneo. | Determina idempotencia, UX y conciliación. |
| DEC-007-005 | Roles | ADMIN/DISPATCHER registran resolución y generan el cargo; sólo el CLIENT propietario inicia Checkout y presta conformidad; sólo el adaptador del proveedor aplica aprobación. Ningún humano marca pagos aprobados. | Fija mínimo privilegio y pruebas negativas. |
| DEC-007-006 | Forma de conformidad | Botón explícito del CLIENT autenticado, con resumen de orden, importe, texto versionado y UTC; sin firma manuscrita. No hay cierre administrativo sustituto: si no confirma, queda `PENDIENTE_CONFORMIDAD`. | Reduce datos sensibles y define evidencia comercial. |
| DEC-007-007 | Disconformidad | Mostrar un canal operativo existente fuera de PIGAR y mantener la orden pendiente; reclamos dentro del sistema se difieren a feat-010. No ofrecer “rechazar conformidad” irreversible en este incremento. | Evita diseñar parcialmente incidencias y reembolsos. |
| DEC-007-008 | Datos enviados a Mercado Pago | Referencia externa opaca, título genérico, moneda e importe; no enviar domicilio, multimedia, diagnóstico, teléfono del técnico ni texto libre. Enviar email sólo si Checkout Pro lo exige o el usuario lo aprueba expresamente. | Activa minimización y revisión de privacidad. |

## Decisiones confirmadas el 2026-08-17

El usuario aprobó DEC-007-001 a DEC-007-008 y la revisión arquitectónica
condicionada como paquete para el MVP. Se adoptan las recomendaciones de la
tabla anterior, incluida la minimización de datos enviados al proveedor. La
aprobación permite redactar la especificación; no autoriza implementación,
credenciales, cobros, publicación ni despliegue.

## Verificación vigente del proveedor

La documentación oficial actual de Checkout Pro confirma que la integración de
prueba requiere cuentas de comprador/vendedor de prueba, permite simular pagos
aprobados, pendientes y rechazados, y recomienda Webhooks con firma secreta. La
firma vigente usa `x-signature`, `x-request-id`, `data.id` y timestamp; por eso
la firma HMAC simplificada de la PoC no puede trasladarse literalmente al
adaptador productivo.

Referencias consultadas el 2026-08-17:

- [Prueba de integración de Checkout Pro](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-test)
- [Compras de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-test/test-purchases)
- [Webhooks de pagos](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/payment-notifications)
- [Crear preferencia](https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro/preferences/create-preference/post)

Antes de aprobar la especificación se debe validar con una aplicación y cuentas
no productivas: creación de preferencia, retorno no autoritativo, Webhook firmado,
consulta autoritativa, aprobado, pendiente, rechazado, duplicado, fuera de orden
y recuperación por conciliación. Las credenciales permanecen fuera del
repositorio y de la evidencia.

## Riesgos y controles candidatos

| Riesgo | Control verificable propuesto |
| --- | --- |
| Doble cargo o doble preferencia | Unicidad de cargo por orden, `Idempotency-Key`, una preferencia activa y prueba concurrente. |
| Retorno del navegador tomado como pago | El retorno sólo informa “procesando”; Webhook/conciliación consultan al proveedor antes de avanzar. |
| Webhook falsificado, repetido o fuera de orden | Firma oficial, ventana temporal, recibo único, consulta autoritativa y transición monotónica. |
| Pago pendiente o proveedor caído | Orden permanece `PENDIENTE_PAGO`, reintentos acotados y conciliación por worker. |
| Importe distinto de la solicitud | Cargo creado desde snapshot inmutable; proveedor debe devolver referencia, moneda e importe esperados. |
| Acceso cruzado o aprobación manual | Autorización por propiedad/rol y pruebas negativas para otro CLIENT, ADMIN, DISPATCHER, visitante y técnico. |
| Filtración de datos comerciales/personales | Payload mínimo, secretos cifrados fuera del repositorio y logs con IDs opacos/hash, códigos y UTC. |
| Conformidad duplicada o anticipada | Comando idempotente sólo desde `PENDIENTE_CONFORMIDAD`, con versión optimista e historial append-only. |

## Puertas para avanzar

1. Ejecutar la validación no productiva exigida por ADR-004 o registrar con
   precisión qué parte depende de acceso del usuario a Mercado Pago.
2. Elaborar los siete artefactos de especificación con IDs estables y detenerse
   en `spec_review` para aprobación humana.
