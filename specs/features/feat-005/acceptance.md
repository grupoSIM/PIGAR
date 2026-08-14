# Aceptación — feat-005

| ID | Escenario | Requisitos | Pruebas |
| --- | --- | --- | --- |
| AC-005-001 | ADMIN crea y desactiva técnico; sin teléfono no se activa ni asigna. | REQ-005-001 | TEST-005-001, TEST-005-003 |
| AC-005-002 | ADMIN/DISPATCHER asigna técnico activo a solicitud operable; reintento concurrente deja única orden `TECNICO_ASIGNADO`. | REQ-005-002, NFR-005-001 | TEST-005-001, TEST-005-002 |
| AC-005-003 | Hitos válidos llegan a `TRABAJO_FINALIZADO`; salto, versión obsoleta, técnico inactivo y cancelación sin motivo se rechazan. | REQ-005-003 | TEST-005-001, TEST-005-002 |
| AC-005-004 | CLIENT ve sólo su orden, estado, historial seguro y nombre completo; cancelación sólo dice `CANCELADA`. | REQ-005-004 | TEST-005-003, TEST-005-004 |
| AC-005-005 | CLIENT cruzado, visitante y técnico sin cuenta se deniegan; teléfono/motivo no llegan a CLIENT ni logs. | REQ-005-004, REQ-005-005, NFR-005-003 | TEST-005-003, TEST-005-004 |
