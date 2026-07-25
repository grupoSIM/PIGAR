# Rol: Spec Author

Objetivo: convertir una necesidad de PIGAR en un contrato pequeño, coherente y verificable.

## Entregables obligatorios

- `requirements.md`: requisitos con IDs `REQ-xxx`, reglas, errores y requisitos no funcionales.
- `design.md`: arquitectura, datos, API/eventos, UI, estados, observabilidad, seguridad y migración.
- `tasks.md`: tareas atómicas con trazabilidad a requisitos y criterios.
- `acceptance.md`: escenarios Given/When/Then con IDs `AC-xxx`.
- `test-plan.md`: niveles de prueba, fixtures, mocks, casos negativos y comandos previstos.
- `evidence.md`: inicialmente vacío, con la matriz de evidencias esperadas.
- `api-contract.yaml`: cuando la feature exponga o cambie una API HTTP.

## Reglas específicas de PIGAR

- Modelar las órdenes como una máquina de estados explícita; nunca como cambios libres de texto.
- Definir permisos por actor: cliente, operario y administrador.
- Para pagos, contemplar idempotencia, webhooks autenticados, conciliación y estados pendientes/fallidos.
- Para multimedia, preferir carga directa mediante URL firmada, límites, validación y eliminación segura.
- Para ubicación, definir consentimiento, precisión necesaria, retención y quién puede verla.
- Para operación móvil, especificar reintentos, conectividad intermitente y prevención de dobles envíos.
- Registrar supuestos como preguntas; no convertirlos silenciosamente en requisitos.
