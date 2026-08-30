# Diagnóstico de Webhooks Mercado Pago con HTTP 401 — feat-007

## Alcance

Este runbook aplica sólo a Checkout Pro en staging no productivo. La consulta
autoritativa y la conciliación siguen siendo obligatorias, pero no sustituyen la
autenticación del Webhook. Nunca se desactiva la firma, se aceptan eventos sin
validar ni se usan credenciales productivas.

## Hechos confirmados

- Checkout Pro usa el tópico `payment`. La guía vigente entrega
  `x-signature`, `x-request-id` y `data.id`, y su ejemplo JavaScript delega la
  validación en `WebhookSignatureValidator` del SDK oficial.
- El manifest documentado por Mercado Pago es
  `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` y el resultado se compara
  con `v1` mediante HMAC-SHA256 en tiempo constante.
- La URL incluida en la preferencia tiene prioridad sobre la URL configurada en
  Tus integraciones. Por eso un pago real puede llegar a una URL/configuración
  distinta de la elegida en el simulador.
- El simulador permite seleccionar URL de prueba o productiva y solicita que el
  operador ingrese un `Data ID`. Ese valor no prueba que la aplicación, cuenta,
  credenciales y preferencia del pago real pertenezcan al mismo contexto.
- Mercado Pago espera HTTP 200/201; si no lo recibe reintenta inicialmente cada
  15 minutos y luego amplía el intervalo.
- El esquema OpenAPI oficial publicado por Mercado Pago marca como obligatorios
  sólo `id`, `type` y `data`. Los demás campos del ejemplo de Checkout Pro no son
  una base segura para rechazar una notificación mínima.
- PIGAR estaba devolviendo 401 tanto por esquema como por firma y exigía
  `action`, `api_version` y `date_created`. Esto explica de forma confirmada los
  registros `WEBHOOK_SCHEMA_INVALID`, aunque no demuestra por sí solo el HMAC
  inválido de los eventos automáticos observados.
- PIGAR fija `mercadopago` 3.6.0 y ahora usa su validador oficial como única vía
  de aceptación. La clave se lee una vez al iniciar el controller desde
  `MERCADO_PAGO_WEBHOOK_SECRET`; no existe fallback a Access Token, Public Key u
  otra variable.

## Hipótesis ordenadas y prueba mínima

| Probabilidad | Hipótesis                                                                                                               | Estado                                                      | Prueba segura y evidencia esperada                                                                                                                                                                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta         | El esquema local anterior convertía una variación legítima del cuerpo en 401.                                           | Confirmada y corregida localmente.                          | Enviar un vector sintético correctamente firmado con cuerpo mínimo. Debe responder 200; un cuerpo inválido debe responder 400, nunca 401.                                                                                                                           |
| Alta         | El HMAC recibido fue calculado con un `data.id` o `x-request-id` distinto del que llegó al SDK por URL/proxy/framework. | Hipótesis.                                                  | Repetir un evento y conservar sólo el código diagnóstico. `*_EVENT_ID_MATCH`, `*_BODY_DATA_ID_MATCH`, `*_LOWERCASE_DATA_ID_MATCH`, `*_REQUEST_ID_FIRST_VALUE_MATCH` o `*_WITHOUT_REQUEST_ID_MATCH` identifica el componente divergente; ninguno autoriza el evento. |
| Alta         | La entrega automática dependía de `notification_url` en la preferencia de prueba.                                       | Confirmada en staging.                                      | Conservar `notification_url`: al omitirla no hubo entrega automática, aunque el simulador respondió 200. Rechazar IPN `id/topic` y diagnosticar separadamente el Webhook `data.id/type` firmado.                                                                    |
| Media        | Simulador y pago real usan URL o contexto distintos.                                                                    | Hipótesis.                                                  | Ejecutar un simulador seleccionando explícitamente la URL de prueba y luego un pago automático. Comparar únicamente HTTP, código seguro, presencia singular de headers y modo de origen `simulator/automatic`.                                                      |
| Media-baja   | `x-request-id` fue reemplazado, fusionado o duplicado entre Traefik, Nginx y NestJS.                                    | Hipótesis.                                                  | Probar el mismo vector sintético directo al controller y a través de Nginx. Ambos deben dar 200. Arrays o valores fusionados deben rechazarse sin persistencia.                                                                                                     |
| Baja         | Timestamp fuera de ventana o reloj del contenedor desviado.                                                             | Parcialmente descartada en eventos donde `ts` fue aceptado. | Comparar hora UTC del contenedor con una fuente confiable y ejecutar límites sintéticos de ±5 minutos en segundos y milisegundos. Registrar sólo el bucket de desvío.                                                                                               |
| Baja         | Diferencia de casing de `data.id`.                                                                                      | Poco probable para IDs numéricos.                           | El modo sombra prueba la variante lowercase pero mantiene 401. La suite también demuestra que el camino oficial conserva casing.                                                                                                                                    |
| Baja         | Defecto del SDK o de la firma emitida por Mercado Pago.                                                                 | No confirmado.                                              | Si todos los componentes exactos y el secreto de la misma aplicación están verificados y el SDK devuelve `SignatureMismatch`, abrir soporte con una reproducción mínima sanitizada.                                                                                 |

## Diferencias entre simulador y evento automático

El simulador es una entrega manual contra una URL seleccionada por el operador y
con `Data ID` ingresado manualmente. El evento automático nace de un pago creado
con credenciales de prueba y usa la URL efectiva de la transacción. Mercado Pago
documenta que una `notification_url` de la preferencia prevalece sobre el panel;
staging confirmó que debe conservarse para recibir entregas automáticas en este
flujo de prueba. Aplicación, cuenta, credenciales, modo, URL, tópico y clave ya
fueron verificados por el operador y no deben volver a proponerse como prueba.
Que el simulador responda 200 no demuestra que el evento automático vaya a
emitirse ni que use el mismo contexto de firma.

## Integraciones públicas comparables

- La discusión pública
  [sdk-nodejs #318](https://github.com/mercadopago/sdk-nodejs/discussions/318)
  documenta el patrón “simulación válida, entrega real inválida” en Node.js. El
  mantenedor no publicó una causa raíz y derivó el caso a soporte; las soluciones
  propuestas por usuarios son anecdóticas y no se toman como contrato.
- El repositorio oficial
  [mercadopago/sdk-nodejs](https://github.com/mercadopago/sdk-nodejs) contiene el
  validador utilizado por PIGAR. Las notas públicas de versiones documentan una
  corrección para preservar el casing de `data.id`; PIGAR no aplica lowercase en
  el camino de autorización.
- El mock público
  [ahoulgrave/mercadopago-mock-server](https://github.com/ahoulgrave/mercadopago-mock-server)
  reproduce el manifest documentado y sirve sólo como referencia de integración,
  no como evidencia de comportamiento de la plataforma real.

## Diagnóstico temporal y retiro antes de producción

Identificador: `TEMP-007-WEBHOOK-DIAGNOSTICS`.

Se exponen temporalmente sólo estos datos técnicos:

- códigos enumerados de esquema, timestamp, header, mismatch y variante sombra;
- `WEBHOOK_CONFIGURED`/`WEBHOOK_CONFIG_MISSING` al iniciar;
- `correlation_id` sintético generado por PIGAR y UTC del log, nunca un ID de
  Mercado Pago;
- HTTP y condición de duplicado ya existente;
- conteos, UTC y buckets de tiempo sin valores originales.

No se exponen secreto, firma, manifest, headers completos, payload, IDs completos,
email, cuenta, URL firmada ni datos de tarjeta. Antes de producción se deben
retirar las variantes sombra y el código de configuración de arranque, conservar
la validación oficial, 400/401 diferenciados, límites, deduplicación y métricas
agregadas, retirar de `publish-staging-images.yml` el disparador temporal de la
rama `codex/feat-007-webhook-diagnostics`, y ejecutar una búsqueda de los códigos
`TEMP-007`/`WEBHOOK_SIGNATURE_*_MATCH`.

## Evidencia para soporte si continúa el 401

Abrir el caso por el canal oficial de Mercado Pago y adjuntar, sin secretos ni
datos personales:

1. país, Checkout Pro, entorno de prueba y versión exacta del SDK/runtime;
2. UTC y resultado HTTP de un intento automático y uno del simulador;
3. confirmaciones booleanas de misma aplicación, credenciales de prueba, URL
   efectiva y clave Webhook;
4. motivo seguro del SDK y resultado de los diagnósticos sombra;
5. confirmación de header único, query `data.id` único, reloj dentro de ventana y
   ausencia de redirect;
6. pasos mínimos y expectativa 200 frente al 401 observado.

El propio
[SUPPORT.md del SDK](https://github.com/mercadopago/sdk-nodejs/blob/master/SUPPORT.md)
indica usar soporte oficial para configuración de Webhooks en una cuenta y no
publicar credenciales ni datos de transacciones.

## Fuentes primarias

- [Mercado Pago — Configurar notificaciones de pago de Checkout Pro](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/payment-notifications)
- [Mercado Pago — Notificaciones de Checkout Pro](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/notifications)
- [Mercado Pago — Crear aplicación y credenciales de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/create-application)
- [Mercado Pago — Compras de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-test/test-purchases)
- [OpenAPI oficial — esquema de Webhooks](https://github.com/mercadopago/openapi/blob/main/schemas/webhooks.yaml)
- [SDK Node oficial](https://github.com/mercadopago/sdk-nodejs)
