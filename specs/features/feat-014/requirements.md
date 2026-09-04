# Requisitos — feat-014: Alineación visual integral con Stitch

- Estado: `done`; especificación y DEC-014-001 a DEC-014-005 aprobadas por el usuario el 2026-09-03; publicación en staging verificada.
- Inicio: 2026-09-03.
- Dependencias: `feat-013`, `feat-007`, `feat-009` y `feat-010` cerradas.
- Fuente visual: todos los `screen.png`, `code.html` y `DESIGN.md` bajo
  `stitch/aplicacion_cliente/` y `stitch/backoffice/`.
- Puerta: la publicación en staging quedó autorizada y verificada; producción
  permanece fuera de alcance.

## Objetivo y alcance

Alinear de forma integral las pantallas existentes de `apps/customer-web` y
`apps/admin-web` con las referencias Stitch, priorizando similitud verificable
de composición, jerarquía, color, tipografía, espaciado, componentes, estados y
responsive. La funcionalidad ya implementada que no aparece en Stitch se
conserva visible y operable, presentada con el patrón Stitch más cercano.

La feature sólo cambia presentación, navegación y composición frontend. No
modifica reglas de negocio, permisos, estados, contratos API, pagos, órdenes,
identidad, persistencia, proveedores, auditoría ni flujos funcionales.

## Inventario normativo de pantallas

### CLIENT

| ID         | Pantalla actual/objetivo            | Referencia principal                                                                                           | Tratamiento                                                                                     |
| ---------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| UI-014-C01 | Acceso CLIENT                       | `iniciar_sesi_n_pigar`                                                                                         | Adaptar a Auth0/email aprobado; no agregar Google/Apple/teléfono/registro.                      |
| UI-014-C02 | Inicio y listado de solicitudes     | `inicio_cliente_pigar_espa_ol`                                                                                 | Mantener solicitudes propias, notificaciones y CTA; sin contacto/ETA/tracking.                  |
| UI-014-C03 | Nueva solicitud                     | `nueva_solicitud_espa_ol`                                                                                      | Conservar oferta, descripción, domicilio, mapa y límites reales de adjuntos.                    |
| UI-014-C04 | Detalle/seguimiento de orden        | `seguimiento_de_orden_espa_ol`                                                                                 | Conservar proyección segura e historial real; sin ubicación/contacto del técnico.               |
| UI-014-C05 | Pago y conformidad de Visita Simple | `pago_de_visita_est_ndar_escenario_a` y `pago_final_presupuesto_escenario_b` sólo como patrón de cuenta/estado | Conservar Checkout Pro, verificación no autoritativa, reintento y conformidad aprobados.        |
| UI-014-C06 | Calificación                        | `calificaci_n_de_servicio_y_rese_a`                                                                            | Conservar estrellas, motivo allowlist y `Otro`; no agregar multimedia ni reseña libre general.  |
| UI-014-C07 | Incidencias de postventa            | Sin referencia directa; patrón de detalle/calificación                                                         | Mantener selector estructurado, historial y aviso neutral, sin promesa de garantía.             |
| UI-014-C08 | Notificaciones in-app               | Sin referencia directa; patrón de navegación/listas CLIENT                                                     | Mantener indicador, bandeja, leído/no leído y degradación local.                                |
| UI-014-C09 | Perfil/sesión                       | `perfil_de_usuario_pigar`                                                                                      | Alinear shell y cierre de sesión; no simular edición de perfil o preferencias no implementadas. |
| UI-014-C10 | Estados transversales               | Sistema CLIENT Stitch                                                                                          | Loading, vacío, error, éxito, permiso, sesión, adjunto y pago con recuperación segura.          |

### ADMIN/DISPATCHER

| ID         | Pantalla actual/objetivo                     | Referencia principal                                                                                  | Tratamiento                                                                                                             |
| ---------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| UI-014-A01 | Acceso administrativo                        | `inicio_de_sesi_n_administraci_n_pigar`                                                               | Adaptar a Auth0/MFA; no crear formulario de credenciales local ni claims de seguridad falsos.                           |
| UI-014-A02 | Bandeja de solicitudes/órdenes               | `gesti_n_de_pedidos_pigar_espa_ol` y `gesti_n_de_rdenes_de_trabajo_pigar`                             | Tabla/lista densa y filtros reales; sin KPIs, recomendación, exportar/imprimir o nueva orden no implementados.          |
| UI-014-A03 | Detalle y asignación                         | `asignaci_n_de_t_cnico_pigar_espa_ol`                                                                 | Conservar asignación manual, domicilio y adjuntos autorizados; sin cercanía, ETA, costo de viaje, push/SMS ni tracking. |
| UI-014-A04 | Gestión de técnicos                          | `gesti_n_de_t_cnicos_pigar_espa_ol`                                                                   | Mantener CRUD mínimo, estado y teléfono operativo; sin métricas, rating, especialidad o disponibilidad no contratados.  |
| UI-014-A05 | Hitos, resolución, cargo y soporte por orden | Patrones de asignación, listado y `editor_de_presupuestos_pigar_admin` sólo para jerarquía de paneles | Mantener acciones válidas, cargo inmutable y postventa; no habilitar presupuesto complejo.                              |
| UI-014-A06 | Bandeja de incidencias                       | Sin referencia directa; patrón de tabla/filtros ADMIN                                                 | Mantener filtros, triage, cierre, historial y recuperación.                                                             |
| UI-014-A07 | Estados transversales                        | Utility Core Desktop                                                                                  | Loading, vacío, error, éxito, permiso y sesión sin ocultar el resto de la operación.                                    |

Las referencias de dashboard, reportes, editor de presupuestos, pedidos/materiales
y pagos de presupuesto complejo se inventarían visualmente pero no se
implementan porque sus capacidades están fuera del producto aprobado.

## Actores y permisos

| Actor                       | Presentación permitida                                        | Invariantes                                                                |
| --------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| CLIENT propietario          | Sus solicitudes, órdenes, pagos, notificaciones y postventa.  | No ve datos ajenos, contacto/ubicación del técnico ni información interna. |
| ADMIN                       | Superficie operativa autorizada y gestión mínima de técnicos. | La UI no amplía capacidades del servidor ni acceso a datos.                |
| DISPATCHER                  | Bandeja y acciones actualmente autorizadas.                   | No adquiere administración exclusiva de ADMIN.                             |
| Visitante/rol no autorizado | Acceso, sesión expirada o denegación neutra.                  | No se revela existencia de recursos ni datos protegidos.                   |

## Requisitos funcionales

### REQ-014-001 — Sistema visual fiel y compartido

- When: cualquiera de los dos portales renderiza una pantalla.
- Where: `@pigar/ui`, estilos y shells frontend.
- The system shall: derivar de Stitch tokens semánticos para paleta, tipografía,
  escala, ritmo de 8 px, radios, bordes, elevación, iconografía, foco y estados;
  CLIENT usa Hanken Grotesk + Inter y ADMIN Hanken Grotesk con densidad desktop.
- Errores y límites: no copiar `code.html`, Tailwind CDN, scripts, datos, fuentes,
  iconos o imágenes remotas; no agregar dependencia sin decisión aprobada.

### REQ-014-002 — Arquitectura visual por pantalla

- When: una persona navega un flujo existente.
- Where: UI-014-C01 a C10 y UI-014-A01 a A07.
- The system shall: presentar cada contexto con encabezado, navegación,
  jerarquía y composición equivalentes a la referencia aplicable, evitando la
  página monolítica actual y conservando acceso a todas las funciones existentes.
- Errores y límites: separar vistas no cambia endpoint, payload, estado,
  autorización o resultado funcional; las rutas concretas requieren aprobación.

### REQ-014-003 — Inicio, solicitudes y nueva solicitud CLIENT

- The system shall: acercar UI-014-C02/C03 a las tarjetas, CTA amarillo, pasos,
  controles grandes, mapa y barra de navegación Stitch; conservar oferta
  vigente, dirección manual, geolocalización voluntaria y límites de evidencia.
- Errores y límites: no mostrar dirección hardcodeada, usar ubicación del
  técnico, exigir multimedia ni prometer una capacidad ausente.

### REQ-014-004 — Seguimiento, pago y conformidad CLIENT

- The system shall: usar tarjeta de orden, timeline, resumen de cuenta y CTA
  Stitch para los estados reales; representar pendiente, rechazado, cancelado,
  en verificación, aprobado y conformidad sin convertir un retorno en autoridad.
- Errores y límites: no mostrar contacto, foto, rating, matrícula o ETA del
  técnico si esos datos no pertenecen a la proyección aprobada.

### REQ-014-005 — Notificaciones y postventa CLIENT sin referencia directa

- The system shall: presentar notificaciones, rating e incidencias con navegación,
  cards, campos, estados y acciones del sistema CLIENT Stitch; mantener intactos
  allowlists, inmutabilidad, límites, mensajes neutrales y degradación local.
- Errores y límites: no agregar multimedia a rating, texto a incidencia,
  garantía, reembolso, SLA ni canales externos.

### REQ-014-006 — Bandeja operativa ADMIN/DISPATCHER

- The system shall: usar sidebar, topbar, filtros, tabla/lista, badges y paneles
  densos próximos a Stitch, preservando solicitudes, órdenes y acciones reales.
- Errores y límites: no mostrar KPIs, mapa de calor, búsqueda/exportación falsa,
  sugerencias automáticas, dashboard ni controles sin backend.

### REQ-014-007 — Detalle, asignación y técnicos ADMIN

- The system shall: aplicar los patrones Stitch de detalle en columnas, panel de
  asignación y tabla de técnicos a los campos y acciones reales; la asignación
  sigue siendo manual y la gestión conserva su CRUD mínimo.
- Errores y límites: no inferir distancia, ETA, disponibilidad, calificación,
  especialidad, costo de viaje ni notificación externa.

### REQ-014-008 — Funciones ADMIN sin referencia directa

- The system shall: integrar hitos, cancelación/reasignación, resolución/cargo,
  consulta de rating y bandeja de incidencias mediante el patrón Stitch más
  cercano, visibles según estado y permiso, con confirmación segura.
- Errores y límites: no transformar estas acciones en presupuesto complejo,
  dashboard, reporte ni nueva regla operativa.

### REQ-014-009 — Estados completos y lenguaje de producto

- The system shall: definir por pantalla loading, skeleton o progreso, vacío,
  error recuperable, error no recuperable, éxito, permiso y sesión; usar español
  de Argentina, ARS, UTC presentada en `America/Buenos_Aires` y datos sintéticos.
- Errores y límites: texto, icono y semántica acompañan color; ningún mensaje
  expone PII, token, URL firmada, ruta física o detalle interno.

### REQ-014-010 — Responsive y accesibilidad

- The system shall: validar CLIENT a 360, 390, 768 y 1280 px; ADMIN a 768, 1024,
  1440 y 1600 px; mantener zoom 200 %, reflow, teclado, foco, headings, labels,
  nombres/estados accesibles, `aria-live` adecuado, contraste WCAG 2.2 AA,
  reducción de movimiento y objetivos CLIENT de al menos 48 px.
- Errores y límites: no hay pérdida, superposición ni scroll horizontal de una
  acción esencial; los componentes densos ADMIN siguen siendo operables.

## Requisitos no funcionales

- NFR-014-001 Seguridad/privacidad: no ampliar respuestas, persistencia, caché o
  logging; usar sólo fixtures sintéticos y rutas autorizadas existentes.
- NFR-014-002 Rendimiento: sin recursos visuales remotos nuevos; medir que el
  rediseño no introduzca una regresión material y respetar preferencias de
  movimiento.
- NFR-014-003 Compatibilidad: conservar flujos E2E CLIENT/ADMIN, Auth0, mapa y
  Checkout Pro existentes; no se agrega modo offline.
- NFR-014-004 Mantenibilidad: reutilizar componentes/tokens y evitar duplicación
  entre portales sin forzar idéntica densidad.
- NFR-014-005 Verificación visual: baseline actual y referencia Stitch se
  comparan por pantalla/viewports con máscaras sólo para datos dinámicos; toda
  diferencia aceptada queda explicada.
- NFR-014-006 Observabilidad: no registrar interacción visual, PII, multimedia,
  dirección, texto de postventa ni URL de pago; conservar correlation ID seguro.

## Decisiones aprobadas

| ID          | Decisión                           | Selección aprobada                                                                                                                              |
| ----------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-014-001 | Separación de la página monolítica | Crear navegación/vistas por contexto conservando los endpoints y componentes funcionales; evitar modales gigantes.                              |
| DEC-014-002 | Estrategia de iconos               | Priorizar SVG/CSS accesible y local ya disponible; si se requiere un paquete nuevo, presentar licencia, peso y alternativa antes de elegir.     |
| DEC-014-003 | Baselines visuales                 | Versionar sólo capturas sintéticas aprobadas o snapshots seguros; nunca PII, tokens ni URLs firmadas.                                           |
| DEC-014-004 | Tolerancia visual                  | Comparación por regiones y viewports; umbral numérico se define después de obtener baseline estable, no se inventa en discovery.                |
| DEC-014-005 | Navegación CLIENT                  | Usar Inicio / Mis solicitudes / Perfil como patrón visual, pero deshabilitar o explicar destinos todavía no implementados en vez de simularlos. |

Las cinco decisiones fueron aprobadas por el usuario el 2026-09-03. No se
aprobó cambiar stack, framework, proveedor o dependencia.

## Dependencias y puerta siguiente

- `feat-013` aporta fuentes locales, shell y tokens iniciales.
- `feat-007`, `feat-009` y `feat-010` aportan funciones sin cobertura completa
  de Stitch que deben preservarse.
- `approvals.specification.status` está `approved`; la siguiente transición es
  `implementation`.
- La implementación debe detenerse en `publication_review` después de una
  revisión independiente PASS y esperar aprobación humana de publicación.
