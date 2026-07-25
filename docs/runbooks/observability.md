# Observabilidad y alertas técnicas

Los servicios emiten JSON estructurado con `timestamp` UTC, `level`, `service`, `environment`, `correlation_id`, `event`, `duration_ms` y `code`. No se registran secretos, credenciales, cookies, payloads, domicilios ni datos de contacto.

## Health telemetry

- `health.live`: proceso HTTP activo; no consulta dependencias.
- `health.ready`: disponibilidad de PostgreSQL y componentes internos; `SERVICE_NOT_READY` indica degradación técnica.

## Alertas mínimas

| Señal | Aviso | Crítico | Acción inicial |
|---|---:|---:|---|
| Disco del VPS/volumen multimedia | 70 % | 85 % | Detener cargas antes del agotamiento y revisar temporales. |
| CPU o memoria de contenedor | sostenido 15 min | reinicios/OOM | Identificar servicio, reducir carga y preservar evidencia. |
| `health.ready` no disponible | 2 min | 5 min | Revisar PostgreSQL, migraciones y reinicios; liveness no basta. |
| Jobs vencidos o reintentos | 5 en 15 min | dead-letter | Pausar reintentos agresivos y revisar error sanitizado. |
| Firma, duplicado o conciliación de proveedor | tasa anómala | pérdida de conciliación | Conservar pendiente; no inferir aprobación. |
| Temporales multimedia | crecimiento sostenido | disco crítico | Ejecutar limpieza TTL y revisar cargas interrumpidas. |

La configuración de la plataforma de monitoreo y los destinos de alerta se eligen antes de producción; no se agrega proveedor externo en este incremento.
