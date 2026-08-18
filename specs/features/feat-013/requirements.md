# Requisitos — feat-013: Sistema visual y experiencia operativa inicial

- Estado: `done`.
- Dependencias: feat-002, feat-004 y feat-005 cerradas e integradas en `main`.
- Referencia visual: `docs/design-review-stitch.md` y los ZIP de `stitch/`.

## Objetivo y alcance

Materializar el sistema visual validado en Stitch en los flujos actualmente
operativos de CLIENT, ADMIN y DISPATCHER. La implementación conserva las APIs,
el dominio, los permisos y los controles de seguridad existentes; cambia sólo
la presentación, jerarquía, accesibilidad y consistencia de la interfaz.

## Fuera de alcance

- Pagos, presupuestos, calificaciones, notificaciones, reportes, dashboard de
  KPIs, tracking, agenda, pedidos/materiales o portal de operarios.
- Cambios de contratos HTTP, Auth0, base de datos, almacenamiento, auditoría o
  reglas de negocio.
- Código HTML de Stitch, activos remotos no controlados, datos reales o
  promesas de SMS/push/ubicación de técnicos.

## Actores y permisos

| Actor | Experiencia visual permitida | Límites que no cambian |
| --- | --- | --- |
| CLIENT | Acceso, solicitudes propias, nueva solicitud y orden segura. | No ve teléfono, motivos, ubicación, ETA, WhatsApp ni datos ajenos. |
| ADMIN | Bandeja, técnicos, asignación, hitos y adjuntos autorizados. | Conserva autorización de servidor y auditoría existentes. |
| DISPATCHER | Bandeja, asignación y hitos permitidos actualmente. | No adquiere administración de técnicos ni datos fuera de su rol. |
| Visitante/técnico | Pantalla de acceso o denegación correspondiente. | No obtiene acceso a datos o acciones internas. |

## Requisitos funcionales

### REQ-013-001 — Fundaciones visuales compartidas

- When: cualquier portal renderiza una pantalla o componente común.
- Where: `@pigar/ui`, portal CLIENT y backoffice.
- The system shall: aplicar tokens consistentes de color, tipografía, espaciado,
  radios, bordes, foco y componentes base, inspirados en Stitch; los tokens
  definen semántica y no sustituyen el texto por color.
- Errores y límites: no se cargan HTML, Tailwind CDN, fuentes, íconos ni
  imágenes remotas de Stitch en tiempo de ejecución.

### REQ-013-002 — Portal CLIENT mobile-first

- When: CLIENT abre acceso, inicio, alta de solicitud o seguimiento.
- Where: pantallas ya implementadas de feat-002, feat-004 y feat-005.
- The system shall: presentar un shell mobile-first coherente, navegación y
  acciones táctiles de al menos 48 px, formularios legibles, resumen de
  solicitud, progreso de adjuntos e historial seguro.
- Errores y límites: no modifica campos, validación, archivos permitidos,
  importes, estados ni la proyección de datos existente.

### REQ-013-003 — Backoffice operativo

- When: ADMIN o DISPATCHER abre la bandeja, un detalle, técnicos o una acción
  operativa.
- Where: backoffice existente de feat-005.
- The system shall: usar sidebar adaptable (fija en escritorio, colapsable en
  laptop y drawer en tablet), tablas/listas, filtros, detalle, badges y
  confirmaciones consistentes con el diseño Stitch de administración.
- Errores y límites: la entrada sigue siendo la bandeja; no se incorpora
  dashboard/KPIs, tracking, sugerencia automática ni datos adicionales.

### REQ-013-004 — Estados, recuperación y orientación

- When: hay carga, listado vacío, error recuperable, sesión expirada, permiso
  denegado, adjunto inválido/en progreso o una acción exitosa.
- Where: ambos portales y sus acciones existentes.
- The system shall: mostrar un estado visual accesible, texto claro, acción de
  recuperación cuando exista y una salida de sesión/reinicio de acceso visible.
- Errores y límites: los mensajes no revelan tokens, PII, rutas físicas,
  motivos internos, teléfonos ni detalles técnicos innecesarios.

### REQ-013-005 — Accesibilidad y preservación de flujos

- When: una persona usa teclado, lector de pantalla, zoom o viewport reducido.
- Where: componentes y rutas modificadas.
- The system shall: conservar foco visible, navegación por teclado, labels,
  contraste WCAG AA verificable, jerarquía semántica y responsive sin pérdida
  de acciones; las E2E existentes continúan cubriendo los flujos críticos.
- Errores y límites: ninguna mejora cosmética puede omitir un control, cambiar
  su permiso o sustituir una indicación textual por un icono/color aislado.

## Requisitos no funcionales

- NFR-013-001 Seguridad y privacidad: la capa visual no persiste tokens,
  domicilio, teléfonos, multimedia ni respuestas sensibles; conserva las
  proyecciones actuales por actor.
- NFR-013-002 Rendimiento: fuentes e íconos se empaquetan/controlan sin
  dependencia visual remota en runtime; el rediseño no añade proveedores.
- NFR-013-003 Disponibilidad: los estados de degradación y reintento usan las
  operaciones existentes; no se introduce funcionamiento offline.
- NFR-013-004 Accesibilidad: WCAG AA para contraste, foco, teclado, labels y
  objetivos táctiles CLIENT de 48 px.
- NFR-013-005 Observabilidad: no se añaden logs de contenido visual, PII o
  interacción sensible; errores conservan correlation ID seguro cuando exista.

## Decisiones confirmadas

- DEC-013-001: Hanken Grotesk, Inter e íconos se usarán sólo con licencia y
  empaquetado/control local, sin llamadas externas en runtime.
- DEC-013-002: la primera entrega cubre todos los flujos existentes; pantallas
  de feat-006 a feat-011 permanecen diferidas.
- DEC-013-003: sidebar desktop/laptop/tablet según discovery, sin dashboard.
- DEC-013-004: los activos serán locales y licenciados; no se usan imágenes
  externas de los prototipos.
- DEC-013-005: la validación combina E2E funcional, accesibilidad y revisión
  visual en staging con fixtures sintéticos.

## Dependencias

- `@pigar/ui` como límite de componentes compartidos.
- Los contratos y E2E existentes de feat-002, feat-004 y feat-005.
- Inventario visual y restricciones `UI-D01` a `UI-D03` de Stitch.
