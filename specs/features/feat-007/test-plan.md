# Plan de pruebas — feat-007: Resolución administrativa, cobro y conformidad

## Alcance y riesgos

La suite debe demostrar que dinero, orden e historia no divergen ante carreras,
reintentos, Webhooks falsificados/duplicados/fuera de orden, retornos engañosos,
caídas del proveedor o acceso cruzado. Los resultados del mock contractual no se
presentan como evidencia de Mercado Pago: TEST-007-014 es una validación separada
con aplicación y cuentas no productivas.

## Matriz de pruebas

| ID           | Nivel                   | Escenario/AC                                                                                                                            | Comando previsto                                                                                        | Estado                                                  |
| ------------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| TEST-007-001 | unit                    | Estados de orden/intento, importe congelado, resolución y conformidad (AC-007-001, 003, 011).                                           | `pnpm test:unit -- --grep feat-007`                                                                     | pass local — 2026-08-29, 19/19                          |
| TEST-007-002 | unit/concurrency        | Idempotencia del cargo e intento activo; payload incompatible y creación ambigua (AC-007-002, 004).                                     | `pnpm test:unit -- --grep payment-idempotency`                                                          | pass dentro de suite feat-007                           |
| TEST-007-003 | contract                | Retornos success/pending/failure no mutan dominio; OpenAPI/error contract (AC-007-005, 012).                                            | `pnpm test:integration -- --grep payment-contract`                                                      | pass contrato local + validación staging                |
| TEST-007-004 | unit/security           | Vectores oficiales de `x-signature`, timestamp, constant-time, firma inválida, replay y tópico (AC-007-006).                            | `pnpm test:security -- --grep mercado-pago-webhook`                                                     | pass local — 2026-08-29                                 |
| TEST-007-005 | PostgreSQL              | Migración, constraints, transacción resolución/cargo/orden, versión e historial append-only (AC-007-001, 002, 008, 014).                | `pnpm test:integration -- --grep feat-007-postgres`                                                     | pass PostgreSQL — 2026-08-27                            |
| TEST-007-006 | PostgreSQL/concurrency  | Webhook duplicado/fuera de orden, único intento activo y conformidad concurrente (AC-007-004, 007, 011).                                | `pnpm test:integration -- --grep payment-concurrency`                                                   | pass PostgreSQL — 2026-08-27/30                         |
| TEST-007-007 | HTTP/security           | Receptor persiste mínimo, limita tamaño/rate y no consulta con firma inválida (AC-007-006).                                             | `pnpm test:security -- --grep payment-webhook-http`                                                     | pass local — 2026-08-30, incluido Nginx/PostgreSQL real |
| TEST-007-008 | integration/mock        | Consulta autoritativa, mismatch, estados, timeout/429/5xx, Webhook perdido y conciliación (AC-007-007 a 009).                           | `pnpm test:integration -- --grep payment-provider`                                                      | pass local + recuperación staging                       |
| TEST-007-009 | security                | Matriz negativa y sanitización de proyecciones/auditoría/logs (AC-007-003, 010, 013).                                                   | `pnpm test:security -- --grep feat-007-permissions`                                                     | pass dentro de suite security feat-007                  |
| TEST-007-010 | resilience              | Backoff+jitter, Retry-After, lease de worker, recuperación y antigüedad >24 h (AC-007-009).                                             | `pnpm test:integration -- --grep payment-reconciliation`                                                | pass local + recuperación staging                       |
| TEST-007-011 | migration/privacy       | Forward-only/forward-fix, configuración sin secretos y escaneo de filtraciones (AC-007-013, 014).                                       | `pnpm test:security -- --grep payment-data`                                                             | pass local/configuración; producción sigue bloqueada    |
| TEST-007-012 | frontend E2E            | ADMIN resuelve; CLIENT vuelve sin confirmación, ve estados y conforma; permisos negativos (AC-007-005, 010 a 012, 015).                 | `pnpm test:e2e:frontends`                                                                               | pass — CLIENT 5/5, ADMIN 4/4                            |
| TEST-007-013 | technical E2E           | Flujo completo con PostgreSQL y proveedor mock: aprobado, pendiente y rechazo/reintento (AC-007-015).                                   | `pnpm test:e2e`                                                                                         | pass — 25/25; completado por TEST-007-012               |
| TEST-007-014 | non-production provider | Aplicación/cuentas Mercado Pago, preferencia, retornos, firma, consulta, estados, duplicado/fuera de orden y conciliación (AC-007-016). | Manual asistida + harness no productivo, comando a definir sin secretos                                 | excepción staging — Webhook real responde 401           |
| TEST-007-015 | quality                 | Formato, lint, tipos/build, documentación y diff.                                                                                       | `pnpm format:check`; `pnpm lint`; `pnpm typecheck`; `pnpm build`; `pnpm docs:check`; `git diff --check` | pass — 2026-08-30                                       |
| TEST-007-016 | CI/release              | Imágenes del mismo SHA se publican sólo si calidad completa pasa en `staging`; fallo/cancelación las omite (AC-007-017).                | `pnpm test:ci-contract`; inspección de dependencias y ejecución remota de GitHub Actions                | pendiente                                               |

## Matriz focalizada del diagnóstico 401

Los IDs siguientes conservan el listado acordado para esta investigación y no
reemplazan TEST-007-004/007/014.

| IDs                   | Cobertura                                                                                          | Estado al 2026-08-30                                                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TEST-007-WH-001 a 004 | Fuente única `MERCADO_PAGO_WEBHOOK_SECRET`, valor sentinel, Compose y señal de configuración       | pass; `WEBHOOK_CONFIGURED` observado tras el despliegue sin registrar el valor                                                                                     |
| TEST-007-WH-005 a 010 | Manifest oficial, mutación aislada, `data.id`, casing, duplicados y lowercase                      | pass local                                                                                                                                                         |
| TEST-007-WH-011 a 016 | Camino oficial y variantes sombra de body/event/lowercase/request-id; ninguna variante autoriza    | pass local                                                                                                                                                         |
| TEST-007-WH-017 a 022 | Cuerpo oficial mínimo, eventos observados, igualdad query/body, 400/401 y códigos seguros          | pass local                                                                                                                                                         |
| TEST-007-WH-023 a 028 | Controller/Nest, query con punto, headers, redirects, guard global y configuración Nginx           | pass local, incluido TEST-007-WH-024 a través de Nginx real                                                                                                        |
| TEST-007-WH-029 a 032 | `ts` segundos/milisegundos, ventana ±5 min y reloj del contenedor                                  | pass local, incluido TEST-007-WH-032 dentro del contenedor                                                                                                         |
| TEST-007-WH-033 a 035 | Retry, duplicado válido y evento fuera de orden                                                    | 034-035 pass local; 033 incluido en la excepción de staging de TEST-007-014                                                                                        |
| TEST-007-WH-036 a 041 | Simulador, evento automático, comparación segura, retry real, orden/duplicado y pérdida controlada | simulador 200; sin `notification_url` no hubo entrega automática; con ella llegan IPN 400 y Webhook 401; no repetir validaciones de aplicación/cuenta/credenciales |

## Casos negativos obligatorios

- Visitante sin token; CLIENT de otra solicitud; sujeto TECHNICIAN inexistente.
- ADMIN/DISPATCHER iniciando Checkout, aplicando `APPROVED` o conformando.
- Proveedor sin firma, firma alterada, secreto equivocado, timestamp viejo/futuro,
  `data.id` divergente, tópico desconocido, replay exacto y evento duplicado.
- Retorno del navegador manipulado con `status=approved`/payment ID ajeno.
- Pago consultado con referencia, ARS o importe divergente; estado desconocido,
  refunded o charged_back.
- Doble submit, mismas/diferentes idempotency keys, versión obsoleta y 20 comandos
  concurrentes para cargo, intento, recibo y conformidad.
- Timeout antes/después de respuesta de preferencia, DNS/TLS, 429 con
  `Retry-After`, 401/403, 400, 408 y 5xx.
- Intento pendiente que envejece, worker reiniciado durante lease y Webhook
  perdido recuperado sólo por búsqueda/consulta.

## Fixtures, mocks y datos personales

Usar UUIDs y sujetos sintéticos, oferta Visita Simple ARS 50.000, texto de
conformidad ficticio y payloads oficiales redactados. El mock conserva el
contrato de preferencia/búsqueda/pago, permite ordenar eventos y registra sólo
conteos/IDs sintéticos. Nunca usar nombres, emails, domicilios, teléfonos,
multimedia, tarjetas, tokens, secretos o pagos reales en fixtures/evidencia.

## Procedimiento TEST-007-014 — acción humana pendiente

Prerequisito humano, fuera del repositorio:

1. Una persona autorizada entra a “Tus integraciones”, habilita una aplicación
   no productiva de PIGAR y cuentas de prueba vendedor/comprador del mismo país.
2. Configura una URL HTTPS de staging autorizada para Webhooks `payment` y guarda
   Access Token/secreto/credenciales únicamente en el mecanismo seguro del
   ambiente. No los comparte por chat ni los pega en comandos/evidencia.
3. Autoriza una ventana de prueba y, si hace falta, el despliegue de staging por
   la puerta separada; esta especificación no lo autoriza.
4. Operador y tester ejecutan preferencia con importe sintético, retorno
   no autoritativo, Webhook firmado, consulta autoritativa, aprobado (`APRO`),
   pendiente (`CONT` o medio offline) y rechazado oficial; luego duplicado, orden
   invertido y pérdida controlada de Webhook recuperada por conciliación.
5. Evidencia permitida: fecha/ambiente, IDs PIGAR opacos o truncados, escenario,
   HTTP/status normalizado y resultado pass/fail. Evidencia prohibida: secretos,
   headers, contraseñas, IDs completos de cuenta/pago, email o datos de tarjeta.

El usuario aceptó el 2026-08-30 cerrar el alcance de staging con recuperación
por conciliación. TEST-007-014 y AC-007-016 conservan una excepción explícita:
no bloquean el cierre de staging, pero sí cualquier habilitación de producción.

## Referencias oficiales verificadas el 2026-08-17

- [Webhooks Checkout Pro](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/payment-notifications)
- [Prueba de integración](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-test)
- [Compras de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-test/test-purchases)
- [Crear preferencia](https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro/preferences/create-preference/post)
- [Buscar pagos](https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro/search-payments/get)
