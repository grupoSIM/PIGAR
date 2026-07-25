# Revisión arquitectónica de discovery

- Fecha: 2026-07-21
- Alcance: ADR-001 a ADR-008 y MVP corregido
- Resultado del Architect Reviewer: `approved_with_conditions`
- Aprobación humana: `approved_with_conditions` por el usuario el 2026-07-23.
- Aclaración: la aprobación arquitectónica no reemplaza la futura aprobación de la especificación.

## Resultado

La propuesta corregida es proporcionada para un MVP sin aplicación de operarios: dos aplicaciones web, API modular, PostgreSQL y almacenamiento privado en un volumen del VPS elegido. Eliminar tracking, sincronización offline y canales externos reduce superficie, coste y tratamiento de datos sensibles. El VPS único es aceptable para validación, pero constituye un dominio de falla que exige backups externos y restauración probada.

## Condiciones antes de aprobar la especificación de feat-001

1. Convertir las PoC de carga por streaming al volumen privado y webhook/idempotencia de pagos en tareas con criterios de aceptación.
2. Definir la máquina de estados exacta, quién puede marcar `TECNICO_ASIGNADO`/`EN_CAMINO` y qué ocurre si el pago queda pendiente o es rechazado.
3. Incluir matriz de permisos y pruebas negativas de acceso cruzado a solicitudes y multimedia.
4. Definir capacidad mínima del VPS, límites por contenedor, alertas de disco/CPU/memoria y presupuesto de proveedores externos.

## Condiciones antes de producción

1. Elegir y aprobar un destino externo de backup cifrado; probar restauración de PostgreSQL y multimedia.
2. Validar legalmente retención y borrado de domicilio, multimedia, conformidad y evidencia comercial.
3. Completar hardening del VPS, modelado de amenazas, monitoreo y respuesta a incidentes.
4. Aprobar términos, cuentas comerciales, cuotas y costes de Auth0, Google Maps y Mercado Pago.

## Hallazgos no bloqueantes para discovery

- Aplicación de operarios, tracking, offline, canales externos y asignación automática están correctamente diferidos.
- Dashboard de KPIs, reportes y contacto directo cliente-técnico están correctamente fuera del MVP.
- Redis, microservicios y un segundo nodo no deben introducirse sin una necesidad medida o un nuevo ADR.
- El adaptador de filesystem evita otro producto en el VPS y conserva una ruta de migración a object storage.
