# Discovery — feat-009: Notificaciones transaccionales

- Estado: `specification`; DEC-009-001 a DEC-009-006 aprobadas por el usuario
  el 2026-08-30.
- Inicio: 2026-08-30.
- Dependencia: `feat-005` cerrada; feat-007 también está disponible como fuente
  de eventos de pago y conformidad.
- Decisión relacionada: [ADR-007](adr/ADR-007.md).
- Límite: este discovery no habilita código, migraciones, proveedores, cuentas,
  credenciales, envíos, commit, publicación ni despliegue.

## Problema a resolver

Hoy el cliente conoce el estado autoritativo al entrar al portal y consultar el
historial. No existe un aviso proactivo ni un centro de notificaciones. ADR-007
aprobó para el MVP únicamente estado e historial in-app y dejó email, Web Push y
WhatsApp integrados sujetos a una decisión posterior sobre proveedor,
consentimiento, plantillas, costes y soporte.

Antes de especificar feat-009 hay que decidir si el incremento sigue dentro de
ese MVP mediante avisos in-app derivados de eventos ya persistidos, o si se
amplía expresamente el alcance para incorporar un canal externo. Una alerta
nunca será fuente de verdad: el estado vigente seguirá siendo el dominio y su
historial.

## Base ya disponible

- Órdenes con estados e historial append-only y actualización administrativa.
- Autorización por rol y propiedad; el cliente sólo accede a sus recursos.
- Eventos y jobs persistentes en PostgreSQL, sin Redis obligatorio.
- Pago y conformidad con estados autoritativos en feat-007.
- Dos portales autenticados y worker separado.
- Prohibición de exponer domicilio, teléfono del técnico, multimedia, datos de
  tarjeta, payloads de proveedores, secretos o enlaces firmados.

## Alcance candidato mínimo

- Definir un contrato neutral y versionado de eventos notificables, separado de
  cualquier proveedor.
- Crear avisos transaccionales sólo después del commit del cambio autoritativo,
  con idempotencia y referencia opaca al recurso.
- Mostrar al CLIENT propietario una bandeja in-app accesible con título seguro,
  fecha, estado leído/no leído y navegación al recurso autorizado.
- Permitir marcar como leído de forma idempotente sin modificar el estado de la
  orden, pago o solicitud.
- Definir retención, paginación, conteo de no leídos, permisos negativos,
  observabilidad segura y recuperación ante jobs duplicados o demorados.
- Mantener cualquier adaptador externo detrás de un puerto y fuera de la
  implementación hasta que canal/proveedor y operación estén aprobados.

## Fuera de alcance por defecto

- Chat, respuestas, mensajes libres o comunicación cliente-técnico.
- Teléfono, WhatsApp o ubicación del técnico; tracking, mapa y ETA.
- Marketing, campañas, promociones, newsletters o segmentación.
- SMS, email, Web Push, WhatsApp API o proveedor externo sin una ampliación
  explícita de ADR-007.
- Confirmar estados mediante enlaces en una notificación; la UI consulta siempre
  la API autoritativa.
- Notificar secretos, importes editables, diagnóstico libre, domicilio,
  multimedia, datos de tarjeta o IDs de proveedor.
- Producción, compra de créditos, registro de dominios, cuentas de proveedor o
  configuración de credenciales.

## Decisiones abiertas que requieren aprobación humana

| ID          | Decisión             | Recomendación inicial                                                                                                                                        | Impacto                                                                            |
| ----------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| DEC-009-001 | Alcance del MVP      | Implementar primero una bandeja in-app; mantener canales externos diferidos conforme ADR-007.                                                                | Evita seleccionar proveedor/costes y entrega valor sin ampliar datos externos.     |
| DEC-009-002 | Destinatarios        | Avisos transaccionales para el CLIENT propietario. La operación administrativa conserva su bandeja actual; alertas internas adicionales se difieren.         | Limita volumen, permisos y ruido operativo.                                        |
| DEC-009-003 | Eventos iniciales    | Notificar asignación, `EN_CAMINO`, cancelación, pago aprobado/rechazado y orden cerrada. No crear avisos por cada lectura, reintento técnico o Webhook.      | Define contrato, volumen y expectativas del usuario.                               |
| DEC-009-004 | Contenido            | Plantillas versionadas y genéricas con título, resumen seguro y hora; sin texto libre operativo ni datos sensibles.                                          | Controla privacidad, consistencia y futuras traducciones.                          |
| DEC-009-005 | Lectura y retención  | Estado leído por perfil, paginación estable y retención inicial alineada al historial de la orden; el plazo legal definitivo bloquea producción.             | Introduce datos de interacción y política de conservación.                         |
| DEC-009-006 | Canal externo futuro | No seleccionar todavía. Si se solicita, abrir revisión de ADR-007 y comparar email, Web Push y WhatsApp por consentimiento, coste, entregabilidad y soporte. | Activa proveedor externo, secretos, datos personales y operación de bajas/rebotes. |

## Riesgos y controles candidatos

| Riesgo                             | Control verificable propuesto                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Aviso duplicado o perdido          | Clave única por evento/destinatario, outbox transaccional, job recuperable y pruebas concurrentes.             |
| Aviso contradice al dominio        | La notificación sólo enlaza; detalle y acciones consultan estado autoritativo actual.                          |
| Acceso cruzado                     | Autorización por perfil/recurso, referencias opacas y pruebas negativas para otro CLIENT, visitante y técnico. |
| Filtración en contenido o logs     | Plantillas allowlist, metadatos mínimos, logs con código/conteo/correlation ID y escaneo de datos prohibidos.  |
| Conteo no leído inconsistente      | Actualización idempotente, constraint única y pruebas de doble submit/paginación.                              |
| Crecimiento indefinido             | Retención documentada, índices de consulta y métricas de antigüedad/volumen sin PII.                           |
| Dependencia prematura de proveedor | Contrato neutral; ningún SDK, cuenta, secreto ni envío externo antes de aprobar canal y ADR.                   |

## Decisiones confirmadas el 2026-08-30

El usuario aprobó DEC-009-001 a DEC-009-006 como paquete. El incremento se
limita a una bandeja transaccional in-app para el CLIENT propietario, con los
seis eventos iniciales, plantillas genéricas, lectura idempotente y retención
alineada al historial. Email, SMS, Web Push, WhatsApp y todo proveedor externo
permanecen fuera de alcance. La aprobación habilita redactar la especificación;
no autoriza implementación, commit, publicación ni despliegue.

## Puertas para avanzar

1. Aprobar o corregir DEC-009-001 a DEC-009-006.
2. Si se elige un canal externo, realizar revisión arquitectónica y de privacidad
   antes de redactar la especificación.
3. Preparar los siete artefactos obligatorios con IDs estables y detenerse en
   `spec_review` para aprobación humana.
