# Requisitos — feat-007: Resolución administrativa, cobro y conformidad

- Estado: `verification` — alcance funcional de staging aceptado por el usuario
  el 2026-08-30 con conciliación autoritativa, riesgo Webhook documentado y
  compuerta de publicación de imágenes en verificación.
- Arquitectura: `approved_with_conditions`, usuario, 2026-08-17.
- Dependencias: feat-003 y feat-005 cerradas.
- Límite: esta especificación no autoriza código, migraciones, credenciales,
  cobros, commit, push, PR ni despliegue.

## Objetivo y alcance

Completar el camino de Visita Simple desde `TRABAJO_FINALIZADO`: registrar una
resolución administrativa, crear un único cargo por la oferta congelada,
gestionar intentos históricos de Checkout Pro, aceptar como pago únicamente una
consulta autoritativa a Mercado Pago y cerrar sólo con conformidad explícita del
CLIENT propietario.

## Fuera de alcance

Presupuestos complejos, pagos parciales, señas, cuotas propias, descuentos,
propinas, edición de importe, pagos embebidos, tarjetas guardadas, reembolsos,
devoluciones, contracargos, cierre administrativo sustituto, firma manuscrita,
reclamos, garantías, calificaciones, notificaciones externas y producción.

## Actores y permisos

| Actor                              | Permitido                                                                             | Prohibido                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| CLIENT propietario                 | Leer resumen/cargo propio, iniciar o retomar Checkout y conformar tras pago aprobado. | Acceder a otra orden, editar cargo/resolución, aprobar pagos o conformar antes de tiempo.            |
| ADMIN                              | Leer operación y registrar resolución/cargo.                                          | Editar el importe congelado, iniciar Checkout por el cliente, aprobar pagos o sustituir conformidad. |
| DISPATCHER                         | Igual que ADMIN para resolución y cargo.                                              | Administrar configuración/secreto del proveedor, aprobar pagos o sustituir conformidad.              |
| Proveedor verificado / worker      | Consultar autoritativamente, conciliar y aplicar resultados válidos.                  | Alterar cargo, resolución o conformidad; avanzar sin validación de referencia, moneda e importe.     |
| Visitante, CLIENT cruzado, técnico | Ningún acceso.                                                                        | Toda lectura o mutación de esta feature.                                                             |

## Requisitos funcionales

### REQ-007-001 — Resolución administrativa y cargo único

- When: ADMIN o DISPATCHER registra la resolución de una orden
  `TRABAJO_FINALIZADO` con versión esperada.
- The system shall: aceptar `RESUELTO_EN_VISITA` o `REQUIERE_PRESUPUESTO`, un
  resumen visible al cliente de 1 a 500 caracteres, crear en la misma
  transacción una resolución inmutable y un único `Charge`, y aplicar
  `CREATE_FIXED_PAYMENT` hacia `PENDIENTE_PAGO` con historial append-only.
- Errores y límites: una clave idempotente repetida con el mismo payload devuelve
  el resultado original; payload distinto, versión obsoleta, estado incorrecto,
  resumen inválido o cargo previo devuelven conflicto sin efectos parciales.

### REQ-007-002 — Importe congelado e inmutable

- The system shall: copiar al cargo exclusivamente categoría, versión de oferta,
  moneda e importe decimal de la instantánea confirmada en la solicitud.
- Errores y límites: no existe campo HTTP para editar, bonificar o agregar
  conceptos; falta o inconsistencia de snapshot bloquea el cargo. Sólo `ARS`,
  cantidad 1 y aritmética decimal segura son válidos en este incremento.

### REQ-007-003 — Inicio idempotente de Checkout

- When: el CLIENT propietario pulsa pagar sobre una orden `PENDIENTE_PAGO`.
- The system shall: crear o reutilizar un único `PaymentAttempt` activo asociado
  al cargo, generar una referencia externa opaca única y obtener una preferencia
  de Checkout Pro con título genérico, ARS e importe exacto; devolver sólo una
  URL HTTPS de inicio previamente validada contra hosts oficiales configurados.
- Errores y límites: `CREATED` o `PENDING` se reutiliza y concilia; sólo un intento
  `REJECTED` o `CANCELLED` permite uno nuevo. Carreras dejan un único intento
  activo. Un resultado ambiguo al crear la preferencia no habilita otro intento:
  queda recuperable por referencia externa.

### REQ-007-004 — Retornos no autoritativos

- The system shall: tratar `success`, `pending` y `failure`, y todo parámetro de
  retorno, únicamente como señal para mostrar “Estamos verificando el pago” y
  disparar una consulta segura del estado local.
- Errores y límites: el retorno jamás cambia `PaymentAttempt`, `Charge` ni orden,
  aunque declare `approved` o incluya un ID de pago.

### REQ-007-005 — Recibo Webhook autenticado y minimizado

- When: Mercado Pago envía un Webhook HTTPS del tópico `payment`.
- The system shall: validar el esquema oficial vigente de firma con
  `x-signature`, su `ts`/`v1`, `x-request-id`, `data.id` y el secreto de la
  aplicación; exigir ventana temporal configurada, registrar un
  `WebhookReceipt` deduplicable y encolar procesamiento antes de responder.
- Errores y límites: firma ausente/inválida, timestamp fuera de ventana, tópico
  no permitido o ID inválido no consulta ni muta pagos. El recibo conserva IDs
  opacos/hash, resultado de firma, UTC e intento de proceso, nunca cuerpo crudo,
  secreto, token, email o PII.

### REQ-007-006 — Consulta autoritativa y aplicación monotónica

- When: se procesa un recibo válido o una conciliación.
- The system shall: consultar el pago autenticadamente por API y comparar
  referencia externa, moneda e importe con el intento/cargo antes de mapear el
  estado proveedor a `PENDING`, `APPROVED`, `REJECTED` o `CANCELLED`.
- Errores y límites: sólo `APPROVED` válido aplica idempotentemente
  `CONFIRM_PROVIDER_PAYMENT` y mueve la orden a `PENDIENTE_CONFORMIDAD`.
  `PENDING`/`REJECTED`/`CANCELLED` no adelantan la orden. Eventos duplicados,
  obsoletos o fuera de orden no revierten un estado terminal; discrepancias
  quedan bloqueadas para revisión operativa, sin aprobación manual.

### REQ-007-007 — Conciliación y reintentos

- The system shall: conciliar intentos `CREATED`/`PENDING`, recibos no procesados
  y creaciones ambiguas con reintentos acotados, backoff exponencial con jitter,
  respeto de `Retry-After` y una cola recuperable.
- Errores y límites: timeouts, 429 y 5xx mantienen la orden
  `PENDIENTE_PAGO`; 401/403, firma/configuración inválida o discrepancia de dinero
  abren alerta y no se reintentan ciegamente. Después del máximo inmediato, el
  worker periódico continúa la conciliación sin crear un intento adicional.

### REQ-007-008 — Proyección segura por actor

- The system shall: mostrar al CLIENT propietario resolución, snapshot de cargo,
  estado seguro (`PENDIENTE`, `APROBADO`, `RECHAZADO` o `CANCELADO`) y acción
  permitida; ADMIN/DISPATCHER ven además historial técnico mínimo y alertas de
  conciliación.
- Errores y límites: ninguna proyección expone tokens, secreto, payload Webhook,
  URL persistida, email del pagador, medio de pago completo, IDs internos o datos
  de otra solicitud. Recursos no accesibles responden 404 para evitar enumeración.

### REQ-007-009 — Conformidad explícita e idempotente

- When: el CLIENT propietario confirma sobre `PENDIENTE_CONFORMIDAD` con versión
  esperada y versión de texto presentada.
- The system shall: crear una única `ConformityEvidence` append-only con actor
  opaco, versión del texto y UTC, aplicar `CONFIRM_CLIENT_CONFORMITY` y cerrar la
  orden en una transacción.
- Errores y límites: reintento idéntico devuelve el cierre existente; pago no
  aprobado, actor cruzado, texto desactualizado, versión de orden obsoleta o
  estado incorrecto se rechazan. No hay firma, biometría, ubicación ni cierre
  administrativo. Sin conformidad la orden permanece visible en
  `PENDIENTE_CONFORMIDAD` sin vencimiento automático.

### REQ-007-010 — Auditoría comercial y operacional

- The system shall: auditar resolución/cargo, creación/reutilización de intento,
  validación de recibo, conciliación, discrepancia, aprobación autoritativa y
  conformidad con actor/tipo, acción, resultado, IDs opacos, correlation ID y UTC.
- Errores y límites: logs y auditoría no contienen payloads, URLs de checkout,
  credenciales, firma, emails, domicilios, diagnóstico libre ni datos de tarjeta.

## Requisitos no funcionales

- NFR-007-001 — Consistencia: transacciones PostgreSQL, restricciones únicas,
  versionado optimista e historial append-only preservan cargo único, intento
  activo único, recibo único y conformidad única bajo concurrencia.
- NFR-007-002 — Seguridad: TLS, secretos sólo por configuración externa separada
  por ambiente, rotables, rate limiting, firma oficial vigente y pruebas de
  replay/permiso negativo.
- NFR-007-003 — Privacidad: payload mínimo al proveedor; no enviar domicilio,
  multimedia, diagnóstico, teléfono, técnico ni texto libre. El email se omite
  salvo requisito técnico confirmado y aprobación humana posterior.
- NFR-007-004 — Resiliencia: llamadas salientes con timeout, reintentos seguros,
  cola persistente, conciliación periódica y degradación sin adelantar la orden.
- NFR-007-005 — Observabilidad: métricas de intentos activos por edad/estado,
  recibos inválidos/no procesados, reintentos, discrepancias y latencia/error del
  proveedor; alertas sin PII.
- NFR-007-006 — Migración: cambios aditivos y forward-only, FKs restrictivas,
  índices/unicidades explícitos, backfill sólo sintético o determinista y
  forward-fix documentado; rollback de aplicación compatible antes de activar
  tráfico, nunca borrado de evidencia comercial.
- NFR-007-007 — Rendimiento: endpoints de comando responden sin esperar procesos
  largos; recepción Webhook persiste/encola y acusa recibo dentro del timeout del
  proveedor. Objetivos medibles se validan localmente con p95 < 500 ms sin llamada
  externa y consulta/proveedor limitada por timeout de 10 s.
- NFR-007-008 — Retención: identificadores de pago y conformidad se conservan
  hasta definir base/plazo legal; el paso a producción queda bloqueado hasta
  aprobar retención, borrado y tratamiento de contracargos/reembolsos.
- NFR-007-009 — Publicación segura de staging: las imágenes OCI de un SHA de
  `staging` se construyen y publican únicamente después de que todas las
  categorías bloqueantes de calidad del mismo SHA finalizan correctamente. Un
  fallo o cancelación de calidad omite la publicación; `main` y otras ramas no
  publican imágenes de staging.

## Dependencias y validación pendiente

- ADR-004 y decisiones DEC-007-001 a DEC-007-008 aprobadas.
- La validación Mercado Pago no productiva fue ejecutada parcialmente. La
  preferencia, los retornos no autoritativos, la consulta oficial y los estados
  aprobado, pendiente y rechazado fueron observados; la conciliación recuperó
  un pago aprobado. La entrega Webhook automática moderna continúa respondiendo
  401 por firma inválida, aunque el simulador responde 200. El usuario aceptó
  esta excepción sólo para cerrar el alcance de staging. Producción permanece
  bloqueada hasta resolver y validar extremo a extremo AC-007-016.
