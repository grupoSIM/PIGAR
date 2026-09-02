# Discovery — feat-010: Calificaciones, garantía e incidencias

- Estado: `closed` (artefacto histórico); discovery cerrado el 2026-08-31.
- Inicio: 2026-08-31.
- Dependencia satisfecha: `feat-007`, integrada en `main` y validada en staging.
- Dependencias de base: `feat-005` conserva el historial inmutable de la orden;
  `feat-009` ofrece una bandeja in-app, pero no habilita automáticamente nuevos
  avisos ni canales externos.
- Límite: este discovery no autoriza código, migraciones, cambios de la máquina
  de estados, proveedores, credenciales, commit, publicación ni despliegue.

## Objetivo

Definir una postventa mínima y trazable para que el CLIENT propietario pueda
calificar una orden ya `CERRADA` y abrir una incidencia estructurada vinculada a
esa orden. La garantía queda diferida. La calificación y la incidencia son
registros de postventa: nunca reemplazan la orden, su historial, el pago
autoritativo ni la conformidad del cliente.

## Hallazgos de base

- feat-007 deja la orden en `CERRADA` únicamente después de pago autoritativo y
  conformidad explícita del CLIENT. La conformidad, el cargo y sus historiales
  son append-only.
- feat-006 está fuera del MVP; no hay aplicación ni acceso autenticado para
  técnicos. feat-008 depende de feat-006 y no puede adelantarse.
- El backoffice inicial es una bandeja de solicitudes y órdenes; feat-011 y su
  dashboard continúan fuera del MVP.
- ADR-007 sólo autoriza la bandeja in-app. Email, Web Push, WhatsApp y cualquier
  proveedor externo siguen diferidos y requieren una puerta separada.
- La excepción de entrega automática del Webhook de Mercado Pago bloquea
  producción, no el discovery ni el staging de esta feature. No debe alterarse
  durante feat-010.

## Alcance candidato recomendado

- Calificación idempotente, única e inmutable de una orden `CERRADA` por su
  CLIENT propietario: 1 a 5 estrellas, motivo estructurado allowlist y, sólo
  cuando selecciona `Otro`, un mensaje obligatorio de 1 a 100 caracteres.
- Incidencia de postventa creada por el CLIENT propietario sobre una orden
  `CERRADA`, con tipo estructurado y una sola incidencia activa por orden.
  ADMIN/DISPATCHER puede realizar triage y cierre operativo.
- Proyecciones separadas por actor, auditoría mínima y listados paginados sin
  exposición de información de terceros.
- Pruebas de propiedad, roles, idempotencia, concurrencia, expiración de
  elegibilidad, privacidad, accesibilidad y degradación local.

## Fuera de alcance

- Reembolsos, descuentos, notas de crédito, contracargos, pagos parciales,
  cambios de precio o cualquier modificación del cargo ya aprobado.
- Reabrir automáticamente la orden original, crear una nueva orden, agendar una
  visita, reasignar técnico, modificar estados de servicio o intervenir en la
  conciliación de pagos.
- Chat, mensajes libres entre cliente y técnico, aplicación de técnicos,
  tracking, mapas, operación offline y dashboard de KPIs.
- Garantía, cobertura, plazo, elegibilidad, exclusiones o promesa comercial;
  deben pasar por un discovery y aprobación futuros.
- Multimedia, firma, biometría, evidencia de geolocalización y canales externos.
- Email, Web Push, WhatsApp, proveedor de atención al cliente o automatización
  de comunicaciones. Un eventual aviso in-app requiere decisión y contrato
  propios.
- Producción, incluida la resolución del Webhook automático de Mercado Pago,
  hardening, backups/restauración, cifrado en reposo, retención/borrado legal,
  monitoreo y respuesta a incidentes.

## Invariantes candidatos

1. Sólo el estado autoritativo `CERRADA` habilita postventa; calificaciones e
   incidencias no cambian la orden, el pago ni la conformidad.
2. Toda creación, consulta o mutación valida actor, rol, propiedad y contexto
   de la orden en servidor; la UI no concede permisos.
3. Las operaciones que puedan reintentarse son idempotentes y preservan
   historial/auditoría append-only; no existe borrado físico durante staging.
4. Logs, métricas, auditoría, outbox, avisos y respuestas minimizan datos: no
   incluyen domicilio, contacto, información de pago, secretos, multimedia ni el
   texto de `Otro`.

## Decisiones abiertas para aprobación humana

| ID | Decisión | Alternativas | Recomendación inicial | Impacto |
| --- | --- | --- | --- | --- |
| DEC-010-001 | Calificación por orden | 1–5 estrellas, motivo allowlist y `Otro` con mensaje obligatorio de 1–100 caracteres. | Aceptada por usuario el 2026-08-31. | Texto libre limitado: requiere minimización, XSS seguro y retención explícita. |
| DEC-010-002 | Garantía | No ofrecer ni calcular garantía en este incremento. | Aceptada por usuario el 2026-08-31. | Evita una promesa comercial/legal no aprobada. |
| DEC-010-003 | Ciclo de incidencia | Apertura CLIENT y triage/cierre ADMIN/DISPATCHER, sin efectos automáticos sobre órdenes, visitas ni pagos. | Aceptada por usuario el 2026-08-31. | Preserva el dominio cerrado y difiere feat-006/008. |
| DEC-010-004 | Datos de incidencia | Tipo estructurado sin texto libre ni multimedia. | Aceptada por usuario el 2026-08-31. | Reduce PII, abuso, almacenamiento y soporte. |
| DEC-010-005 | Comunicación de postventa | Consulta sólo en portal; sin aviso in-app ni canales externos. | Aceptada por usuario el 2026-08-31. | Mantiene ADR-007 y evita proveedor/consentimiento. |

Las decisiones DEC-010-001 a DEC-010-005 fueron aprobadas por el usuario el
2026-08-31. La aprobación cierra discovery y habilita redactar especificación;
no autoriza implementación, migraciones, credenciales ni publicación.

## Revisión arquitectónica focalizada

- Dictamen del Architect Reviewer independiente, 2026-08-31:
  `approved_with_conditions` para pasar a `specification`; no habilita
  implementación.
- No se requiere ADR nueva si el incremento se mantiene como postventa interna
  de una orden `CERRADA`, sin transición adicional de orden, dinero, proveedor,
  canal externo, multimedia ni creación o reapertura automática de trabajo.
- Una ADR o revisión arquitectónica nueva será obligatoria si se incorpora un
  proveedor/canal, una garantía ligada a reembolso o servicio nuevo, una
  transición de orden, multimedia o texto libre fuera de `Otro`.

Condiciones antes de especificar:

1. Mantener garantía fuera de feat-010; cualquier cobertura o remedio exige una
   nueva decisión comercial y arquitectónica.
2. Mantener las incidencias fuera del agregado `Order`, con historial propio y
   sin mutar `CERRADA`, pago ni conformidad.
3. Implementar una calificación por orden y CLIENT, con idempotencia,
   concurrencia, visibilidad no pública y `Otro` limitado a 1–100 caracteres.
4. Normalizar Unicode y recortar el texto en servidor; rechazar HTML, URLs y
   adjuntos; no copiarlo a logs, auditoría, métricas, outbox o notificaciones.
5. En staging no habrá borrado automático: el mensaje de `Otro` se conserva
   junto a su calificación mientras exista la orden. Producción permanece
   bloqueada hasta validar legalmente retención y borrado. CLIENT sólo consulta
   su propia calificación; ADMIN/DISPATCHER la consultan en la orden para
   soporte, sin editarla ni exponerla públicamente.
6. Mantener avisos in-app fuera de este incremento. Si se incorporan en el
   futuro, extender allowlist, plantillas, destinatarios, retención y pruebas.

## Riesgos y controles candidatos

| Riesgo | Control verificable propuesto |
| --- | --- |
| Garantía ambigua o no autorizada | Excluir toda cobertura de feat-010; una propuesta futura requiere decisión comercial y arquitectónica nueva. |
| Acceso cruzado a calificaciones o incidencias | Filtro de propietario en consulta y mutación; 401/403/404 según actor y pruebas negativas. |
| Doble registro por reintento o concurrencia | Claves/restricciones de unicidad, versionado y pruebas PostgreSQL con carreras reales. |
| La postventa modifica el dominio cerrado | No incluir transiciones de orden, cargo ni pago; pruebas de invariantes y auditoría. |
| PII, abuso o contenido sensible | Motivos/tipos estructurados; `Otro` de 1–100 caracteres, normalizado, sin HTML/URLs/adjuntos, sin multimedia ni logs de contenido. |
| Incidencias sin atención o cierre opaco | Estados explícitos, actor/UTC de cada cambio, listados operativos y criterios de visibilidad para CLIENT. |
| Crecimiento a mensajería o soporte externo | Exclusiones contractuales; cualquier canal/proveedor pasa por ADR-007 y aprobación específica. |

## Cierre de discovery

1. El usuario cerró DEC-010-001 a DEC-010-005 y el Architect Reviewer emitió el
   dictamen condicionado para la variante final, incluido `Otro` de hasta 100
   caracteres.
2. No se requiere ADR nueva con el alcance final. Las condiciones de seguridad,
   retención de staging y exclusiones quedan como entradas obligatorias de la
   especificación.
3. Los siete artefactos de especificación fueron elaborados, aprobados y se
   mantienen como fuente normativa para la implementación y verificación.
4. La implementación sólo avanza con aprobación explícita de especificación;
   commit, publicación y despliegue requieren puertas separadas.

## Próxima puerta

feat-010 ya no está en discovery: sus artefactos aprobados gobiernan la fase de
`verification`. La publicación y el despliegue siguen requiriendo aprobaciones
separadas.
