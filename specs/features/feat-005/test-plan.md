# Plan de pruebas — feat-005

| ID | Nivel | Cobertura | Comando previsto |
| --- | --- | --- | --- |
| TEST-005-001 | Unit | Estados, motivos, teléfono, técnico activo e idempotencia. | `pnpm test:unit` |
| TEST-005-002 | Integration | PostgreSQL: concurrencia, unicidad, versión, historial y FKs. | `pnpm test:integration` |
| TEST-005-003 | Security | Roles, propiedad, teléfono/motivo ocultos y logs sanitizados. | `pnpm test:security` |
| TEST-005-004 | E2E | Administración asigna/actualiza; CLIENT refresca proyección segura. | `pnpm test:e2e:frontends` |

Fixtures exclusivamente sintéticos; no usar teléfonos, domicilios, adjuntos, identidades, cookies o tokens reales.
