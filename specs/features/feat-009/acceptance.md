# Aceptación — feat-009: Notificaciones transaccionales in-app

## AC-009-001 — Emisión sólo ante cambios efectivos

- Given: una orden o pago en un estado válido y un comando autoritativo.
- When: ocurre cualquiera de los seis cambios allowlist o se reintenta sin
  cambio efectivo.
- Then: cambio e `OutboxEvent` v1 se confirman juntos exactamente una vez; no-op,
  estado pendiente y reintento no producen un evento adicional.
- Requisitos: REQ-009-001, NFR-009-001.
- Evidencia esperada: TEST-009-001 y TEST-009-003.

## AC-009-002 — Materialización idempotente y recuperable

- Given: un evento notificable y dos workers o un reinicio durante el proceso.
- When: ambos intentan materializarlo o el lease vence.
- Then: existe una sola notificación para el CLIENT propietario y el job termina
  procesado o recuperable sin perder el evento.
- Requisitos: REQ-009-002, NFR-009-001, NFR-009-005.
- Evidencia esperada: TEST-009-004 y TEST-009-007.

## AC-009-003 — Plantillas completas y minimizadas

- Given: un evento de cada tipo y versión permitidos.
- When: se materializa y proyecta el aviso.
- Then: título/resumen coinciden con su plantilla versionada y no contienen PII,
  importe, técnico, motivo, payload ni identificadores del proveedor.
- Requisitos: REQ-009-002, REQ-009-005, NFR-009-003.
- Evidencia esperada: TEST-009-001 y TEST-009-006.

## AC-009-004 — Bandeja propia paginada

- Given: un CLIENT con más de una página de avisos propios y avisos ajenos.
- When: lista con límites válidos y recorre cursores.
- Then: recibe sólo los propios, en orden estable, sin duplicados ni omisiones,
  con límite 20/50, cursor opaco y conteo no leído exacto.
- Requisitos: REQ-009-003, NFR-009-002, NFR-009-004.
- Evidencia esperada: TEST-009-002, TEST-009-005 y TEST-009-010.

## AC-009-005 — Lectura monotónica

- Given: una notificación no leída del CLIENT propietario.
- When: la marca leída concurrentemente o reintenta la solicitud.
- Then: se conserva el primer `readAt` UTC, el conteo disminuye una vez y no hay
  transición a no leída.
- Requisitos: REQ-009-004, NFR-009-001.
- Evidencia esperada: TEST-009-002, TEST-009-004 y TEST-009-005.

## AC-009-006 — Permisos negativos y no enumeración

- Given: visitante, rol no CLIENT o un CLIENT distinto.
- When: intenta listar o marcar una notificación.
- Then: obtiene respectivamente 401, 403 o 404 y no observa contenido, existencia
  ajena ni diferencias explotables.
- Requisitos: REQ-009-003, REQ-009-004, REQ-009-007, NFR-009-002.
- Evidencia esperada: TEST-009-006.

## AC-009-007 — Navegación no autoritativa

- Given: un aviso propio leído o histórico.
- When: el CLIENT abre su destino.
- Then: el portal consulta y autoriza de nuevo la solicitud actual; no deriva
  estado ni habilita una acción usando el aviso.
- Requisitos: REQ-009-005, REQ-009-006, NFR-009-002.
- Evidencia esperada: TEST-009-008 y TEST-009-009.

## AC-009-008 — Experiencia accesible y degradable

- Given: bandeja vacía, cargando, con avisos o con error local.
- When: el CLIENT usa teclado y lector semántico.
- Then: foco, nombres, fechas y estado leído son perceptibles; el error de bandeja
  no bloquea el resto del portal.
- Requisitos: REQ-009-006, NFR-009-008.
- Evidencia esperada: TEST-009-008 y TEST-009-012.

## AC-009-009 — Operación, migración y privacidad

- Given: migración limpia, backlog de worker y operaciones API.
- When: se ejecutan migración, retry/reinicio y observación.
- Then: constraints e índices son válidos, las métricas detectan edad/fallos y
  logs/auditoría no contienen contenido, payload, PII ni secretos.
- Requisitos: REQ-009-007, NFR-009-003, NFR-009-005, NFR-009-006,
  NFR-009-007, NFR-009-009.
- Evidencia esperada: TEST-009-007, TEST-009-010 y TEST-009-011.

## Matriz de trazabilidad

| Criterio   | Requisitos                                                                   | Tareas                                   | Pruebas                                  | Evidencia |
| ---------- | ---------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------- | --------- |
| AC-009-001 | REQ-009-001, NFR-009-001                                                     | TASK-009-002, TASK-009-007               | TEST-009-001, TEST-009-003               | pendiente |
| AC-009-002 | REQ-009-002, NFR-009-001, NFR-009-005                                        | TASK-009-001, TASK-009-003, TASK-009-007 | TEST-009-004, TEST-009-007               | pendiente |
| AC-009-003 | REQ-009-002, REQ-009-005, NFR-009-003                                        | TASK-009-003, TASK-009-008               | TEST-009-001, TEST-009-006               | pendiente |
| AC-009-004 | REQ-009-003, NFR-009-002, NFR-009-004                                        | TASK-009-001, TASK-009-004, TASK-009-008 | TEST-009-002, TEST-009-005, TEST-009-010 | pendiente |
| AC-009-005 | REQ-009-004, NFR-009-001                                                     | TASK-009-001, TASK-009-004, TASK-009-008 | TEST-009-002, TEST-009-004, TEST-009-005 | pendiente |
| AC-009-006 | REQ-009-003, REQ-009-004, REQ-009-007, NFR-009-002                           | TASK-009-004, TASK-009-006               | TEST-009-006                             | pendiente |
| AC-009-007 | REQ-009-005, REQ-009-006, NFR-009-002                                        | TASK-009-004, TASK-009-005, TASK-009-008 | TEST-009-008, TEST-009-009               | pendiente |
| AC-009-008 | REQ-009-006, NFR-009-008                                                     | TASK-009-005, TASK-009-008               | TEST-009-008, TEST-009-012               | pendiente |
| AC-009-009 | REQ-009-007, NFR-009-003, NFR-009-005, NFR-009-006, NFR-009-007, NFR-009-009 | TASK-009-001, TASK-009-006, TASK-009-007 | TEST-009-007, TEST-009-010, TEST-009-011 | pendiente |
