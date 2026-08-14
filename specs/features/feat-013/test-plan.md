# Plan de pruebas — feat-013: Sistema visual y experiencia operativa inicial

## Alcance y riesgos

Se verifica que el rediseño no altere los flujos funcionales ni exponga datos
sensibles. Se cubren dos viewports CLIENT (móvil/escritorio) y tres modos de
ADMIN (escritorio/laptop/tablet), con fixtures sintéticos.

| ID | Nivel | Cobertura/AC | Comando previsto | Estado |
| --- | --- | --- | --- | --- |
| TEST-013-001 | Unit | Tokens, componentes base, labels, estados y contraste verificable. AC-013-001, AC-013-004 | `pnpm test:unit` | passed |
| TEST-013-002 | E2E | CLIENT crea/consulta; ADMIN asigna/transiciona; navegación responsive conserva acciones. AC-013-002 a AC-013-004 | `pnpm test:e2e:frontends` | passed |
| TEST-013-003 | Security | Proyecciones CLIENT, enlaces de adjunto, no PII en UI/logs y recursos visuales controlados. AC-013-001, AC-013-005 | `pnpm test:security` | passed — 39/39, incluida la verificación Compose de red, persistencia y concurrencia. |
| TEST-013-004 | Manual/E2E | Teclado, foco, zoom, contraste, touch target y UAT visual de staging. AC-013-002 a AC-013-005 | `pnpm test:e2e:frontends` + checklist UAT | passed — UAT inicial aprobada por el usuario el 2026-08-14; la UAT posterior en staging verificará la imagen publicada. |

## Fixtures y datos personales

Sólo identidades, domicilios, teléfonos y adjuntos sintéticos. No incluir
capturas con PII, tokens, URLs internas de multimedia ni valores de entorno.
