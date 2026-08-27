# Conciliación de pagos — feat-007

## Alcance

Este procedimiento opera exclusivamente en staging/no productivo hasta que una
aprobación independiente habilite producción. No pegar Access Token, secreto
Webhook, IDs de pago completos, URLs de checkout ni datos de cuenta en tickets,
logs o chat.

## Señales

- Intento `CREATED` o `PENDING` sin actualización dentro del intervalo de
  conciliación configurado.
- Recibo Webhook válido sin una transición de pago terminal.
- Referencia, moneda ARS o importe de la API del proveedor distintos del cargo.

## Procedimiento seguro

1. Consultar por `external_reference` a través del adaptador, nunca desde una
   consola con secretos pegados.
2. Comparar referencia opaca, `currency_id` y el importe exacto contra el
   cargo congelado.
3. Aplicar sólo el estado autoritativo: únicamente `approved` puede mover la
   orden a `PENDIENTE_CONFORMIDAD`; `pending`, `rejected` y `cancelled` no la
   adelantan.
4. Registrar sólo hash/ID opaco, estado normalizado, código técnico y UTC.
5. Ante respuesta temporal/429/5xx, reintentar con backoff+jitter. Ante una
   discrepancia, mantener la orden pendiente y abrir alerta operativa sin
   recrear una preferencia.

## Recuperación de Webhook perdido

La conciliación busca por referencia externa; no depende de que llegue otro
Webhook y no crea un intento paralelo. Un resultado no concluyente permanece
pendiente para una ejecución posterior.

## Retención y escalamiento

No se eliminan cargos, intentos, transiciones ni evidencias de conformidad.
Los forward-fixes son migraciones aditivas. Reembolsos, contracargos y pagos
reales permanecen fuera de este incremento y requieren revisión independiente.
