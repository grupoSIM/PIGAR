# Harness de desarrollo de PIGAR

Este arnés gobierna el desarrollo guiado por especificaciones de PIGAR. Separa las reglas reutilizables del proceso (`.harness/`) del contexto del producto (`docs/`) y exige evidencia verificable antes de cerrar una característica.

## Inicio rápido

Pedile al agente:

> Leé `AGENTS.md` y actuá como Leader. Inspeccioná `features.yaml` y `progress/current.yaml`. Si hay decisiones abiertas o features propuestas, prepará la recomendación y detenete en la puerta de aprobación correspondiente.

## Flujo

`proposed → discovery → specification → spec_review → approved → implementation → verification → publication_review → done`

Ninguna feature puede pasar a `done` si tiene tareas abiertas, criterios de aceptación sin evidencia, verificaciones fallidas o aprobaciones pendientes.

## Fuentes de verdad

- `features.yaml`: roadmap y estado resumido.
- `progress/current.yaml`: ejecución activa y aprobaciones.
- `specs/features/<id>/`: contrato completo de cada incremento.
- `evidence.md`: comandos, resultados y pruebas que justifican el cierre.
- `docs/`: arquitectura, convenciones y seguridad del producto.

## Puertas humanas

1. Aprobación de decisiones arquitectónicas relevantes.
2. Aprobación de la especificación antes de modificar código.
3. Aprobación antes de publicar, hacer push o abrir un PR.

## Regla de consistencia

Los checklists se actualizan durante la implementación. El Reviewer debe rechazar el cierre si `tasks.md` contiene `- [ ]` o si `acceptance.md` no enlaza cada criterio con evidencia concreta.
