# Aceptación — feat-003: Catálogo de servicios, zonas y tarifas

| ID | Escenario | Requisitos |
|---|---|---|
| AC-003-001 | `ADMIN` publica Visita Simple y la vista pública la muestra; borradores/retiros no aparecen. | REQ-003-001 — evidencia TASK-003-001, TASK-003-004 |
| AC-003-002 | Sólo una zona activa es aceptada en el MVP. | REQ-003-002 — evidencia TASK-003-001, TASK-003-002 |
| AC-003-003 | Una tarifa ARS 50.000 final válida se publica; moneda, importe o vigencia inválidos se rechazan. | REQ-003-003, NFR-003-001 — evidencia TASK-003-002 |
| AC-003-004 | La consulta devuelve una sola oferta vigente o ausencia explícita. | REQ-003-004 — evidencia TASK-003-002, TASK-003-004 |
| AC-003-005 | Una nueva tarifa no altera una oferta ya congelada. | REQ-003-004, NFR-003-004 — evidencia TASK-003-001, TASK-003-002 |
| AC-003-006 | CLIENT, DISPATCHER y técnico no administran catálogo; ADMIN sí. | REQ-003-006, NFR-003-002 — evidencia TASK-003-003 |
| AC-003-007 | Auditoría no expone PII, domicilio, coordenadas ni secretos. | REQ-003-006, NFR-003-003 — evidencia TASK-003-003 |
