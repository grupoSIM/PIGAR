# Runbook: notificaciones transaccionales in-app

## Alcance

Este componente materializa únicamente avisos in-app para el CLIENT propietario.
No envía email, SMS, Web Push, WhatsApp ni utiliza proveedores externos.

## Operación y alertas

- Alertar si hay eventos notificables pendientes con más de cinco minutos de edad.
- Alertar ante eventos `FAILED` o crecimiento sostenido de reintentos.
- El worker emite `notification.metric.backlog_age` cada minuto y la alerta
  `notification.alert.backlog_age` al superar cinco minutos; los códigos
  `NOTIFICATION_EVENT_INVALID`, `NOTIFICATION_RECIPIENT_INVALID` y
  `NOTIFICATION_RETRY_EXHAUSTED` identifican fallos terminales sin contenido.
- Investigar con el ID opaco del evento/notificación y el correlation ID; nunca
  registrar ni copiar payloads, texto de avisos, domicilios, importes, contactos,
  datos de pago, secretos o URLs firmadas.
- Un worker detenido no bloquea órdenes ni pagos: restablecer el proceso y dejar
  que el lease expire para que se recupere el evento.

## Recuperación

1. Confirmar que PostgreSQL está disponible y que la migración forward-only fue
   aplicada.
2. Revisar conteos por estado y edad de `outbox_event` sin seleccionar payloads.
3. Reiniciar el consumidor. Los eventos `PROCESSING` cuyo lease venció vuelven a
   ser reclamables; la unicidad por evento/destinatario impide duplicados.
4. Para un tipo o versión inválidos, conservar el evento como `FAILED`, corregir
   mediante un forward-fix y reprocesar controladamente. No borrar historial.

## Retención y rollback

No hay borrado automático en staging. El rollback de la aplicación conserva la
tabla y los eventos; después de emitir avisos se usa forward-fix. El plazo de
retención y borrado productivo requiere validación legal antes de producción.
