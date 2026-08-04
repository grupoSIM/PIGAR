# Aceptación — feat-004

| ID         | Escenario                                                                                                        | Requisitos                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| AC-004-001 | CLIENT confirma una solicitud válida y recibe oferta congelada; reintento idempotente no duplica.                | REQ-004-001, NFR-004-001; TEST-004-001; TASK-004-002  |
| AC-004-002 | Calle/número/descripción faltantes se rechazan; Google falla y el ingreso manual funciona.                       | REQ-004-002; TEST-004-001; TASK-004-003               |
| AC-004-003 | Imagen o MP4 válido habilita operación; MIME/tamaño/duración inválidos y carga interrumpida se rechazan/limpian. | REQ-004-003; TEST-004-001, TEST-004-004; TASK-004-004 |
| AC-004-004 | Otro CLIENT, técnico o visitante no acceden a solicitud, domicilio ni archivo; ADMIN/DISPATCHER sí.              | REQ-004-004; TEST-004-003; TASK-004-005               |
| AC-004-005 | Auditoría y logs no exponen dirección, coordenadas, archivos ni secretos.                                        | REQ-004-004, NFR-004-004; TEST-004-003; TASK-004-005  |
