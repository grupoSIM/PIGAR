# Capacidad, cuotas y recuperación

Fecha de revisión: 2026-07-25. Este documento registra referencias de planificación; no contrata ni selecciona planes, proveedores de backup ni productos de cifrado.

## Línea base verificada

El VPS de desarrollo confirmado tiene 2 vCPU, 8 GB RAM, 100 GB NVMe y 8 TB de transferencia. El plan público KVM 2 de Hostinger publicado en esta fecha indica los mismos recursos y muestra ARS 16.699/mes promocional y ARS 30.299/mes de renovación a dos años. Es una referencia comercial variable, no una aprobación de gasto ni garantía de disponibilidad.

La configuración actual de Compose reserva, para los servicios persistentes, 1,55 CPU y 2.176 MB de memoria: Nginx 0,10/128 MB, cada web 0,20/256 MB, API 0,35/512 MB, worker 0,20/256 MB y PostgreSQL 0,50/768 MB. La migración es efímera y no tiene límite propio; el margen restante se reserva para host, Docker, caché, picos y migración.

La PoC multimedia verificó streaming de un video sintético de 50 MB con crecimiento de heap menor a 32 MB, validación de 30 segundos y finalización atómica. El límite de producto reservado sigue siendo hasta cinco imágenes de 10 MB y un video de 50 MB/30 segundos por solicitud; no se habilita aún como endpoint de producto.

## Presupuesto de disco y alertas

| Uso | Presupuesto inicial | Control |
|---|---:|---|
| Host, imágenes y caché | 20 GB | Revisar en cada actualización de imagen. |
| PostgreSQL | 20 GB | Vigilar crecimiento, WAL y backup antes de cambios destructivos. |
| Multimedia y temporales | Hasta 50 GB | Rechazar cargas y ejecutar TTL antes de 85 % del volumen. |
| Margen operativo | 10 GB | No consumir con cargas ni imágenes. |

Las alertas de disco son aviso a 70 % y crítico a 85 %. CPU/memoria sostenidas y reinicios/OOM se investigan antes de aumentar recursos. No se deriva capacidad de producción a partir de esta línea base: requiere medición de concurrencia, CPU, memoria, disco y transferencia.

## Cuotas y costes de proveedores

| Proveedor | Referencia al 2026-07-25 | Control obligatorio antes de habilitarlo |
|---|---|---|
| Auth0 | La página pública indica plan Free de USD 0/mes hasta 25.000 MAU. | Confirmar región, términos, MFA, dominio personalizado, límites vigentes y presupuesto con la cuenta no productiva. |
| Google Maps Platform | Para Geocoding y Autocomplete Essentials, la tabla pública indica 10.000 eventos mensuales sin costo; luego USD 5,00 y USD 2,83 por 1.000 respectivamente en el primer tramo facturable. | Crear proyecto separado, restringir claves por API/origen, fijar cuotas, alertas de cuota y presupuesto. Un presupuesto por sí solo no detiene facturación. |
| Mercado Pago Checkout | La página pública de Argentina indica pago solo por venta aprobada y muestra tasas desde 4,39 % + IVA y 6,29 % + IVA; informa que pueden variar por impuestos provinciales. | Confirmar modalidad, plazo de acreditación, tasas/impuestos y límites en una cuenta Sandbox/no productiva. No habilitar cobros ni guardar credenciales en el repositorio. |
| Hostinger VPS | KVM 2: 2 vCPU, 8 GB, 100 GB NVMe y 8 TB; precio público variable citado arriba. | Confirmar ciclo de facturación, transferencia, soporte de cifrado y coste de renovación en la cuenta antes de producción. |

## Cifrado, despliegue y recuperación

- Tránsito: el despliegue público exige TLS terminado en Nginx y renovación de certificado documentada; no se publica HTTP de aplicación sin esa capa.
- Reposo: se debe obtener evidencia escrita del cifrado de disco/volumen del VPS. Si no es verificable, producción exige un volumen cifrado administrable con claves separadas del servidor.
- Backups: PostgreSQL y multimedia requieren backup externo cifrado del lado de PIGAR. El destino, herramienta, claves, frecuencia, retención, RPO y RTO no están aprobados y son bloqueantes de producción.
- Restauración: antes de producción se debe restaurar una copia cifrada en un entorno aislado y comprobar PostgreSQL, objetos multimedia, permisos de archivos y readiness. Toda migración no reversible requiere backup previo y forward-fix documentado.
- Despliegue: GitHub Actions solo ejecuta calidad. Un futuro workflow de Hostinger para testing/staging será separado, con aprobación manual, secretos externos, migración compatible y verificación de readiness; no se configuró ni ejecutó en esta feature. Ese VPS no se considera producción; la producción requerirá un entorno y aprobación separados.

## Bloqueantes antes de producción

1. Aprobar destino externo de backup, custodia/rotación de claves, retención, RPO y RTO; ejecutar restauración completa.
2. Confirmar cifrado en reposo del VPS o implementar volumen cifrado administrable.
3. Verificar cuentas no productivas, MFA, restricciones de claves, cuotas y costes de Auth0, Google Maps y Mercado Pago.
4. Ejecutar auditoría de dependencias e imágenes con una fuente aprobada y fijar imágenes por digest.
5. Completar hardening, modelado de amenazas y respuesta a incidentes del VPS.

## Fuentes oficiales consultadas

- [Hostinger VPS Argentina](https://www.hostinger.com/ar/vps-argentina)
- [Auth0 pricing](https://auth0.com/pricing)
- [Google Maps Platform pricing](https://developers.google.com/maps/billing-and-pricing/pricing)
- [Google Maps cost controls](https://developers.google.com/maps/billing-and-pricing/manage-costs)
- [Mercado Pago Checkout Argentina](https://www.mercadopago.com.ar/herramientas-para-vender/check-out)
