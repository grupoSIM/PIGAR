# Discovery — feat-013: Sistema visual y experiencia operativa inicial

- Estado: `discovery`.
- Inicio: 2026-08-14.
- Dependencias: `feat-002`, `feat-004` y `feat-005` integradas en `main`.
- Referencia de diseño: [design-review-stitch.md](design-review-stitch.md),
  `stitch/aplicacion_cliente.zip` y `stitch/backoffice.zip`.
- Límite: este discovery no habilita cambios de código, publicación ni
  despliegue.

## Objetivo

Transformar los flujos que ya funcionan en una experiencia visual coherente,
accesible y fácil de probar. La fuente de referencia será Stitch, recreada con
componentes tipados y estados reales; los HTML estáticos del ZIP no se copian
al producto.

## Hallazgo de base

Los paquetes Stitch fueron validados el 2026-07-21 y definieron identidad,
tipografía, espaciado, componentes y pantallas. Las features funcionales
posteriores conservaron sus flujos y controles de seguridad, pero no
materializaron esa guía como tokens ni componentes compartidos: los portales
usan tipografías y estilos locales ad hoc. Esta feature cierra esa brecha sin
reabrir los comportamientos ya validados.

## Alcance candidato

- Fundaciones compartidas en `@pigar/ui`: tokens de color, tipografía,
  espaciado, foco visible, superficies, botones, campos, tarjetas, alertas y
  badges de estado; cada estado conserva texto, no sólo color.
- Portal CLIENT responsive/mobile-first: shell, acceso, inicio/listado de
  solicitudes, alta con domicilio y adjuntos, y seguimiento/historial seguro
  de orden. Se utilizarán las referencias Stitch ya inventariadas que
  corresponden a feat-002, feat-004 y feat-005.
- Backoffice ADMIN/DISPATCHER: shell con navegación lateral responsive,
  bandeja de solicitudes/órdenes, asignación, gestión de técnicos, acciones
  de estado y adjuntos privados. No se añadirá dashboard de KPIs.
- Estados de interfaz verificables: carga, vacío, error recuperable, permiso
  denegado, sesión expirada, adjunto inválido/progreso y confirmación de
  acción.
- Accesibilidad y pruebas visuales/E2E de los flujos existentes, con foco
  visible, teclado, contraste, etiquetas y objetivos táctiles de al menos
  48 px en CLIENT.

## Fuera de alcance

- Cambios de API, dominio, autorizaciones, identidad, persistencia o
  migraciones.
- Pantallas de pagos, presupuestos, calificaciones, notificaciones, reportes,
  KPIs, pedidos/materiales, agenda, tracking o portal de operarios.
- Copiar `code.html` de Stitch, usar datos reales, imágenes remotas no
  controladas o prometer notificaciones/ubicación de técnicos.
- Rediseñar o desplegar Hostinger durante discovery.

## Decisiones abiertas para especificación

| ID | Decisión | Recomendación inicial |
|---|---|---|
| DEC-013-001 | Tipografías e iconos | Verificar licencias y servir Hanken Grotesk, Inter e iconos desde artefactos controlados, sin solicitudes externas en tiempo de ejecución. |
| DEC-013-002 | Alcance de la primera entrega | Aplicar el sistema a todos los flujos ya operativos de CLIENT y ADMIN; diferir las pantallas de features 007+ hasta que sus reglas estén aprobadas. |
| DEC-013-003 | Densidad administrativa | Sidebar fija desde escritorio, colapsable en laptop y drawer bajo 1024 px; bandeja sin dashboard/KPIs, conforme UI-D02. |
| DEC-013-004 | Activos visuales | Sustituir placeholders sólo por íconos/activos locales con licencia documentada; no incorporar las imágenes externas de los prototipos. |
| DEC-013-005 | Validación | Combinar E2E funcional existente con chequeos de accesibilidad y revisión visual en staging usando fixtures sintéticos. |

## Riesgos y controles candidatos

| Riesgo | Control verificable |
|---|---|
| El rediseño altera una operación validada | Mantener contratos y pruebas E2E de creación, adjuntos, asignación, transición, proyección CLIENT y logout. |
| Estado o dato sensible queda expuesto por una nueva vista | No ampliar respuestas API; E2E/seguridad cubren que CLIENT no ve teléfono, motivos, ubicación ni adjuntos de terceros. |
| Accesibilidad cosmética | Contraste, foco, labels, teclado y texto asociado a cada color/ícono como criterios de aceptación. |
| Dependencia visual remota o sin licencia | Inventario/licencia y empaquetado local de fuentes/íconos antes de implementación. |
| Alcance crece con pantallas futuras | Trazar cada pantalla al inventario Stitch y excluir explícitamente features 006–011 que no estén implementadas. |

## Próxima puerta

Las decisiones `DEC-013-001` a `DEC-013-005` fueron confirmadas por el usuario
el 2026-08-14. Los artefactos de especificación se encuentran en
`specs/features/feat-013/` y requieren una aprobación humana separada antes
de modificar el frontend.
