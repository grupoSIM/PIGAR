# Revisión arquitectónica focalizada — feat-007

- Fecha: 2026-08-17.
- Estado: `approved_with_conditions`.
- Aprobación humana: usuario, 2026-08-17.
- Alcance: resolución administrativa, cargo fijo, Mercado Pago Checkout Pro,
  Webhooks/conciliación y conformidad del cliente.
- No habilita especificación, implementación, credenciales, cobros,
  publicación ni despliegue.

## Dictamen recomendado

La feature encaja en ADR-004 y en la máquina de estados v1 sin una ADR nueva si
se limita a un único cargo por la oferta congelada, Checkout Pro, confirmación
autoritativa del proveedor y conformidad digital sin firma manuscrita. Toda
edición manual de importes, aprobación humana de pagos, reembolso, contracargo,
pago parcial o cambio de proveedor requiere volver a revisión.

## Condiciones antes de aprobar la especificación

1. Aprobar explícitamente DEC-007-001 a DEC-007-008.
2. Validar Checkout Pro con aplicación y cuentas no productivas: preferencia,
   retornos, firma Webhook vigente, consulta autoritativa, estados aprobado,
   pendiente y rechazado, duplicados/fuera de orden y conciliación.
3. Modelar por separado `Charge`, `PaymentAttempt`, recibo de evento y evidencia
   de conformidad; migraciones aditivas, IDs opacos e historial inmutable.
4. Exigir unicidad de cargo por orden, una preferencia activa, idempotencia por
   comando/evento, versión optimista y comparación de referencia, moneda e
   importe contra la instantánea congelada.
5. Definir timeouts, reintentos acotados, conciliación, tratamiento de
   credenciales y observabilidad sin payloads, tokens, email ni PII en logs.
6. Incorporar matriz de permisos y pruebas negativas: CLIENT cruzado,
   visitante, técnico, ADMIN/DISPATCHER intentando aprobar pagos y proveedor no
   verificado.
7. Versionar el texto de conformidad, limitar la evidencia a actor/versión/UTC
   y mantener retención/borrado como condición legal previa a producción.

## Hallazgos

- `P1`: la PoC existente usa una firma HMAC sintética que no representa el
  esquema oficial vigente de `x-signature`; sólo sirve como prueba del patrón y
  debe reemplazarse en el adaptador real.
- `P1`: aún no existe evidencia de Sandbox/no productiva exigida por ADR-004.
- `P2`: el contrato actual permite a roles operativos `CREATE_FIXED_PAYMENT`;
  la especificación debe separar generación del cargo de aprobación del pago y
  confirmar si ADMIN y DISPATCHER comparten esa facultad.
- `P2`: conformidad sin vencimiento puede dejar órdenes pendientes de manera
  indefinida; es aceptable para el MVP sólo si queda visible operacionalmente y
  no existe cierre administrativo silencioso.

## Condiciones antes de producción

- Aprobar cuenta comercial, tasas, impuestos, límites, términos y rotación de
  secretos de Mercado Pago.
- Completar modelado de amenazas, cifrado en reposo, backup/restauración,
  hardening, monitoreo y respuesta a incidentes.
- Validar legalmente texto, retención y borrado de evidencia comercial,
  identificadores de proveedor y datos personales mínimos.
- Diseñar explícitamente reembolsos, contracargos y soporte antes de aceptar
  dinero real; permanecen fuera de feat-007.

## Puerta solicitada

El usuario confirmó DEC-007-001 a DEC-007-008 y aceptó este dictamen
condicionado el 2026-08-17. La aprobación permite preparar la especificación,
pero no autoriza código ni interacción con credenciales/cobros reales.
