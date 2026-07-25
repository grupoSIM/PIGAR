# Requisitos — feat-012: Staging técnico en Hostinger

## Propósito y alcance

Establecer un entorno técnico de **testing/staging** en el VPS de Hostinger ya previsto para PIGAR. El objetivo es validar la operación reproducible de la base técnica de `feat-001`; no es un lanzamiento de producto ni un entorno de producción.

## Fuera de alcance

- Producción, alta disponibilidad, migración productiva, SLA o recuperación ante desastre productiva.
- Funciones de negocio, autenticación de usuarios, solicitudes, pagos o multimedia de clientes.
- Datos personales, ubicaciones, datos de pago, credenciales productivas o cuentas reales de proveedores.
- CI/CD automático, despliegue continuo, DNS definitivo o selección de un proveedor de backup externo.

## Requisitos funcionales

### REQ-012-001 — Despliegue reproducible de staging

- When: un operador autorizado prepara el VPS de Hostinger.
- Where: directorio de despliegue aislado del repositorio local.
- The system shall: documentar y ejecutar un despliegue manual reproducible de la topología Compose aprobada, con Nginx como única entrada pública y servicios internos en red privada.
- Errores y límites: no se publica directamente API, worker ni PostgreSQL; no se ejecuta un despliegue antes de la aprobación de esta especificación.

### REQ-012-002 — Configuración y secretos de staging

- When: se configura el entorno remoto.
- Where: archivos de entorno fuera del control de versiones y permisos del VPS.
- The system shall: usar valores sintéticos/no productivos, validar configuración al inicio y documentar la rotación/eliminación de secretos de staging.
- Errores y límites: no se copian secretos al repositorio, logs, evidencia ni terminal compartida; no se reutilizan credenciales productivas.

### REQ-012-003 — Exposición, TLS y acceso operativo

- When: se asocia el subdominio de staging elegido.
- Where: Nginx y DNS/TLS del VPS.
- The system shall: usar el proyecto Traefik administrado por Hostinger como única entrada pública de staging para servir las superficies técnicas permitidas mediante HTTPS y restringir rutas/puertos internos conforme a `docs/security.md`.
- Errores y límites: el nombre de subdominio, acceso SSH y método DNS permanecen como datos operativos pendientes del usuario; no se habilita acceso administrativo público no necesario.

### REQ-012-004 — Persistencia, observabilidad y rollback

- When: se reinician o actualizan servicios de staging.
- Where: volúmenes de PostgreSQL/multimedia, logs y runbook.
- The system shall: comprobar persistencia técnica, healthchecks, logs sanitizados y un rollback documentado a la revisión anterior.
- Errores y límites: el rollback de staging no equivale a estrategia de backup/restauración productiva; no se usan datos reales.

## Requisitos no funcionales

- NFR-012-001 Seguridad: solo Nginx expone puertos públicos; TLS válido, secretos fuera de Git y sin acceso directo a rutas multimedia.
- NFR-012-002 Operabilidad: cada paso tiene comando, resultado esperado y condición de reversión registrada en evidencia.
- NFR-012-003 Privacidad: el entorno contiene únicamente datos y credenciales sintéticos/no productivos.
- NFR-012-004 Trazabilidad: la revisión Git desplegada, configuración no sensible y resultados de smoke tests quedan registrados.

## Dependencias y preguntas abiertas

- DEP-012-001: VPS Hostinger de staging de 2 vCPU, 8 GB RAM, 100 GB de disco y 8 TB de transferencia, ya declarado para testing/staging.
- OQ-012-001: resuelta — FQDN de staging `pigar.ferchamorro.cloud`; el usuario creó el registro A el 2026-07-25. Falta comprobar propagación al momento de emitir TLS.
- OQ-012-002: el despliegue inicial usará Docker Manager; no requiere acceso SSH mientras el build remoto funcione.
- OQ-012-003: ventana de despliegue y personas autorizadas para acceder al staging.
- OQ-012-004: se confirma que ningún dato ni cuenta productiva se cargará durante esta feature.
