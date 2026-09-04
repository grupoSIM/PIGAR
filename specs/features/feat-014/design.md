# Diseño — feat-014: Alineación visual integral con Stitch

- Estado: `done`; aprobado por el usuario el 2026-09-03 e integrado en staging.
- Autoridad visual: `screen.png` y `DESIGN.md`; `code.html` sólo documenta
  estructura aparente y nunca se ejecuta ni copia.

## Resumen de diferencias

La base de `feat-013` ya incorporó colores, Hanken Grotesk/Inter, foco visible,
controles CLIENT de 48 px y sidebar responsive. La brecha principal no está en
la marca sino en la arquitectura de información: cada portal concentra acceso,
listados, formularios, detalle y acciones en una sola página. Las funciones
agregadas por `feat-007`, `feat-009` y `feat-010` carecen además de estilos
específicos equivalentes a Stitch. El objetivo es llevar cada contexto al patrón
visual correspondiente sin copiar contenido funcional inválido del prototipo.

## Sistema visual derivado de Stitch

| Eje          | CLIENT                                                                                   | ADMIN                                                                   |
| ------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Superficie   | `#f4faff`, tarjetas blancas y capas azul muy claro                                       | `#f8f9fb`, sidebar/cards blancas y bordes fríos                         |
| Marca/acción | navy `#003f74`, azul `#01579b`, amarillo `#fec330` reservado para CTA                    | azul `#01579b`; primarias sólidas, secundarias outlined, ghost en tabla |
| Tipografía   | Hanken Grotesk para títulos; Inter para cuerpo/labels                                    | Hanken Grotesk; cuerpo 14 px y labels compactos                         |
| Ritmo/formas | base 8 px; margen móvil 20 px; radios 8–16 px; touch 48 px                               | gutter 24 px; margen 32 px; radios 4–8 px; filas 40/48 px               |
| Profundidad  | capas tonales, borde; sombra leve sólo cuando aporta jerarquía                           | plano con borde; sombra para popover/modal                              |
| Estado       | texto + icono + color; éxito verde, warning amarillo/ámbar, error rojo                   | badge semántico con texto; no sólo color                                |
| Responsive   | 4 columnas fluidas; CTA en zona de pulgar; navegación inferior cuando tenga destino real | sidebar 260 px >=1440, colapsable 1024–1439, drawer <1024               |

Las variables actuales se consolidarán en `@pigar/ui` sólo después de aprobar la
especificación. No se selecciona librería de iconos ni herramienta de snapshots.

## Componentes reutilizables propuestos

| ID          | Componente/patrón                                             | Usos                                                |
| ----------- | ------------------------------------------------------------- | --------------------------------------------------- |
| CMP-014-001 | `CustomerShell` con topbar, contenido y navegación contextual | C01–C10                                             |
| CMP-014-002 | `AdminShell` con sidebar/rail/drawer, topbar y breadcrumbs    | A01–A07                                             |
| CMP-014-003 | Button/LinkButton/IconButton y destructive action             | Ambos portales                                      |
| CMP-014-004 | Field, Select, Textarea, Fieldset, ayuda/error/contador       | Solicitud, filtros, rating, incidencias, técnicos   |
| CMP-014-005 | Card, SectionHeader, SummaryPanel, KeyValueList               | Inicio, detalle, pagos, soporte                     |
| CMP-014-006 | StatusBadge y Timeline                                        | Solicitudes, órdenes, pagos, incidencias            |
| CMP-014-007 | DataTable/ResponsiveList y FilterBar                          | Bandejas y técnicos                                 |
| CMP-014-008 | Empty/Loading/Error/Success/Permission/SessionState           | Todas las pantallas                                 |
| CMP-014-009 | ConfirmAction/ActionBar                                       | Asignación, hitos, cancelación, conformidad, triage |
| CMP-014-010 | UploadPanel/ProgressItem/MapPanel                             | Nueva solicitud y adjuntos existentes               |
| CMP-014-011 | NotificationPanel                                             | C08, degradación independiente                      |
| CMP-014-012 | RatingInput y StructuredIncidentPanel                         | C06/C07 y soporte ADMIN                             |

## Matriz de diferencias Stitch vs aplicación actual

Prioridad: P0 bloquea fidelidad/operabilidad; P1 alta; P2 mejora importante; P3
referencia fuera de alcance. Clasificación: `desvío visual`, `funcional`
intencional, `técnica` o `intencional de alcance`.

| Pantalla                          | Referencia Stitch                                                           | Estado actual                                                                              | Diferencias detalladas                                                                                                                                                                                | Clasificación                         | Prioridad / recomendación                                                                                                   |
| --------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| CLIENT acceso                     | `iniciar_sesi_n_pigar`                                                      | Card dentro de la home, con hero/título general y un enlace de email                       | Layout no dedicado; falta composición centrada, jerarquía de marca y pie. Google/Apple/teléfono/registro de Stitch no están aprobados. El enlace sí conserva foco/48 px.                              | Visual + funcional intencional        | P1: pantalla dedicada con patrón Stitch y sólo email/Auth0 aprobado.                                                        |
| CLIENT inicio/listado             | `inicio_cliente_pigar_espa_ol`                                              | Hero comercial, notificaciones, lista y alta completa apilados                             | Stitch separa CTA, servicio activo, timeline e historial; actual mezcla contextos, usa ancho 960 y no tiene bottom nav. Stitch contiene avatar, domicilio, WhatsApp y ETA prohibidos.                 | Desvío visual + funcional intencional | P0: separar inicio/listado/detalle; conservar notificaciones visibles y eliminar sólo contenido prohibido de la referencia. |
| CLIENT nueva solicitud            | `nueva_solicitud_espa_ol`                                                   | Formulario inline con select de oferta, textarea, mapa, dirección manual y upload genérico | Falta encabezado/stepper horizontal, grilla visual de categoría, CTA ancho/sticky y upload con estado por archivo. Actual tiene campos/límites reales adicionales y mapa funcional.                   | Desvío visual + funcional             | P0: recrear composición Stitch conservando todos los campos y validaciones reales.                                          |
| CLIENT seguimiento                | `seguimiento_de_orden_espa_ol`                                              | Estado/historial como texto/lista dentro de cada card                                      | Falta detalle dedicado, resumen, timeline gráfico, acciones jerarquizadas y estados pendientes. Stitch muestra contacto, foto, rating, matrícula y ETA no autorizados.                                | Desvío visual + funcional intencional | P0: timeline/card Stitch con proyección segura existente; nunca simular datos del técnico.                                  |
| CLIENT pago/conformidad           | `pago_de_visita_est_ndar_escenario_a`, `pago_final_presupuesto_escenario_b` | Resolución/cargo/estado como párrafos y botón; retorno es página mínima                    | Falta resumen de cuenta, estado visual de verificación/rechazo, acción full width y continuidad de shell. Stitch presupone contacto/foto/rating y pago complejo.                                      | Desvío visual + funcional intencional | P0: usar patrón financiero/timeline con estados reales de feat-007; preservar autoridad de conciliación.                    |
| CLIENT calificación               | `calificaci_n_de_servicio_y_rese_a`                                         | Fieldset inline con `select` de estrellas/motivo y `Otro` condicional                      | No hay pantalla ni estrellas visuales; jerarquía y espaciado son genéricos. Stitch agrega reseña libre y multimedia, prohibidos por feat-010.                                                         | Desvío visual + funcional intencional | P1: `radiogroup`/estrellas accesibles, motivo y `Otro` aprobados; omitir upload y reseña libre general.                     |
| CLIENT incidencia                 | Sin referencia directa                                                      | Formulario e historial inline, sin estilos específicos propios                             | Función posterior a Stitch; estados/lista quedan con estilo de navegador dentro de card.                                                                                                              | Funcional existente sin referencia    | P1: patrón de Postventa/Timeline Stitch más cercano; conservar neutralidad y estructura.                                    |
| CLIENT notificaciones             | Sin referencia directa                                                      | Botón y región expandible sin selectores CSS específicos                                   | Función posterior a Stitch; jerarquía, posición, lista y estados dependen del estilo genérico.                                                                                                        | Funcional existente sin referencia    | P1: panel accesible desde shell, badge y lista Stitch; falla local no tapa solicitudes.                                     |
| CLIENT perfil/sesión              | `perfil_de_usuario_pigar`                                                   | Sólo enlace de cierre de sesión sobre la home                                              | Falta pantalla/shell; Stitch muestra datos, direcciones, preferencias y soporte no implementados.                                                                                                     | Desvío visual + alcance intencional   | P2: vista de sesión mínima alineada; no mostrar enlaces falsos.                                                             |
| CLIENT estados                    | Utility Core CLIENT                                                         | Loading/vacío/error/éxito existen parcialmente como párrafos/cards                         | No hay skeleton/progreso por archivo ni catálogo consistente; estados de nuevas funciones heredan estilos genéricos.                                                                                  | Desvío visual/técnico                 | P0: CMP-014-008 y estados por pantalla con foco/aria-live/reintento.                                                        |
| ADMIN acceso                      | `inicio_de_sesi_n_administraci_n_pigar`                                     | Card dentro del shell/bandeja                                                              | Falta pantalla dividida y jerarquía dedicada; Stitch usa credenciales locales y claims “SSL v3/AES-256” que no deben copiarse.                                                                        | Desvío visual + funcional intencional | P1: acceso dedicado similar, botón Auth0/MFA real, sin claims falsos ni imagen remota.                                      |
| ADMIN shell                       | Utility Core Desktop y todas las referencias                                | Sidebar 260 px, topbar mínima, drawer <1024                                                | Base cercana, pero active nav azul sólido difiere del indicador lateral Stitch; no hay rail laptop, breadcrumbs, búsqueda/utilidades ni navegación por pantallas.                                     | Desvío visual/técnico                 | P0: shell/rutas reales, active indicator, rail/drawer y encabezados; no crear acciones falsas.                              |
| ADMIN bandeja                     | dos listados de órdenes Stitch                                              | Cards apiladas con descripción, domicilio, media y acciones                                | Stitch usa tabla densa, filtros, paginación y summary cards; actual no ofrece filtros de órdenes y mezcla detalle/acciones. KPIs/recomendación/exportar/nueva orden de Stitch están fuera de alcance. | Desvío visual + funcional intencional | P0: tabla/lista responsive y detalle separado, sólo filtros/acciones soportados.                                            |
| ADMIN asignación/detalle          | `asignaci_n_de_t_cnico_pigar_espa_ol`                                       | Select inline por solicitud; adjuntos como enlaces                                         | Falta workspace en columnas, contexto, media panel y confirmación. Stitch usa sugerencias/cercanía/ETA/costo/push/SMS y datos extranjeros prohibidos.                                                 | Desvío visual + funcional intencional | P0: panel manual con técnicos activos reales, domicilio/adjuntos autorizados y confirmación.                                |
| ADMIN técnicos                    | `gesti_n_de_t_cnicos_pigar_espa_ol`                                         | Alta y lista simple inline con activar/editar                                              | Falta tabla, tabs/filtros y acciones jerarquizadas. Stitch muestra KPIs, especialidad, rating, órdenes y exportación sin contrato.                                                                    | Desvío visual + funcional intencional | P1: tabla CRUD mínima con patrón Stitch y sólo nombre/teléfono/estado reales.                                               |
| ADMIN hitos/resolución/cargo      | Asignación + editor de presupuesto como patrón                              | Botones/prompt/select inline dentro de card                                                | Función real sin pantalla equivalente exacta; `window.prompt` no sigue componentes/foco; cargo carece de summary panel.                                                                               | Funcional existente + desvío visual   | P0: detalle/ActionBar/ConfirmAction; editor complejo sigue excluido.                                                        |
| ADMIN incidencias/postventa       | Sin referencia directa                                                      | Filtros y listas genéricas antes de técnicos/órdenes; consulta de rating inline            | Sin tabla/badge/timeline ni estilos focalizados; error recuperable existe.                                                                                                                            | Funcional existente sin referencia    | P1: bandeja con FilterBar/DataTable, detalle y acciones válidas, sin mensajes o SLA.                                        |
| ADMIN responsive/a11y             | Utility Core Desktop                                                        | Sidebar pasa a header/drawer <1024; cards colapsan <700                                    | No existe rail 1024–1439 ni patrón responsive de tablas. HTML usa labels/foco, pero `prompt` y densidad monolítica perjudican teclado/reflow.                                                         | Técnica/desvío visual                 | P0: breakpoints Stitch, tabla a lista, diálogo accesible y zoom/teclado verificados.                                        |
| Dashboard/KPIs                    | `dashboard_operativo_pigar`                                                 | No implementado                                                                            | Diferencia intencional aprobada UI-D02; mapa de calor, KPIs y técnicos activos contradicen alcance.                                                                                                   | Intencional de alcance                | P3: no implementar; sólo reutilizar shell/card si aplica.                                                                   |
| Presupuesto complejo CLIENT/ADMIN | aprobación/pago/editor                                                      | No implementado                                                                            | Diferido a feat-008; prototipos incluyen reglas, importes y acciones no aprobadas.                                                                                                                    | Intencional de alcance                | P3: inventariar, no implementar.                                                                                            |
| Reportes y pedidos/materiales     | reportes/pedidos Stitch                                                     | No implementado                                                                            | Fuera del MVP y sin contratos.                                                                                                                                                                        | Intencional de alcance                | P3: no implementar ni agregar nav activa.                                                                                   |

## Funcionalidades existentes sin referencia Stitch

- CLIENT: bandeja de notificaciones in-app; estados de pago rechazado/cancelado/en
  verificación; conformidad explícita; motivo estructurado y `Otro` limitado en
  rating; incidencia estructurada e historial; reintento de adjuntos.
- ADMIN/DISPATCHER: bandeja y ciclo de incidencias; consulta de postventa por
  orden; resolución administrativa y cargo inmutable; conciliación/alertas
  mínimas; reasignación/cancelación e hitos reales; controles de degradación.

Todas permanecen visibles. Se presentan con cards, timeline, badges, tablas,
filtros, paneles y acciones del sistema Stitch más cercano.

## Estados por pantalla

| Estado               | Tratamiento verificable                                                                 |
| -------------------- | --------------------------------------------------------------------------------------- |
| Loading              | Skeleton o indicador nombrado; `aria-busy`/status sin secuestrar foco.                  |
| Vacío                | Explicación específica y siguiente acción existente; sin CTA falsa.                     |
| Error recuperable    | Mensaje neutro, región perceptible y reintento que conserva contexto.                   |
| Error/permiso/sesión | Salida segura; 404/403 no enumeran; reinicio de acceso visible.                         |
| Éxito                | Confirmación textual `aria-live`; acción queda en estado autoritativo.                  |
| Progreso/adjunto     | Archivo sintético, tipo/límite, progreso/error/reintento; sin nombre real en evidencia. |
| Pago                 | Pendiente, rechazado, cancelado, verificando y aprobado; retorno nunca adelanta estado. |

## Responsive, teclado y accesibilidad

- Orden DOM y foco siguen el flujo visual; skip link donde la navegación se
  repite; headings únicos y jerárquicos.
- Drawer/diálogo atrapan foco sólo mientras están abiertos, cierran con Escape y
  restituyen foco. Nada depende de hover.
- Tablas ADMIN conservan headers/relación; en móvil cambian a lista etiquetada,
  no a tabla recortada.
- Rating usa controles nativos o patrón ARIA probado; timeline y badges incluyen
  texto. Errores se asocian con `aria-describedby`.
- Contraste normal 4.5:1, texto grande 3:1, componentes/foco 3:1; zoom 200 % y
  reflow sin pérdida; `prefers-reduced-motion` elimina animación no esencial.

## Seguridad, datos e impactos técnicos

No se agregan datos, endpoints, eventos, migraciones, secretos, proveedores ni
logs. CLIENT sigue usando proyección por propietario y ADMIN/DISPATCHER sus
permisos actuales. Las capturas usan fixtures sintéticos; se enmascaran IDs,
domicilios, teléfonos, multimedia y URLs dinámicas cuando corresponda.

## Migración, despliegue y recuperación

No hay migración de datos. Los cambios se introducirán pantalla por pantalla
después de la aprobación, con E2E funcional y comparación visual antes de marcar
cada tarea. La recuperación es forward-fix del componente/token afectado; no se
revierte dominio ni evidencia. No hay commit, push, PR o despliegue autorizado.

## Riesgos y controles

| Riesgo                                        | Control                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Fidelidad copia funciones inválidas de Stitch | Matriz anterior y pruebas negativas de contacto, tracking, KPIs, multimedia de rating y garantía. |
| Separar vistas rompe flujos/selectores        | E2E completo y rutas/estado preservados; no cambiar API.                                          |
| Funciones sin referencia quedan ocultas       | Inventario explícito y AC por función posterior a Stitch.                                         |
| Snapshot expone datos                         | Fixtures sintéticos, revisión de artefactos y máscaras limitadas.                                 |
| Dependencia/icono sin licencia                | DEC-014-002; ninguna selección antes de aprobación.                                               |
| Comparación pixel-perfect frágil              | Baseline estable, regiones, fuentes locales y tolerancia aprobada.                                |
