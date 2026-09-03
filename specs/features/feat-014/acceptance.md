# Aceptación — feat-014: Alineación visual integral con Stitch

- Estado: `verified`; aprobación de especificación del usuario, verificación
  técnica y revisión independiente PASS completadas el 2026-09-03; pendiente
  únicamente la aprobación humana de publicación.
- Regla: una comparación visual no reemplaza la prueba funcional ni de
  accesibilidad. Toda diferencia aceptada debe figurar en `design.md`.

## Criterios

### AC-014-001 — Sistema visual compartido y controlado

- Given: ambos portales construidos sin red visual externa.
- When: se inspeccionan shells y componentes base.
- Then: paleta, tipografía, espaciado, formas, foco y estados corresponden al
  sistema Stitch; no se carga código/asset remoto ni dependencia no aprobada.
- Requisitos: REQ-014-001, NFR-014-002, NFR-014-004.
- Evidencia esperada: TEST-014-001, TEST-014-002 y TEST-014-012.

### AC-014-002 — Acceso CLIENT fiel y funcional

- Given: visitante en 360/390/1280 px.
- When: abre el portal e inicia el flujo aprobado.
- Then: la composición se aproxima a `iniciar_sesi_n_pigar`, ofrece sólo email
  Auth0 autorizado, conserva teclado/foco y no simula proveedores o registro.
- Requisitos: REQ-014-002, REQ-014-010.
- Evidencia esperada: TEST-014-003, TEST-014-009 y TEST-014-010.

### AC-014-003 — Inicio, listado y nueva solicitud CLIENT

- Given: CLIENT con y sin solicitudes, datos sintéticos y errores controlados.
- When: navega inicio/listado y crea una solicitud con/sin adjuntos.
- Then: CTA, cards, pasos, mapa, campos, límites, carga, vacío, error y éxito se
  alinean a Stitch sin perder oferta, dirección manual, reintento ni validación.
- Requisitos: REQ-014-003, REQ-014-009, REQ-014-010.
- Evidencia esperada: TEST-014-004, TEST-014-009 y TEST-014-010.

### AC-014-004 — Seguimiento CLIENT seguro

- Given: órdenes sintéticas en cada estado existente.
- When: CLIENT abre detalle/seguimiento.
- Then: card/timeline siguen el patrón Stitch con historial real y acciones
  permitidas; no aparecen contacto, ubicación, ETA, matrícula ni PII ajena.
- Requisitos: REQ-014-004, NFR-014-001.
- Evidencia esperada: TEST-014-004, TEST-014-008 y TEST-014-010.

### AC-014-005 — Pago y conformidad preservados

- Given: pago pendiente, rechazado, cancelado, verificando y aprobado.
- When: CLIENT inicia/retoma Checkout o conforma.
- Then: resumen/CTA/estados se alinean al patrón Stitch, el retorno no adelanta
  la orden y la conformidad sólo aparece cuando el backend la permite.
- Requisitos: REQ-014-004, NFR-014-003.
- Evidencia esperada: TEST-014-004, TEST-014-007 y TEST-014-010.

### AC-014-006 — Notificaciones, rating e incidencias CLIENT

- Given: listas vacías/con datos, rating ausente/creado e incidencia en cada estado.
- When: CLIENT opera por teclado, incluido error y 429.
- Then: las funciones siguen visibles y alineadas al patrón Stitch más cercano;
  se preservan allowlists, `Otro` 1..100, inmutabilidad y degradación; no se
  agregan multimedia, texto de incidencia, garantía o canales externos.
- Requisitos: REQ-014-005, REQ-014-009, REQ-014-010.
- Evidencia esperada: TEST-014-004, TEST-014-008, TEST-014-009 y TEST-014-010.

### AC-014-007 — Shell y acceso ADMIN responsive

- Given: visitante/ADMIN/DISPATCHER en 768/1024/1440/1600 px.
- When: abre acceso y navega sidebar/rail/drawer.
- Then: el shell coincide con Utility Core Desktop, foco y Escape funcionan y
  sólo muestra destinos/capacidades reales; Auth0/MFA siguen siendo autoridad.
- Requisitos: REQ-014-002, REQ-014-006, REQ-014-010.
- Evidencia esperada: TEST-014-005, TEST-014-009 y TEST-014-011.

### AC-014-008 — Bandeja y detalle ADMIN sin alcance falso

- Given: solicitudes/órdenes en estados y completitud variados.
- When: operación filtra, abre detalle, adjunto autorizado y acciones existentes.
- Then: tabla/lista, badges, filtros y paneles se aproximan a Stitch; no aparecen
  KPIs, tracking, recomendaciones, búsqueda/exportación/nueva orden sin soporte.
- Requisitos: REQ-014-006, REQ-014-009, NFR-014-001.
- Evidencia esperada: TEST-014-005, TEST-014-008 y TEST-014-011.

### AC-014-009 — Asignación y técnicos ADMIN

- Given: técnicos sintéticos activos/inactivos y solicitud operable.
- When: ADMIN gestiona técnico o asigna manualmente.
- Then: detalle/tabla/panel siguen Stitch y mantienen nombre, teléfono, estado y
  asignación reales; no calculan distancia, ETA, rating, especialidad, costo ni aviso externo.
- Requisitos: REQ-014-007, REQ-014-010.
- Evidencia esperada: TEST-014-005, TEST-014-008, TEST-014-009 y TEST-014-011.

### AC-014-010 — Hitos, resolución, cargo y soporte ADMIN

- Given: orden en cada estado accionable e incidencias/rating sintéticos.
- When: ADMIN/DISPATCHER ejecuta sólo la próxima acción válida.
- Then: ActionBar/confirmación/paneles accesibles preservan transición, cargo,
  permisos, triage y consulta; no habilitan presupuesto complejo ni nueva regla.
- Requisitos: REQ-014-008, REQ-014-009, REQ-014-010.
- Evidencia esperada: TEST-014-005, TEST-014-007, TEST-014-008 y TEST-014-011.

### AC-014-011 — Estados y accesibilidad transversales

- Given: loading, vacío, error, éxito, permiso, sesión y zoom 200 %.
- When: se recorren pantallas y acciones sólo con teclado/lector.
- Then: foco, reflow, labels, headings, nombres/estados, contraste AA,
  `aria-live`, reducción de movimiento y touch target cumplen REQ-014-010.
- Requisitos: REQ-014-009, REQ-014-010, NFR-014-005.
- Evidencia esperada: TEST-014-009, TEST-014-010 y TEST-014-011.

### AC-014-012 — Calidad, privacidad y comparación visual completa

- Given: implementación terminada con fixtures sintéticos.
- When: se ejecutan formato, lint, tipos, build, E2E CLIENT/ADMIN, accesibilidad,
  seguridad, documentación y comparaciones visuales aprobadas.
- Then: todos pasan y `evidence.md` registra comando, salida resumida y artefacto
  seguro por pantalla; ninguna captura contiene PII, secretos o URLs firmadas.
- Requisitos: NFR-014-001 a NFR-014-006.
- Evidencia esperada: TEST-014-001 a TEST-014-012.

## Matriz de trazabilidad

| Criterio   | Requisitos                   | Tareas       | Pruebas                  | Evidencia                                                                                                                               |
| ---------- | ---------------------------- | ------------ | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| AC-014-001 | REQ-014-001; NFR-014-002/004 | TASK-014-005 | TEST-014-001/002/012     | Tokens locales y shell compartido en `packages/ui/src/index.tsx`; Prettier, unit 52/52 y revisión Stitch/CUA; verified                  |
| AC-014-002 | REQ-014-002/010              | TASK-014-006 | TEST-014-003/009/010     | `apps/customer-web` acceso Auth0, headings/labels/estados semánticos; build y viewports CLIENT 360/390/1280 sin overflow; verified      |
| AC-014-003 | REQ-014-003/009/010          | TASK-014-006 | TEST-014-004/009/010     | Inicio, cards, CTA, stepper, oferta, domicilio, mapa, evidencia y estados; E2E CLIENT 8/8; verified                                     |
| AC-014-004 | REQ-014-004; NFR-014-001     | TASK-014-007 | TEST-014-004/008/010     | Timeline/historial y datos mínimos en `customer-requests.tsx`; E2E de estados + security 68/68; verified                                |
| AC-014-005 | REQ-014-004; NFR-014-003     | TASK-014-007 | TEST-014-004/007/010     | Pago/reintento/conformidad conservados; E2E CLIENT y integration 55/55 pass; verified                                                   |
| AC-014-006 | REQ-014-005/009/010          | TASK-014-008 | TEST-014-004/008/009/010 | Notificaciones, rating e incidencia siguen visibles con degradación local; E2E CLIENT 8/8 y security 68/68; verified                    |
| AC-014-007 | REQ-014-002/006/010          | TASK-014-009 | TEST-014-005/009/011     | Shell ADMIN con sidebar/rail/drawer y navegación real; 4 viewports ADMIN sin overflow y E2E 8/8; verified                               |
| AC-014-008 | REQ-014-006/009; NFR-014-001 | TASK-014-010 | TEST-014-005/008/011     | Bandeja/detalle, filtros, badges y estados soportados; sin KPIs/funciones falsas; E2E ADMIN y security; verified                        |
| AC-014-009 | REQ-014-007/010              | TASK-014-011 | TEST-014-005/008/009/011 | Técnicos y asignación manual sin métricas inferidas; E2E ADMIN 8/8 y viewports 768/1024/1440/1600; verified                             |
| AC-014-010 | REQ-014-008/009/010          | TASK-014-012 | TEST-014-005/007/008/011 | Hitos, resolución, cargo, triage e incidencias conservados; integration/security pass y E2E ADMIN; verified                             |
| AC-014-011 | REQ-014-009/010; NFR-014-005 | TASK-014-013 | TEST-014-009/010/011     | Loading/vacío/error/success, `aria-live`/`aria-busy`, foco, reduced motion y reflow comprobados; inspección estructural + CUA; verified |
| AC-014-012 | NFR-014-001..006             | TASK-014-014 | TEST-014-001..012        | Evidencia técnica por comando, 16 E2E, unit/integration/security, docs, 8 viewports y revisión visual Stitch; verified; Reviewer PASS   |
