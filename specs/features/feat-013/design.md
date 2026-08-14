# Diseño — feat-013: Sistema visual y experiencia operativa inicial

## Resumen

La feature introduce una capa de diseño en `@pigar/ui` y adapta las vistas ya
existentes. No modifica modelo de dominio, máquina de estados, API, eventos ni
datos: todos siguen siendo autoridad del backend.

## Decisiones y alternativas

| Decisión | Selección | Motivo |
| --- | --- | --- |
| Fuente de verdad visual | Tokens/componentes propios basados en Stitch | Evita incorporar prototipos estáticos, CDN y datos hardcodeados. |
| Tipografía/íconos | Artefactos con licencia y control local | No añade dependencia visual remota en runtime. |
| CLIENT | Shell mobile-first y acciones mínimas de 48 px | Alinea el uso principal móvil y la guía Stitch. |
| Backoffice | Sidebar adaptable y bandeja de alta densidad | Conserva UI-D02: sin dashboard/KPIs. |
| Estado | Texto + icono + color semántico | Permite comprensión sin depender sólo del color. |

## Componentes afectados

| Capa | Componentes/cambios previstos |
| --- | --- |
| `@pigar/ui` | Tokens CSS, tipografía, `ProductShell`, botones, inputs, cards, alertas, badges, skeleton/empty/error state y diálogo de confirmación. |
| CLIENT | Layout, acceso, solicitudes, formulario con mapa/adjuntos y seguimiento de orden. |
| ADMIN | Layout, acceso, bandeja, detalle, asignación/transición, técnicos y enlaces de adjuntos ya autorizados. |

## Experiencia por actor

- CLIENT: azul PIGAR, superficies claras, acento amarillo sólo para acción
  destacada, estructura de una columna, resumen claro y navegación utilitaria.
  El seguimiento muestra únicamente la proyección segura existente.
- ADMIN/DISPATCHER: superficie neutra, tipografía Hanken Grotesk, sidebar y
  contenido fluido. Las filas/estados concentran información operativa sin
  agregar KPI, mapa técnico ni sugerencia de cercanía.
- Todos: foco de alto contraste, mensajes explícitos, controles con etiqueta y
  estados vacíos/error/recuperación consistentes.

## Seguridad y privacidad

La UI consume exactamente las respuestas existentes. No debe serializar ni
cachear datos sensibles adicionales; no muestra teléfono/motivos a CLIENT, no
agrega coordenadas/ubicación de técnico y mantiene la entrega de adjuntos por
la ruta autorizada existente. Mensajes y tooltips no incluyen PII, tokens,
rutas físicas, correlation ID completo ni detalles internos.

## Errores, reintentos y degradación

Cada operación conserva su comportamiento actual y añade presentación:

- carga: skeleton/estado ocupado con nombre accesible;
- vacío: explicación y siguiente acción sin prometer capacidad inexistente;
- sesión expirada: aviso y acción visible para iniciar/reiniciar sesión;
- error recuperable: mensaje neutro y reintento cuando el endpoint ya lo
  permite;
- adjunto inválido/en progreso: explicación de límite/tipo y progreso visible;
- permiso denegado: no revelar si existe un recurso ajeno.

## Accesibilidad y responsive

Contraste AA, foco visible, orden de tabulación, labels, `aria-live` para
mensajes dinámicos y reducción de movimiento cuando corresponda. CLIENT usa
grid móvil con márgenes 20 px, gutter 16 px y ritmo 8 px; ADMIN usa sidebar de
260 px en escritorio, colapsable en laptop y drawer bajo 1024 px.

## Migración, despliegue y rollback/forward-fix

No hay migraciones, endpoints ni variables de infraestructura nuevas. El cambio
puede publicarse como imagen normal tras calidad y UAT. Ante regresión visual,
un forward-fix restaura el componente/token afectado sin revertir datos ni
contratos; no se hace rollback destructivo.

## Riesgos

- Deriva entre ambos portales: tokens en `@pigar/ui` y E2E de ambos.
- Regresión funcional: preservar selectores/semántica de pruebas y ejecutar
  E2E de frontend completa.
- Fuente/ícono sin licencia o remoto: inventario antes de incorporar archivos.
- Contraste o responsive insuficiente: pruebas automatizadas y revisión manual
  en staging en los viewports definidos.
