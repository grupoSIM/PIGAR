# Tareas — feat-014: Alineación visual integral con Stitch

Marcar una tarea sólo después de verificarla y registrar comando/salida o
inspección reproducible en `evidence.md`. Las tareas de implementación quedan
bloqueadas hasta aprobación explícita de la especificación.

## Discovery y especificación

- [x] TASK-014-001 `[REQ-014-001][NFR-014-005]` Inventariar todos los `DESIGN.md`, `screen.png` y `code.html` de Stitch y registrar su tratamiento como referencia no ejecutable.
- [x] TASK-014-002 `[REQ-014-002][NFR-014-004]` Inventariar rutas, componentes, estilos y E2E actuales de CLIENT/ADMIN, incluidas funciones posteriores a feat-013.
- [x] TASK-014-003 `[REQ-014-003..010][AC-014-002..011]` Crear la matriz detallada de diferencias, clasificar intención/prioridad y documentar funciones sin referencia.
- [x] TASK-014-004 `[REQ-014-001..010][AC-014-001..012]` Preparar requisitos, diseño, aceptación, plan, tareas y evidencia con IDs estables y decisiones abiertas.

## Implementación — habilitada

- [x] TASK-014-005 `[REQ-014-001][AC-014-001]` Consolidar tokens y componentes compartidos aprobados sin recurso/dependencia remota nueva.
- [x] TASK-014-006 `[REQ-014-002][REQ-014-003][AC-014-002][AC-014-003]` Implementar shell, acceso, inicio/listado y nueva solicitud CLIENT alineados a Stitch.
- [x] TASK-014-007 `[REQ-014-004][AC-014-004][AC-014-005]` Implementar detalle/timeline, pago, retorno y conformidad CLIENT sin alterar contratos.
- [x] TASK-014-008 `[REQ-014-005][AC-014-006]` Integrar notificaciones, rating e incidencias CLIENT con patrones Stitch y todos sus estados.
- [x] TASK-014-009 `[REQ-014-002][REQ-014-006][AC-014-007]` Implementar acceso y shell ADMIN con sidebar/rail/drawer y navegación real.
- [x] TASK-014-010 `[REQ-014-006][AC-014-008]` Implementar bandeja y detalle ADMIN con filtros, tabla/lista y badges soportados.
- [x] TASK-014-011 `[REQ-014-007][AC-014-009]` Implementar gestión de técnicos y asignación manual con patrones Stitch, sin métricas inferidas.
- [x] TASK-014-012 `[REQ-014-008][AC-014-010]` Integrar hitos, resolución/cargo y postventa ADMIN con acciones/confirmaciones accesibles.
- [x] TASK-014-013 `[REQ-014-009][REQ-014-010][AC-014-011]` Completar estados, responsive, teclado, foco, contraste, zoom y reduced motion por pantalla.
- [x] TASK-014-014 `[NFR-014-001..006][AC-014-012]` Ejecutar formato, lint, typecheck, build, E2E CLIENT/ADMIN, integración, seguridad, accesibilidad, documentación y comparación visual; registrar evidencia segura.

## Puertas

- [x] TASK-014-015 Resolver DEC-014-001 a DEC-014-005 y llevar el borrador a `spec_review`. Aprobadas por el usuario el 2026-09-03.
- [x] TASK-014-016 Obtener `approvals.specification.status: approved` antes de TASK-014-005. Aprobada por el usuario el 2026-09-03.
- [x] TASK-014-017 Obtener revisión independiente para `publication_review` después de implementar/verificar. PASS registrado el 2026-09-03.
- [x] TASK-014-018 Obtener autorización explícita antes de commit, push, PR, despliegue o publicación. Autorización del usuario para publicar en staging y publicación verificada en CI 33762658191 el 2026-09-03.

## Correcciones posteriores a la revisión de staging

- [x] TASK-014-019 `[REQ-014-003][REQ-014-005][REQ-014-006][AC-014-003][AC-014-006][AC-014-007]` Corregir navegación ADMIN visible, formulario CLIENT de una sola pantalla, notificaciones sin redirección y presentación de estados sin códigos internos ni conectores visuales.
- [x] TASK-014-020 `[NFR-014-001][NFR-014-004][AC-014-011]` Verificar las correcciones con Prettier, ESLint, TypeScript y builds de producción de ambos frontends.
- [x] TASK-014-021 `[REQ-014-006][AC-014-007][AC-014-008]` Separar la portada ADMIN de las bandejas operativas y agregar una vista dedicada de incidencias en la navegación.
- [x] TASK-014-022 `[REQ-014-003][REQ-014-005][AC-014-003][AC-014-006]` Aplicar variantes visuales consistentes a las acciones principales y secundarias del portal CLIENT según la paleta aprobada de Stitch.
