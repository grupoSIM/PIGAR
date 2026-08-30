# Diseño — feat-007: Resolución administrativa, cobro y conformidad

Estado: `verification`; el usuario aceptó el 2026-08-30 el alcance de staging
con conciliación autoritativa y la falla del Webhook automático registrada como
riesgo residual. Esta excepción no habilita producción.

## Resumen y decisiones

La orden sigue siendo el agregado de proceso, pero el dinero se modela fuera de
su estado. Registrar la resolución crea un `Charge` por la oferta congelada y
mueve la orden a `PENDIENTE_PAGO`. Cada interacción con Checkout Pro vive en un
`PaymentAttempt`; cada notificación produce un `WebhookReceipt`; la aceptación
final produce una `ConformityEvidence`. Ninguno de esos registros se reescribe
para ocultar historia.

Checkout Pro permanece detrás de un `PaymentProviderPort`. El retorno del
navegador nunca es autoridad. Webhook y conciliación sólo pueden avanzar después
de consultar la API de Mercado Pago y validar referencia, moneda e importe.

## Componentes implementados

- Contratos: estados/acciones existentes más DTOs de resolución, cargo, intento,
  recibo y conformidad; la matriz deberá separar `CREATE_FIXED_PAYMENT` operativo
  de `APPLY_VERIFIED_PROVIDER_PAYMENT`.
- API: comandos y proyecciones CLIENT/ADMIN, receptor Webhook público y adaptador
  Mercado Pago.
- Worker: procesamiento de recibos y conciliación.
- PostgreSQL/Prisma: migración aditiva y restricciones.
- Customer web: resumen, botón pagar/retomar, estado en verificación y conformidad.
- Admin web: resolución, cargo inmutable, historial mínimo y alertas.

## Modelo de dominio y datos

| Entidad                    | Campos mínimos                                                                                                                                        | Invariantes                                                                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `AdministrativeResolution` | ID opaco, orderId, outcome, summary, actorId opaco, createdAt UTC                                                                                     | Única por orden; append-only; resumen 1..500.                                                                                        |
| `Charge`                   | ID opaco, orderId, requestId, categorySnapshot, offerVersion, currency, amount decimal, status, createdAt                                             | Único por orden; `ARS`; copia exacta del snapshot; no editable.                                                                      |
| `PaymentAttempt`           | ID opaco, chargeId, sequence, state, externalReference, providerPreferenceId nullable, providerPaymentId nullable, creationStatus, timestamps/version | Secuencia única; referencia e IDs proveedor únicos; a lo sumo uno activo (`CREATED`/`PENDING`) por cargo; estados monotónicos.       |
| `WebhookReceipt`           | ID, provider, topic, providerEventId/hash, dataId hash o cifrado, requestId hash, signatureStatus, receivedAt, processedAt, outcome, retryCount       | Dedupe por proveedor/tópico/evento o fingerprint estable; sin payload crudo ni secretos; append-only salvo estado técnico/reintento. |
| `ConformityEvidence`       | ID opaco, orderId, clientSubjectHash/ID opaco, textVersion, acceptedAt UTC                                                                            | Única por orden; sólo propietario; append-only; sin firma/PII adicional.                                                             |
| `PaymentReconciliationJob` | attemptId, dueAt, lease, count, lastOutcome                                                                                                           | Lease transaccional, reintentable y recuperable; no duplica intentos.                                                                |

Restricciones PostgreSQL previstas: `UNIQUE(order_id)` para resolución/cargo y
conformidad; `UNIQUE(charge_id, sequence)`, `UNIQUE(external_reference)` y
unicidad parcial de intento activo; FKs `RESTRICT`; checks de ARS/importe positivo;
triggers append-only donde corresponda; índices por estado/edad para worker.

## Máquina de estados

```text
Orden:
TRABAJO_FINALIZADO
  -- resolución + cargo (ADMIN/DISPATCHER) --> PENDIENTE_PAGO
  -- pago APPROVED consultado por proveedor --> PENDIENTE_CONFORMIDAD
  -- conformidad CLIENT propietario --------> CERRADA

Intento:
CREATED --> PENDING --> APPROVED
   |          |------> REJECTED
   |          `------> CANCELLED
   |------> APPROVED | REJECTED | CANCELLED
```

`APPROVED` es terminal. Estados proveedor desconocidos, `refunded` o
`charged_back` no se proyectan silenciosamente: generan discrepancia bloqueada y
alerta porque su tratamiento está fuera de alcance. Un intento rechazado o
cancelado permite el siguiente; uno creado/pending/approved no.

## Flujos transaccionales

### Resolución y cargo

1. Autorizar ADMIN/DISPATCHER y validar `Idempotency-Key`, versión y estado.
2. Bloquear orden/snapshot; validar oferta congelada.
3. Insertar resolución y cargo, actualizar versión/estado e insertar transición.
4. Confirmar todo o nada; reservar resultado idempotente ligado al hash del
   comando.

### Crear o retomar intento

1. Autorizar propietario, bloquear cargo e intento activo.
2. Reutilizar intento activo con preferencia válida o insertar intento local
   `CREATED` y referencia opaca.
3. Construir preferencia mínima: un ítem genérico “Servicio PIGAR”, cantidad 1,
   `ARS`, importe exacto, `external_reference`, `back_urls` HTTPS y
   `notification_url` HTTPS del receptor. La evidencia de staging del 2026-08-30
   confirmó que sin `notification_url` no se emiten entregas automáticas para las
   preferencias de prueba, aunque el simulador de la aplicación responda 200.
   Omitir `payer`, domicilio, multimedia, diagnóstico y texto libre.
4. La API oficial de creación de preferencias consultada el 2026-08-17 documenta
   `Authorization`, no `X-Idempotency-Key`. Por ello, PIGAR no presupone esa
   garantía: serializa localmente, persiste la referencia antes de llamar y, ante
   timeout/respuesta ambigua, marca `UNKNOWN` y busca por referencia durante la
   conciliación antes de volver a crear. Si Mercado Pago documenta idempotencia
   para este endpoint al implementar, se agrega como defensa adicional después de
   validarla.
5. Persistir sólo preferenceId y URL de inicio mientras sea necesaria; nunca
   loguearla. Validar `https` y allowlist de host antes de devolverla.

### Webhook y consulta autoritativa

1. Limitar tamaño/método/tópico; extraer `x-signature`, `x-request-id` y
   `data.id` sin confiar en el cuerpo; validar `ts` oficial en segundos o
   milisegundos dentro de la misma ventana anti-replay.
2. Validar con SDK oficial compatible o con el algoritmo oficial vigente. La
   documentación consultada usa `x-signature: ts=...,v1=...` y el manifest
   `id:[data.id];request-id:[x-request-id];ts:[ts];` para HMAC SHA-256. La
   implementación deberá fijar versión del SDK y pruebas oficiales, no reutilizar
   la firma sintética de la PoC.
3. Exigir comparación constant-time y skew máximo configurable inicial de 5 min;
   deduplicar/fingerprintear para replay. Persistir recibo mínimo y encolar.
4. Responder 2xx sólo tras persistir/identificar el duplicado; 400 al esquema
   inválido y 401 a firma inválida.
5. El worker usa el Access Token sólo en backend para `GET /v1/payments/{id}` o
   búsqueda por `external_reference`. Compara referencia, `currency_id` e
   `transaction_amount`; luego aplica transición monotónica bajo lock/versión.

## API interna y eventos

El contrato HTTP está en `api-contract.yaml`. Eventos internos previstos:

- `charge.created.v1`
- `payment-attempt.preference-requested.v1`
- `payment-webhook.received.v1`
- `payment-attempt.status-observed.v1`
- `payment.approved.v1`
- `client-conformity.accepted.v1`

Son eventos internos/cola, no Webhooks públicos; contienen IDs opacos, estado y
UTC, nunca secretos o payload proveedor.

## Experiencia por actor

- ADMIN/DISPATCHER: sobre `TRABAJO_FINALIZADO`, eligen resultado y resumen;
  visualizan cargo bloqueado e historial. No existe control “aprobar pago”.
- CLIENT: ve resolución e importe; “Pagar” crea/retoma Checkout. Al volver ve
  “Estamos verificando” hasta que el backend confirme. Rechazo/cancelación ofrece
  reintentar; pendiente ofrece retomar/actualizar. Tras aprobación ve texto
  versionado y botón explícito de conformidad.
- Disconformidad: se muestra el canal operativo existente fuera de PIGAR; la
  orden queda pendiente. No hay rechazo irreversible ni reclamo interno.

## Seguridad, privacidad y permisos negativos

La autorización se realiza en servidor por rol, propiedad, estado y versión.
CLIENT cruzado/visitante/técnico reciben 404/401 según corresponda. ADMIN y
DISPATCHER no pueden iniciar checkout, aplicar `APPROVED` ni conformar. El receptor
no es un actor confiable hasta validar firma y consulta. El worker usa la mínima
credencial de aplicación, fuera del repositorio, separada por ambiente y rotada.

Datos al proveedor: referencia opaca, título genérico, cantidad, ARS e importe.
El email se omite; si una validación demuestra que es obligatorio, se vuelve a
decisión humana de privacidad antes de implementarlo. Logs: correlation ID, IDs
opacos/hash, estado/código, latencia, contador y UTC; nunca URL de Checkout,
headers de firma/autorización, payload, PII o texto libre.

## Reintentos, conciliación y degradación

- Timeout inicial: conexión 3 s, total 10 s; configurable y probado.
- Consulta autoritativa: hasta 3 intentos inmediatos con backoff exponencial y
  jitter; respetar `Retry-After` en 429.
- Conciliación: worker cada 5 min para recibos listos e intentos activos; ventanas
  a 1, 5 y 15 min y luego cada 30 min hasta 24 h. Después quedan visibles/alertados
  y se siguen conciliando a menor frecuencia definida operativamente.
- 400 semántico: no retry; corregir/marcar discrepancia. 401/403: circuito abierto
  y alerta crítica. 408/429/5xx/red: retry seguro. Nunca crear otro intento para
  resolver incertidumbre.
- Proveedor caído: cobrar/conformar se degrada, pero consultas de orden siguen
  disponibles y el estado no avanza.

## Observabilidad

Métricas: preferencias creadas/reutilizadas/ambiguas; intentos por estado/edad;
firmas inválidas/replays; cola/recibos sin procesar; consultas por resultado;
discrepancias de referencia/dinero; transiciones aprobadas; conformidades
pendientes por edad. Alertas: 401/403 proveedor, discrepancia, cola envejecida,
tasa sostenida de firma inválida, intentos activos >24 h. Dashboard/logs no
incluyen PII.

## Migración, despliegue y forward-fix

1. Migración aditiva crea tablas, constraints e índices sin cambiar filas
   existentes ni activar endpoints.
2. Desplegar código compatible con tablas vacías; mantener feature flag de
   creación de cargo, Webhook y worker desactivado.
3. Validar migración/constraints con datos sintéticos, adaptador mock y luego
   aplicación/cuentas no productivas.
4. Activar en staging sólo tras autorización de despliegue separada.
5. Rollback previo a tráfico: volver aplicación conservando tablas. Tras crear
   evidencia, sólo forward-fix; nunca `down` destructivo ni borrado de pagos.

## Validación oficial y riesgo pendiente

Fuentes oficiales consultadas el 2026-08-17:

- https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/payment-notifications
- https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-test
- https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-test/test-purchases
- https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro/preferences/create-preference/post
- https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro/search-payments/get

La documentación confirma cuentas de prueba, escenarios aprobado/pendiente/
rechazado, preferencias, `external_reference`, Webhooks firmados y consulta. No
existe evidencia de ejecución contra una aplicación PIGAR no productiva en esta
sesión. La acción humana exacta se detalla en `test-plan.md` y bloquea aprobación
funcional, no la redacción de estos artefactos.
