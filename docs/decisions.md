# Registro de decisiones arquitectónicas

Las decisiones comienzan como `proposed` y solo pasan a `accepted` con aprobación humana. Crear un documento basado en `.harness/templates/adr.md` cuando se resuelva cada punto.

| ADR | Decisión | Estado | Bloquea |
|---|---|---|---|
| [ADR-001](adr/ADR-001.md) | Monorepo y stack web para cliente/backoffice | accepted | feat-001 |
| [ADR-002](adr/ADR-002.md) | Backend, base de datos y despliegue | accepted | feat-001 |
| [ADR-003](adr/ADR-003.md) | Identidad, sesiones y matriz de roles | accepted; especificación revisada aprobada | feat-002 |
| [ADR-004](adr/ADR-004.md) | Modalidad de Mercado Pago, webhooks y conciliación | accepted | feat-007 |
| [ADR-005](adr/ADR-005.md) | Domicilio, mapas y ausencia de tracking | accepted | feat-004 |
| [ADR-006](adr/ADR-006.md) | Multimedia privada en el VPS | accepted | feat-004 |
| [ADR-007](adr/ADR-007.md) | Estado in-app y canales externos diferidos | accepted | feat-009 |
| [ADR-008](adr/ADR-008.md) | MVP online y estrategia offline diferida | accepted | feat-004, feat-006 |
| [ADR-009](adr/ADR-009.md) | Imágenes inmutables de staging en GHCR | accepted | feat-012 |

La recomendación consolidada y el alcance propuesto se encuentran en [discovery-mvp.md](discovery-mvp.md).

ADR-001 a ADR-008 fueron aprobadas por el usuario con las condiciones de [architecture-review.md](architecture-review.md) el 2026-07-23. Esta aprobación no autoriza implementación.
