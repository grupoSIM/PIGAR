# Aceptación — feat-001: Fundaciones técnicas y arquitectura ejecutable

## AC-001 — Monorepo reproducible

- Given: un checkout limpio con las herramientas documentadas.
- When: se instalan dependencias con lockfile y se ejecuta el build raíz.
- Then: las dos webs, API, worker y paquetes compilan sin dependencias prohibidas.
- Requisitos: REQ-001, REQ-002
- Evidencia esperada: TEST-001, TEST-002 y salida resumida en `evidence.md`.

## AC-002 — Shells dentro del alcance

- Given: ambas aplicaciones web iniciadas.
- When: se navega a su ruta inicial.
- Then: muestran PIGAR, son distinguibles, accesibles por teclado y no contienen operarios, tracking, KPIs ni datos reales.
- Requisitos: REQ-002, NFR-007
- Evidencia esperada: TEST-003 y capturas locales sin datos sensibles.

## AC-003 — Healthchecks correctos

- Given: API y PostgreSQL disponibles.
- When: se consultan liveness y readiness.
- Then: ambos responden 200 con el contrato OpenAPI.
- Requisitos: REQ-003
- Evidencia esperada: TEST-004.

## AC-004 — Readiness degradada

- Given: API viva y PostgreSQL no disponible.
- When: se consultan los healthchecks.
- Then: liveness responde 200, readiness responde 503 y ningún secreto aparece en la respuesta o logs.
- Requisitos: REQ-003, REQ-009
- Evidencia esperada: TEST-005.

## AC-005 — Persistencia y reinicio

- Given: migración inicial aplicada y datos técnicos sintéticos creados.
- When: se reinician los contenedores.
- Then: PostgreSQL y archivos finalizados permanecen; los servicios recuperan readiness.
- Requisitos: REQ-004, REQ-005, NFR-003
- Evidencia esperada: TEST-006.

## AC-006 — Superficie de red mínima

- Given: Compose levantado con configuración de prueba.
- When: se inspeccionan puertos y rutas desde fuera de la red interna.
- Then: solo Nginx está publicado y no se accede directamente a PostgreSQL, API interna, worker o volumen multimedia.
- Requisitos: REQ-005, NFR-001
- Evidencia esperada: TEST-007.

## AC-007 — Streaming multimedia válido

- Given: un archivo sintético permitido y actor de prueba autorizado.
- When: se ejecuta la carga PoC.
- Then: se valida, calcula checksum, finaliza atómicamente y se sirve por entrega interna con memoria acotada.
- Requisitos: REQ-006, NFR-002
- Evidencia esperada: TEST-008 y medición de memoria.

## AC-008 — Multimedia inválida o cruzada

- Given: archivos que exceden límites, MIME falso, video mayor a 30 segundos, carga interrumpida o actor cruzado.
- When: se ejecutan cargas/lecturas PoC.
- Then: se rechazan con error seguro, no queda objeto final y los temporales se limpian por regla verificable.
- Requisitos: REQ-006, NFR-001, NFR-004
- Evidencia esperada: TEST-009, TEST-010.

## AC-009 — Webhook idempotente y autenticado

- Given: eventos Sandbox válidos, inválidos, duplicados, concurrentes y fuera de orden.
- When: se ejecuta la PoC de proveedor.
- Then: solo datos confirmados por consulta autoritativa producen un resultado aprobado y cada evento efectivo se aplica una vez.
- Requisitos: REQ-007
- Evidencia esperada: TEST-011, TEST-012.

## AC-010 — Conciliación recupera evento perdido

- Given: una intención sintética pendiente cuyo webhook no llegó.
- When: se ejecuta conciliación.
- Then: consulta el proveedor/mocks contractuales, actualiza idempotentemente y deja trazabilidad sanitizada.
- Requisitos: REQ-007
- Evidencia esperada: TEST-013.

## AC-011 — Calidad bloqueante

- Given: checkout limpio.
- When: CI ejecuta formato, lint, typecheck/build, unit, integración y E2E técnico.
- Then: todas las categorías tienen comandos reales y un fallo provoca resultado no exitoso.
- Requisitos: REQ-008
- Evidencia esperada: TEST-014, TEST-015 y logs de CI.

## AC-012 — Configuración y logs seguros

- Given: configuración válida e inválida y operaciones técnicas.
- When: se inician procesos y se inspeccionan logs.
- Then: la configuración faltante falla temprano, `.env.example` no contiene secretos y los logs son estructurados, correlacionables y sanitizados.
- Requisitos: REQ-009, REQ-010, NFR-005
- Evidencia esperada: TEST-016, TEST-017.

## AC-013 — Contratos de estados y permisos

- Given: la matriz de actores y la máquina definida.
- When: se ejecutan pruebas de tabla sobre transiciones y permisos.
- Then: se aceptan únicamente combinaciones permitidas; pago pendiente/rechazado no avanza la orden y ningún técnico obtiene acceso.
- Requisitos: REQ-011
- Evidencia esperada: TEST-018, TEST-019.

## AC-014 — Capacidad, proveedores y recuperación documentados

- Given: resultados de PoC y condiciones arquitectónicas.
- When: se revisan runbooks y registro de capacidad.
- Then: quedan documentados límites/alertas, cuotas/costes fechados, decisión de cifrado, migración y bloqueos de backup/restauración antes de producción.
- Requisitos: REQ-012, NFR-006
- Evidencia esperada: TEST-020 y revisión documental.

## Matriz de trazabilidad

| Criterio | Requisito | Tareas | Pruebas | Evidencia |
|---|---|---|---|---|
| AC-001 | REQ-001, REQ-002 | TASK-001, TASK-002 | TEST-001, TEST-002 | pass: TEST-001 y TEST-002 2026-07-25 |
| AC-002 | REQ-002, NFR-007 | TASK-002 | TEST-003 | pass: TEST-003 2026-07-25 |
| AC-003 | REQ-003 | TASK-003, TASK-016 | TEST-004 | pass: TEST-004 2026-07-25 |
| AC-004 | REQ-003, REQ-009 | TASK-003, TASK-009 | TEST-005 | pass: TEST-005 2026-07-25 |
| AC-005 | REQ-004, REQ-005 | TASK-004, TASK-005 | TEST-006 | pass: TEST-006 2026-07-25 y evidencia de volumen sintético 2026-07-24 |
| AC-006 | REQ-005, NFR-001 | TASK-005, TASK-013 | TEST-007 | pass: TEST-007 2026-07-25 |
| AC-007 | REQ-006, NFR-002 | TASK-006 | TEST-008 | pass: TEST-008 2026-07-25 |
| AC-008 | REQ-006, NFR-001, NFR-004 | TASK-006, TASK-013 | TEST-009, TEST-010 | pass: TEST-009 y TEST-010 2026-07-25 |
| AC-009 | REQ-007 | TASK-007 | TEST-011, TEST-012 | pass: TEST-011 y TEST-012 2026-07-25 |
| AC-010 | REQ-007 | TASK-007 | TEST-013 | pass: TEST-013 2026-07-25 |
| AC-011 | REQ-008 | TASK-008, TASK-014 | TEST-014, TEST-015 | partial: configuración y meta-prueba pass 2026-07-25; ejecución remota pendiente de publicación |
| AC-012 | REQ-009, REQ-010, NFR-005 | TASK-009, TASK-010 | TEST-016, TEST-017 | pass: TEST-016 y TEST-017 2026-07-25 |
| AC-013 | REQ-011 | TASK-011, TASK-012 | TEST-018, TEST-019 | pass: TEST-018 y TEST-019 2026-07-25 |
| AC-014 | REQ-012, NFR-006 | TASK-015 | TEST-020 | pass: TEST-020 2026-07-25 |
