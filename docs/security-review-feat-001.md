# Revisión de seguridad — feat-001

Fecha: 2026-07-25  
Estado: revisión local completada con acciones pendientes antes de producción.

## Alcance y resultado

| Área | Evidencia | Resultado |
|---|---|---|
| Superficie de red | `pnpm test:security --grep network-surface` | Pass: Compose publica solo Nginx; `/media` devuelve 404 y la recuperación de PostgreSQL/API conserva readiness. |
| Multimedia privada | `pnpm test:integration --grep media-invalid` y `pnpm test:security --grep media-cross-access` | Pass: se rechazan MIME, duración, tamaño, actor cruzado e interrupciones; no queda objeto final ni temporal. |
| Logs y secretos | `pnpm test:security --grep log-sanitization` y búsqueda estática de patrones sensibles | Pass: los logs excluyen autorización/payloads y el escaneo no encontró claves privadas, tokens o secretos versionados. |
| Datos de prueba | Inspección de fixtures y pruebas de PoC | Pass: los casos usan IDs, archivos, pagos y errores sintéticos; no se usaron datos personales ni credenciales reales. |
| Dependencias | `pnpm install --frozen-lockfile` declarado y lockfile versionado | Parcial: la integridad/reproducibilidad del lockfile está cubierta, pero la auditoría de vulnerabilidades no pudo consultar el registro npm. |
| Imágenes de contenedor | Inspección de Compose/Dockerfile | Parcial: las imágenes están fijadas por etiqueta de versión; falta pin por digest y un escaneo de imágenes antes de producción. |

## Hallazgos y seguimiento

1. La auditoría `pnpm audit --prod --audit-level high` no se ejecutó: el entorno bloqueó enviar metadatos de dependencias al registro npm sin autorización explícita. No se infiere que las dependencias estén libres de vulnerabilidades.
2. No hay escáner de imágenes configurado y las imágenes base usan etiquetas versionadas, no digest. Antes de producción se debe fijar cada imagen por digest y ejecutar un escaneo con una fuente de vulnerabilidades aprobada.
3. La contraseña de PostgreSQL del Compose es un valor local de desarrollo identificado como tal. No debe reutilizarse ni llegar a producción; producción exige inyección externa de secretos.
4. Cifrado en reposo, backup cifrado/restaurable, hardening del VPS y modelado de amenazas siguen siendo bloqueantes de producción según `progress/current.yaml`.

## Conclusión

Los controles locales del alcance de TASK-013 están verificados. Los hallazgos abiertos no habilitan producción y deben resolverse con autorización explícita para consultar una fuente de vulnerabilidades y seleccionar las herramientas operativas correspondientes.
