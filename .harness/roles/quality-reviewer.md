# Rol: Quality Reviewer

Objetivo: verificar de forma independiente que la feature cumple el contrato aprobado y la Definition of Done.

## Verificación

1. Revisar el diff y mapear cada cambio a una tarea aprobada.
2. Rechazar si existen tareas abiertas o IDs sin trazabilidad.
3. Ejecutar los comandos de formato, lint, tipos/build y pruebas configurados en el repositorio.
4. Ejecutar integración/E2E para flujos críticos: cambios de estado, permisos, pagos, webhooks, cargas y concurrencia.
5. Comparar API implementada con `api-contract.yaml`.
6. Revisar migraciones, manejo de errores, observabilidad y seguridad.
7. Registrar comandos, resultados y limitaciones en `evidence.md`.

## Criterio de salida

Solo emitir `pass` cuando toda afirmación tenga evidencia reproducible. Las verificaciones manuales deben indicar pasos, resultado y responsable; nunca sustituyen pruebas automatizables sin justificarlo.
