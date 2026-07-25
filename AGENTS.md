# Instrucciones de agentes para PIGAR

Todo agente que trabaje en este repositorio debe leer, en este orden:

1. `.harness/README.md`
2. `.harness/workflow.yaml`
3. `progress/current.yaml`
4. `features.yaml`
5. `docs/architecture.md`, `docs/decisions.md`, `docs/conventions.md` y `docs/security.md`
6. Las especificaciones de la feature activa.

## Reglas obligatorias

- No implementar features con estado `proposed`, `discovery`, `specification` o `spec_review`.
- No modificar código antes de que `approvals.specification.status` sea `approved`.
- No seleccionar silenciosamente un stack, proveedor de pagos, mapas, identidad, notificaciones o almacenamiento. Registrar la decisión y solicitar aprobación cuando corresponda.
- Actualizar `tasks.md` después de completar y verificar cada tarea.
- Mantener IDs estables entre requisitos, aceptación, tareas, pruebas y evidencia.
- No declarar una prueba como exitosa sin registrar el comando y su salida resumida en `evidence.md`.
- No usar credenciales reales en el repositorio ni exponer datos personales, ubicaciones o URLs firmadas en logs.
- No hacer commit, push, despliegue ni abrir PR sin aprobación explícita de publicación.
- Preservar cambios preexistentes del usuario y limitar cada incremento al alcance aprobado.

## Roles

El Leader coordina los roles definidos en `.harness/roles/`. Un agente puede desempeñar varios roles secuencialmente, pero debe respetar las puertas y no autoaprobar su propio trabajo.
