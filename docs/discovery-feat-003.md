# Discovery — feat-003: Catálogo de servicios, zonas y tarifas

- Estado: `discovery`
- Inicio: 2026-08-01
- Dependencias: `feat-001` y `feat-002` cerradas.
- Decisiones arquitectónicas relacionadas: [ADR-004](adr/ADR-004.md), para el
  precio que consumirá el cobro futuro; [ADR-005](adr/ADR-005.md), para el
  domicilio que consumirá `feat-004`.
- Límite de coordinación: `progress/current.yaml` declara `feat-003` como
  feature activa en `discovery`. Este trabajo no habilita implementación.

## Objetivo

Definir un catálogo administrable de servicios de visita estándar, sus zonas de
cobertura y la tarifa fija aplicable. El resultado deberá permitir que la
creación de una solicitud (`feat-004`) muestre una oferta inequívoca y que el
cobro posterior (`feat-007`) use el importe que fue informado al cliente, aun
si el catálogo cambia después.

El catálogo no convierte una solicitud en orden, no diagnostica fallas y no
ejecuta pagos. Es un origen de datos versionado y autorizado para esos flujos.

## Alcance propuesto

Incluido para especificar:

- Administración de servicios publicables: identificador estable, nombre,
  descripción breve, estado y orden de presentación.
- Administración de zonas de cobertura con identificador estable, nombre,
  estado y una definición geográfica aprobada.
- Configuración de una tarifa fija por combinación de servicio y zona, con
  moneda ISO, importe decimal seguro, vigencia y estado.
- Consulta pública/autenticada mínima del catálogo que sólo exponga servicios,
  zonas y tarifas vigentes/publicables; nunca datos administrativos o reglas
  futuras no publicadas.
- Resolución determinista de la tarifa aplicable para que `feat-004` pueda
  solicitarla y guardar una instantánea inmutable de la oferta antes de crear
  la solicitud.
- Backoffice para `ADMIN` y, sólo si se aprueba, `DISPATCHER`; el cliente sólo
  puede consultar la oferta aplicable, no editarla.
- Auditoría minimizada de altas, cambios de tarifa, activación y desactivación,
  con actor interno, acción, recurso, resultado y fecha UTC.
- Migración no destructiva, datos sintéticos de ejemplo y contrato HTTP
  versionado si se confirma la API propuesta.

## Fuera de alcance

- Crear solicitudes, capturar domicilios, geocodificar, mostrar mapas o
  persistir coordenadas: corresponde a `feat-004` y ADR-005.
- Diagnóstico, asignación, estados de orden, agenda de técnicos o reglas de
  disponibilidad operativa: `feat-005` y posteriores.
- Presupuestos complejos, materiales, descuentos, señas, impuestos calculados,
  reembolsos o cobro: `feat-007`/`feat-008`; ADR-004 conserva Checkout Pro para
  el pago futuro.
- Tarifas dinámicas por horario, nocturnidad, feriados, urgencia, distancia,
  capacidad o promociones, salvo que el usuario apruebe expresamente una de
  estas reglas para el MVP.
- Tracking, ubicación de técnicos, cuentas de técnicos, notificaciones,
  proveedores externos nuevos, producción o despliegues.

## Actores y autorización propuesta

| Actor | Acceso propuesto |
|---|---|
| Visitante | Ninguno, salvo que la decisión de producto habilite consulta previa al inicio de sesión. |
| CLIENT | Consulta solamente servicios publicables y la oferta aplicable; no recibe reglas internas ni tarifas futuras. |
| DISPATCHER | Consulta operativa; edición queda pendiente de aprobación explícita. |
| ADMIN | Crea, edita, publica, retira y programa vigencias, con auditoría. |
| Técnico | Sin identidad ni acceso en el MVP, conforme a `feat-002`. |

La API, no la UI, debe validar rol, estado, vigencia y cualquier relación entre
servicio, zona y tarifa. Una tarifa retirada no se elimina si ya fue citada por
una oferta o una solicitud posterior.

## Decisiones abiertas que requieren aprobación humana

| ID | Decisión | Opciones a evaluar | Impacto |
|---|---|---|---|
| DEC-003-001 | Taxonomía inicial de servicios | lista cerrada de servicios estándar; categorías + servicios; un único servicio de visita | Determina qué puede elegir el cliente y el modelo de catálogo. |
| DEC-003-002 | Geometría y fuente de zonas | códigos postales/localidades; polígonos administrativos; polígonos propios; zona única inicial | Afecta datos de domicilio, privacidad, UX y cómo resolver cobertura. No se elige proveedor de mapas. |
| DEC-003-003 | Cobertura ante ambigüedad o solapamiento | prohibir solapamientos; prioridad explícita; revisión manual | Define si una dirección puede recibir una tarifa inequívoca. |
| DEC-003-004 | Tarifario inicial | moneda, importes, impuestos incluidos/no incluidos y qué comprende la visita | Es una decisión comercial; no se inventarán precios ni condiciones. |
| DEC-003-005 | Variación tarifaria MVP | tarifa única por servicio/zona; horario/urgencia/feriado; otras reglas explícitas | Puede ampliar notablemente el modelo y la aceptación comercial. |
| DEC-003-006 | Gobernanza de cambios | sólo ADMIN; ADMIN + DISPATCHER; doble revisión | Afecta autorización y auditoría de datos comerciales. |
| DEC-003-007 | Momento de fijación de precio | al mostrar la oferta; al enviar solicitud; al crear orden | Debe armonizarse con `feat-004` y `feat-007`; se recomienda fijarlo al confirmar la creación de solicitud. |
| DEC-003-008 | Consulta antes de autenticarse | sólo CLIENT autenticado; catálogo público limitado | Afecta superficie API, abuso y experiencia de inicio. |

No se selecciona proveedor de mapas ni se habilita geocodificación en este
MVP. Precios, zona, reglas comerciales y permisos quedan documentados abajo.

## Decisiones confirmadas el 2026-08-02

| Decisión | Resolución | Estado |
|---|---|---|
| DEC-003-001 | El catálogo inicia con la categoría **Visita Simple**. `ADMIN` podrá administrar categorías y cada una tendrá su tarifa propia. | aprobada para MVP |
| DEC-003-002 | El MVP tiene una zona única. La creación de zonas adicionales queda prevista para una evolución posterior administrada, sin definir todavía geometría ni proveedor de mapas. | aprobada para MVP |
| DEC-003-003 | Se prohíben solapamientos. Con una zona única no hay ambigüedad de cobertura en el MVP. | aprobada |
| DEC-003-004 | La moneda es ARS. Visita Simple cuesta ARS 50.000 como precio final pagable por el cliente, sin impuestos calculados por separado. Cubre visita y arreglos completables en ella conforme a lo informado; el excedente requiere presupuesto posterior. | aprobada para MVP |
| DEC-003-005 | Sólo tarifa fija por servicio/zona; se difieren horario, urgencia, feriados, distancia y otras variaciones. | aprobada para MVP |
| DEC-003-006 | Sólo `ADMIN` administra servicios, categorías, zonas y tarifas; `DISPATCHER` sólo consulta. | aprobada para MVP |
| DEC-003-007 | La oferta se congela al confirmar la creación de la solicitud; cambios posteriores no modifican la instantánea. | aprobada |
| DEC-003-008 | Se publicará una vista limitada del catálogo antes de autenticarse. Debe exponer únicamente la oferta vigente y no reglas administrativas. | aprobada para MVP |

## Riesgos y controles para la especificación

| Riesgo | Control verificable propuesto |
|---|---|
| Precio incorrecto, ambiguo o manipulable | Resolver una sola tarifa vigente por servicio/zona; validar en servidor moneda, precisión, vigencia y unicidad; la UI no aporta el importe final. |
| Cambio retroactivo de condiciones comerciales | Mantener versionado o vigencia y conservar una instantánea de oferta inmutable en el consumidor; prohibir edición destructiva de tarifas usadas. |
| Zona mal definida o dato de domicilio sensible | No persistir coordenadas adicionales en esta feature; delegar la resolución de domicilio a `feat-004` bajo ADR-005 y aplicar minimización de datos. |
| Acceso o modificación no autorizados | Pruebas negativas para cliente, dispatcher si no se autoriza edición, técnico y ADMIN sin permisos/contexto. |
| Exposición de datos comerciales internos | Separar representación pública de administrativa; logs sin domicilio, coordenadas, precios de reglas futuras ni PII. |
| Condiciones sin oferta disponible | Respuesta explícita y auditable de “sin cobertura/tarifa”; no crear una oferta parcial ni inferir un precio. |
| Dependencia de `feat-002` aún en curso | Diseñar contra roles/guard ya especificados, pero bloquear la implementación hasta que la dependencia esté satisfactoriamente disponible. |

## Requisitos verificables propuestos

Los IDs son estables para la futura especificación; se convertirán en
`requirements.md` sólo después de resolver las decisiones abiertas.

| ID | Requisito propuesto |
|---|---|
| REQ-003-001 | Un `ADMIN` puede crear, editar, publicar, retirar y consultar servicios sin borrar los ya referenciados. |
| REQ-003-002 | Un `ADMIN` puede administrar zonas según la geometría aprobada, y el sistema impide ambigüedades según la política de solapamiento aprobada. |
| REQ-003-003 | Un `ADMIN` puede definir una tarifa fija versionada por servicio/zona con moneda ISO, importe decimal seguro, vigencia y estado; el servidor rechaza importes inválidos y períodos incompatibles. |
| REQ-003-004 | El sistema resuelve para un servicio y una zona autorizados exactamente una tarifa publicable y vigente, o informa de forma explícita que no existe cobertura/tarifa. |
| REQ-003-005 | La consulta de cliente expone sólo catálogo y oferta publicables; no expone IDs internos, borradores, vigencias futuras ni reglas administrativas. |
| REQ-003-006 | Todo cambio administrativo y toda resolución fallida o exitosa relevante generan auditoría sanitizada con actor, acción, recurso, resultado y UTC. |
| REQ-003-007 | `feat-004` puede obtener una oferta identificable e inmutable para conservar el servicio, zona, moneda, importe y versión aplicados a una solicitud. |
| NFR-003-001 | Dinero se representa sin coma flotante, con moneda ISO y validaciones de precisión acordes a la moneda. |
| NFR-003-002 | La autorización se aplica en servidor por rol y recurso; las pruebas incluyen accesos cruzados y modificaciones no autorizadas. |
| NFR-003-003 | Los logs y fixtures usan datos sintéticos y no registran domicilios, coordenadas, PII ni secretos. |
| NFR-003-004 | La migración preserva referencias históricas y documenta avance y corrección hacia adelante; no requiere borrar datos. |

## Criterios de aceptación propuestos

| ID | Escenario verificable | Requisito |
|---|---|---|
| AC-003-001 | Dado un ADMIN autorizado, cuando publica un servicio válido, entonces CLIENT puede verlo y un borrador o servicio retirado no aparece. | REQ-003-001, REQ-003-005 |
| AC-003-002 | Dada la regla geográfica aprobada, cuando ADMIN registra zonas inválidas o ambiguas, entonces la API las rechaza; una zona válida se resuelve de forma determinista. | REQ-003-002 |
| AC-003-003 | Dado un servicio y zona, cuando ADMIN publica una tarifa con moneda, importe y vigencia válidos, entonces queda disponible; importes flotantes, negativos, precisión inválida o vigencias incompatibles se rechazan. | REQ-003-003, NFR-003-001 |
| AC-003-004 | Dado servicio/zona y momento válidos, cuando CLIENT solicita una oferta, entonces recibe una sola tarifa vigente o el resultado explícito de ausencia de cobertura/tarifa. | REQ-003-004 |
| AC-003-005 | Dada una tarifa usada por una oferta, cuando ADMIN publica una nueva versión o retira la anterior, entonces la oferta previa conserva su servicio, zona, moneda, importe y versión originales. | REQ-003-003, REQ-003-007, NFR-003-004 |
| AC-003-006 | Dado un CLIENT, DISPATCHER no autorizado o técnico, cuando intenta administrar catálogo o tarifa, entonces recibe denegación; ADMIN conserva acceso conforme a la política aprobada. | REQ-003-001 a REQ-003-003, NFR-003-002 |
| AC-003-007 | Dado un cambio o resolución de catálogo, cuando se registra auditoría, entonces contiene sólo campos mínimos sanitizados y no filtra domicilio, coordenadas, PII ni secretos. | REQ-003-006, NFR-003-003 |

## Dependencias

| Dependencia | Estado | Condición para esta feature |
|---|---|---|
| feat-001 | cerrada | API, PostgreSQL, migraciones, OpenAPI, auditoría y comandos de calidad disponibles. |
| feat-002 | cerrada | Reutilizar perfiles, roles y guard disponibles; la dependencia ya no bloquea la especificación. |
| feat-004 | propuesta, consumidora | Deberá resolver domicilio según ADR-005 y persistir la instantánea de oferta definida aquí al confirmar la solicitud. |
| feat-007 | propuesta, consumidora | Deberá crear la intención de pago desde el importe instantáneo de solicitud, no desde la tarifa actual del catálogo, conforme a ADR-004. |

## Propuesta de especificación posterior a las decisiones

Con las decisiones `DEC-003-001` a `DEC-003-008` resueltas, se prepararon:

1. `specs/features/feat-003/requirements.md` con los REQ/NFR anteriores
   ajustados a las reglas comerciales aprobadas.
2. `design.md` con entidades `Service`, `CoverageZone`, `ServiceRate` y
   `QuotedOffer`/instantánea de consumo; índices y restricciones de vigencia;
   representación segura de dinero; autorización; auditoría; migración y
   rollback/corrección hacia adelante.
3. `api-contract.yaml` para las consultas de catálogo/oferta y la
   administración autorizada, incluyendo respuestas explícitas de ausencia de
   cobertura o tarifa y errores `application/problem+json`.
4. `acceptance.md`, `tasks.md`, `test-plan.md` y `evidence.md` con
   trazabilidad completa `REQ-003` → `AC-003` → `TASK-003` → `TEST-003`.
5. Pruebas unitarias de dinero, vigencia y resolución; integración PostgreSQL
   para unicidad/versionado; seguridad de permisos; y E2E para la consulta de
   cliente y el flujo administrativo permitido.

La especificación se encuentra en `specification`; no habilita implementación.
Requerirá aprobación humana de especificación antes de modificar código. Una
evolución de zonas con proveedor, datos de ubicación adicionales o cambio
material de privacidad requerirá además aprobación de arquitectura.

## Solicitud de aprobación para continuar

La próxima puerta es la aprobación humana de los artefactos de especificación.
