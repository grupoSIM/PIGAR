# Criterios de aceptación — feat-012

| ID | Criterio verificable | Evidencia esperada |
|---|---|---|
| AC-012-001 | Un operador puede desplegar la revisión aprobada en Hostinger siguiendo un runbook sin publicar servicios internos. | Comandos sanitizados, `docker compose config`, inspección de puertos y revisión Git. |
| AC-012-002 | El entorno usa configuración de staging fuera de Git y falla de forma segura ante valores obligatorios ausentes. | Checklist sin valores sensibles y salida sanitizada del validador. |
| AC-012-003 | El subdominio de staging responde por HTTPS y HTTP redirige a HTTPS; Nginx es la única superficie pública. | `curl -I`/prueba TLS y verificación de puertos/rutas. |
| AC-012-004 | Healthchecks de cliente, administración y API responden a través de Nginx; PostgreSQL/API/worker no son públicos. | Smoke tests remotos y evidencia de denegación externa. |
| AC-012-005 | Reiniciar PostgreSQL y API conserva datos técnicos sintéticos y recupera readiness. | Prueba controlada de reinicio, healthcheck y logs sanitizados. |
| AC-012-006 | El runbook permite volver a la revisión previa sin secretos ni intervención no documentada. | Ejercicio de rollback o prueba equivalente aprobada y resultado registrado. |
| AC-012-007 | No hay datos reales, credenciales productivas ni despliegue de producción durante la feature. | Revisión de configuración/evidencia y confirmación de alcance. |
