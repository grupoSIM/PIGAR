# Plan de pruebas — feat-014: Alineación visual integral con Stitch

- Estado: `done`; ejecución técnica, revisión independiente PASS y publicación en
  staging completadas el 2026-09-03.
- Fixtures: identidades, domicilios, teléfonos, IDs, pagos y adjuntos
  exclusivamente sintéticos. Las capturas no incluirán tokens, URLs firmadas,
  rutas internas ni datos reales.

## Estrategia

Cada pantalla combina: regresión funcional existente, prueba de estados,
accesibilidad automatizada/manual, viewports definidos y comparación visual
contra Stitch. Las diferencias funcionales intencionales se validan con pruebas
negativas; no se fuerzan al pixel contenidos prohibidos o inexistentes.

## Matriz de pruebas

| ID           | Nivel                   | Escenario/AC                                                                                                                                               | Comando previsto                                                                   | Estado |
| ------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------ |
| TEST-014-001 | format                  | Archivos modificados y formato del repositorio. AC-014-001, AC-014-012                                                                                     | `prettier --check` equivalente directo y `git diff --check`                        | passed |
| TEST-014-002 | unit/component          | Tokens, componentes, estados, licencias y ausencia de recursos remotos. AC-014-001, AC-014-012                                                             | `node scripts/run-test-suite.mjs unit`                                             | passed |
| TEST-014-003 | build/type              | Typecheck y build de packages/frontends. AC-014-002, AC-014-012                                                                                            | `tsc` focalizado + `next build` CLIENT/ADMIN                                       | passed |
| TEST-014-004 | E2E CLIENT              | Acceso, inicio, solicitud, adjunto, seguimiento, pago, conformidad, notificaciones y postventa. AC-014-002, AC-014-003, AC-014-004, AC-014-005, AC-014-006 | Playwright directo contra CLIENT en `PIGAR_E2E_PORT=3100`                          | passed |
| TEST-014-005 | E2E ADMIN               | Acceso, navegación, bandeja, adjuntos, técnicos, asignación, hitos, cargo e incidencias. AC-014-007, AC-014-008, AC-014-009, AC-014-010                    | Playwright directo contra ADMIN en `http://127.0.0.1:3001`                         | passed |
| TEST-014-006 | E2E conjunto            | Regresión frontend completa. AC-014-003, AC-014-004, AC-014-005, AC-014-006, AC-014-007, AC-014-008, AC-014-009, AC-014-010, AC-014-012                    | 8 CLIENT + 8 ADMIN, Playwright directo                                             | passed |
| TEST-014-007 | integration             | Pagos/órdenes/transiciones no cambian por presentación. AC-014-005, AC-014-010, AC-014-012                                                                 | `node scripts/run-test-suite.mjs integration`                                      | passed |
| TEST-014-008 | security                | Roles, propiedad, PII, recursos, ausencia de tracking/contacto/canales/garantía. AC-014-004, AC-014-006, AC-014-008, AC-014-009, AC-014-010, AC-014-012    | `node scripts/run-test-suite.mjs security`                                         | passed |
| TEST-014-009 | accessibility automated | Semántica, nombres, contraste preliminar en rutas/estados. AC-014-002, AC-014-003, AC-014-006, AC-014-007, AC-014-009, AC-014-011                          | Checker estructural Playwright + medición WCAG local sin dependencia + AX tree CUA | passed |
| TEST-014-010 | accessibility manual    | Teclado, foco, Escape, lector, zoom 200 %, touch 48 px y reduced motion CLIENT. AC-014-002, AC-014-003, AC-014-004, AC-014-005, AC-014-006, AC-014-011     | Checklist de shell/CSS + E2E CLIENT                                                | passed |
| TEST-014-011 | responsive/manual       | ADMIN 768/1024/1440/1600, tabla/lista, rail/drawer, teclado y zoom. AC-014-007, AC-014-008, AC-014-009, AC-014-010, AC-014-011                             | Checklist + Playwright estructural en 4 viewports ADMIN                            | passed |
| TEST-014-012 | visual/docs             | Comparación por pantalla/viewports y trazabilidad documental. AC-014-001, AC-014-012                                                                       | Inspección Stitch/CUA + `node scripts/docs-check.mjs`                              | passed |

## Cobertura visual requerida por pantalla

- CLIENT C01–C10: 390 px como baseline móvil; 1280 px para reflow desktop; 360
  y 768 px para bordes. Capturar al menos default y estado crítico aplicable.
- ADMIN A01–A07: 1440 px baseline; 768, 1024 y 1600 px para drawer, rail, sidebar
  y contenido denso.
- Máscaras permitidas: reloj/fecha, ID opaco generado y canvas/mapa dinámico. No
  enmascarar layout, textos, foco, botones, estado o error.
- La comparación debe conservar capturas lado a lado o diff seguro y registrar
  referencia, viewport, tolerancia aprobada y explicación de diferencias.

## Accesibilidad

- Automatizada: reglas WCAG 2.2 AA aplicables, contraste, landmarks, headings,
  labels, roles, nombres, estados y relaciones.
- Manual CLIENT: recorrido completo sólo con teclado, foco visible, lector,
  zoom/reflow 200 %, 48 px, orientación y reduced motion.
- Manual ADMIN: drawer/rail/sidebar, tabla a lista, filtros, diálogos,
  restitución de foco y acciones densas.
- No se declara pass sólo por ausencia de violaciones automáticas.

## Casos negativos de alcance

- CLIENT no muestra WhatsApp, llamada, ubicación/ETA/matrícula del técnico,
  multimedia de rating, garantía o funciones de presupuesto complejo.
- ADMIN no muestra dashboard/KPIs, mapa de calor, cercanía/ETA, sugerencias,
  exportación/búsqueda/nueva orden falsas, push/SMS ni portal de operario.
- Separar rutas no altera estados, permisos, idempotencia, pago, conformidad,
  rating o incidencia y no oculta una función existente.

## Conectividad y degradación

Mockear de forma controlada 401/403/404/409/429/5xx, timeout de cada API, mapa
indisponible, carga de adjunto fallida y retorno de pago no autoritativo. La
falla de notificaciones/postventa queda local; la solicitud/orden sigue visible.

## Validación documental

Revisar IDs estables entre `requirements.md`, `acceptance.md`, `tasks.md`, este
plan y `evidence.md`; estados de `features.yaml`/`progress/current.yaml`; matriz
completa; decisiones abiertas y ausencia de afirmaciones de pruebas no ejecutadas.
