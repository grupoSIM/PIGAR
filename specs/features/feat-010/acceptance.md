# Aceptación — feat-010: Calificaciones e incidencias de postventa

Estado: `done`. Los criterios cuentan con resultados registrados
en `evidence.md` y la novena revisión independiente PASS está en `review-9.md`.
La publicación en staging y la integración en main fueron autorizadas por el
usuario después de la validación remota del workflow #82.

## AC-010-001 — Calificación válida y única

- Given: un CLIENT propietario y una orden autoritativamente `CERRADA` sin
  calificación.
- When: crea una calificación de 1 a 5 con un motivo v1 válido y clave
  idempotente.
- Then: se crea una sola calificación inmutable con UTC de servidor; la orden,
  pago, cargo y conformidad permanecen byte/semánticamente iguales.
- Requisitos: REQ-010-001, REQ-010-003, REQ-010-008, NFR-010-001.
- Evidencia esperada: TEST-010-001, TEST-010-003, TEST-010-004 y TEST-010-007.

## AC-010-002 — `OTRO` normalizado, limitado y seguro

- Given: entradas con Unicode equivalente, whitespace, vacío posterior a trim,
  más de 100 puntos de código, controles, HTML, URL o intento de adjunto.
- When: el CLIENT envía la calificación.
- Then: sólo el texto NFKC+trim de 1..100 permitido con motivo `OTRO` se persiste;
  los demás casos se rechazan sin eco ni mutación y la vista autorizada lo
  renderiza como texto sin ejecución XSS.
- Requisitos: REQ-010-002, NFR-010-002, NFR-010-003.
- Evidencia esperada: TEST-010-002, TEST-010-003, TEST-010-008 y TEST-010-012.

## AC-010-003 — Idempotencia y carrera de calificación

- Given: 20 comandos concurrentes con la misma o distintas claves y payloads.
- When: compiten por calificar la misma orden.
- Then: PostgreSQL conserva exactamente una calificación; reintento idéntico
  devuelve el mismo resultado, incompatibilidad devuelve 409 y no hay edición o
  borrado posible.
- Requisitos: REQ-010-003, NFR-010-001, NFR-010-006.
- Evidencia esperada: TEST-010-004 y TEST-010-011.

## AC-010-004 — Propiedad, roles y consulta de calificación

- Given: propietario, CLIENT cruzado, ADMIN/DISPATCHER, rol no autorizado y
  visitante.
- When: crean o consultan una calificación.
- Then: sólo el propietario crea/consulta la propia; ADMIN/DISPATCHER consultan
  únicamente la vista de soporte; visitante obtiene 401, rol no autorizado 403 y
  CLIENT cruzado 404, sin enumeración ni visibilidad pública.
- Requisitos: REQ-010-001, REQ-010-004, NFR-010-002.
- Evidencia esperada: TEST-010-003 y TEST-010-006.

## AC-010-005 — Incidencia estructurada y única activa

- Given: una orden propia `CERRADA` sin incidencia activa y cualquiera de los
  cinco tipos v1.
- When: el CLIENT abre la incidencia, reintenta o compite con otras aperturas.
- Then: existe una sola incidencia `ABIERTA`, versión 1 y evento `OPEN`; no se
  acepta texto/archivo y otra incidencia activa causa 409 sin efectos parciales.
- Requisitos: REQ-010-005, NFR-010-001, NFR-010-002.
- Evidencia esperada: TEST-010-001, TEST-010-003 y TEST-010-005.

## AC-010-006 — Triage, cierre e historial append-only

- Given: una incidencia `ABIERTA` y luego `EN_TRIAGE`.
- When: ADMIN/DISPATCHER aplica `START_TRIAGE` y `CLOSE` con versión esperada.
- Then: las únicas transiciones válidas producen versiones 2 y 3 e historial
  append-only con actor/UTC; saltos, obsolescencia, reapertura, edición y borrado
  se rechazan. Tras cierre puede abrirse otro registro nuevo, no reactivar éste.
- Requisitos: REQ-010-006, NFR-010-001, NFR-010-006.
- Evidencia esperada: TEST-010-001, TEST-010-003, TEST-010-005 y TEST-010-011.

## AC-010-007 — Proyecciones y bandeja segregadas

- Given: incidencias de varios clientes, estados y tipos.
- When: CLIENT lista la orden propia o ADMIN/DISPATCHER usan soporte y paginación.
- Then: cada CLIENT recibe sólo las propias; operación recibe la allowlist mínima
  con orden/cursor estables y no obtiene texto de `OTRO` en bandejas ni datos de
  pago/contacto/multimedia/proveedor.
- Requisitos: REQ-010-004, REQ-010-007, NFR-010-002, NFR-010-004.
- Evidencia esperada: TEST-010-003, TEST-010-006 y TEST-010-009.

## AC-010-008 — Orden, dinero y conformidad no mutan

- Given: creación, reintento, conflicto, carrera y transición de postventa.
- When: cada comando finaliza con éxito o error.
- Then: estado, versión e historial de `WorkOrder`, `Charge`, `PaymentAttempt`,
  pago y `ConformityEvidence` son iguales al antes; no aparece orden/cargo/visita
  ni evento en el outbox.
- Requisitos: REQ-010-008, NFR-010-008.
- Evidencia esperada: TEST-010-005 y TEST-010-007.

## AC-010-009 — No logging ni propagación de contenido

- Given: un `otherMessage` sintético identificable y operaciones aceptadas o
  rechazadas.
- When: se inspeccionan respuestas no necesarias, logs, auditoría, trazas,
  métricas, errores, outbox y notificaciones.
- Then: el texto no aparece en ninguna de esas superficies; sólo las consultas
  explícitas y autorizadas lo devuelven, y la evidencia publica únicamente
  conteos/resultados sanitizados.
- Requisitos: REQ-010-002, REQ-010-009, NFR-010-003.
- Evidencia esperada: TEST-010-008.

## AC-010-010 — Rate limit y rendimiento

- Given: tráfico por debajo y por encima de los límites propuestos y volumen
  sintético indexado.
- When: se ejercitan escrituras, lecturas y transiciones.
- Then: exceso devuelve 429 con `Retry-After` sin mutación; comandos/listados sin
  llamadas externas alcanzan p95 < 500 ms y no recorren datos de otros perfiles.
- Requisitos: REQ-010-007, REQ-010-009, NFR-010-004.
- Evidencia esperada: TEST-010-009.

## AC-010-011 — Migración y retención de staging

- Given: base existente y una orden con postventa.
- When: se aplica la migración futura y se valida rollback de aplicación.
- Then: cambios son aditivos/forward-only, FKs `RESTRICT`, checks, índices y
  triggers funcionan, no se borra historia y no existe borrado automático en
  staging; producción sigue bloqueada por decisión legal.
- Requisitos: NFR-010-006, NFR-010-007.
- Evidencia esperada: TEST-010-011.

## AC-010-012 — Experiencia accesible y degradación local

- Given: creación, sólo lectura, lista vacía/con datos, error y 429 en CLIENT y
  estados de bandeja/triage en administración.
- When: se usa teclado y semántica accesible.
- Then: controles, foco, errores, contador y estados son perceptibles sin depender
  del color; una falla de postventa no impide consultar la orden autoritativa.
- Requisitos: REQ-010-001, REQ-010-005, REQ-010-006, NFR-010-005,
  NFR-010-008.
- Evidencia esperada: TEST-010-010 y TEST-010-012.

## AC-010-013 — Sin garantía ni canales implícitos

- Given: todas las vistas, contratos, tablas y operaciones de feat-010.
- When: se revisan contenido, dependencias y efectos.
- Then: no existe lenguaje/cálculo de garantía, elegibilidad o remedio; tampoco
  aviso in-app, email, Web Push, WhatsApp, proveedor, credencial, outbox nuevo ni
  tratamiento del Webhook 401 de Mercado Pago.
- Requisitos: REQ-010-008, NFR-010-008.
- Evidencia esperada: TEST-010-007, TEST-010-008 y TEST-010-013.

## Matriz de trazabilidad

| Criterio   | Requisitos                                                      | Tareas                                                               | Pruebas                                                | Evidencia |
| ---------- | --------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------ | --------- |
| AC-010-001 | REQ-010-001, REQ-010-003, REQ-010-008, NFR-010-001              | TASK-010-001, TASK-010-002, TASK-010-008                             | TEST-010-001, TEST-010-003, TEST-010-004, TEST-010-007 | passed    |
| AC-010-002 | REQ-010-002, NFR-010-002, NFR-010-003                           | TASK-010-002, TASK-010-004, TASK-010-005, TASK-010-007, TASK-010-008 | TEST-010-002, TEST-010-003, TEST-010-008, TEST-010-012 | passed    |
| AC-010-003 | REQ-010-003, NFR-010-001, NFR-010-006                           | TASK-010-001, TASK-010-002, TASK-010-008                             | TEST-010-004, TEST-010-011                             | passed    |
| AC-010-004 | REQ-010-001, REQ-010-004, NFR-010-002                           | TASK-010-002, TASK-010-004, TASK-010-008                             | TEST-010-003, TEST-010-006                             | passed    |
| AC-010-005 | REQ-010-005, NFR-010-001, NFR-010-002                           | TASK-010-001, TASK-010-003, TASK-010-008                             | TEST-010-001, TEST-010-003, TEST-010-005               | passed    |
| AC-010-006 | REQ-010-006, NFR-010-001, NFR-010-006                           | TASK-010-001, TASK-010-003, TASK-010-006, TASK-010-008               | TEST-010-001, TEST-010-003, TEST-010-005, TEST-010-011 | passed    |
| AC-010-007 | REQ-010-004, REQ-010-007, NFR-010-002, NFR-010-004              | TASK-010-003, TASK-010-004, TASK-010-006, TASK-010-008               | TEST-010-003, TEST-010-006, TEST-010-009               | passed    |
| AC-010-008 | REQ-010-008, NFR-010-008                                        | TASK-010-002, TASK-010-003, TASK-010-007, TASK-010-008               | TEST-010-005, TEST-010-007                             | passed    |
| AC-010-009 | REQ-010-002, REQ-010-009, NFR-010-003                           | TASK-010-004, TASK-010-007, TASK-010-008                             | TEST-010-008                                           | passed    |
| AC-010-010 | REQ-010-007, REQ-010-009, NFR-010-004                           | TASK-010-004, TASK-010-007, TASK-010-008                             | TEST-010-009                                           | passed    |
| AC-010-011 | NFR-010-006, NFR-010-007                                        | TASK-010-001, TASK-010-007, TASK-010-008                             | TEST-010-011                                           | passed    |
| AC-010-012 | REQ-010-001, REQ-010-005, REQ-010-006, NFR-010-005, NFR-010-008 | TASK-010-005, TASK-010-006, TASK-010-008                             | TEST-010-010, TEST-010-012                             | passed    |
| AC-010-013 | REQ-010-008, NFR-010-008                                        | TASK-010-004, TASK-010-005, TASK-010-006, TASK-010-007, TASK-010-008 | TEST-010-007, TEST-010-008, TEST-010-013               | passed    |
