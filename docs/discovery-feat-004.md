# Discovery — feat-004: Creación de solicitud con domicilio y multimedia

- Estado: `discovery`.
- Inicio: 2026-08-03.
- Dependencias: `feat-002` y `feat-003` integradas en `main`.
- Decisiones relacionadas: [ADR-005](adr/ADR-005.md),
  [ADR-006](adr/ADR-006.md) y [ADR-008](adr/ADR-008.md).
- Límite: este discovery no habilita código, migraciones, llamadas a Google
  Maps, cargas de archivos, publicación ni despliegue.

## Objetivo

Permitir que un `CLIENT` autenticado confirme una solicitud de Visita Simple
con su domicilio, descripción del problema y multimedia opcional. Al
confirmarla, el servidor debe resolver la oferta vigente de feat-003 y guardar
una instantánea inmutable; cambios posteriores de catálogo no pueden modificar
la solicitud. La operación prepara, pero no ejecuta, la asignación, los
estados operativos, el diagnóstico, el presupuesto ni el cobro de features
posteriores.

## Alcance candidato

- Selección de la oferta pública vigente y creación idempotente de la
  solicitud por el cliente autenticado.
- Domicilio confirmado por el cliente: texto normalizado, coordenadas del
  domicilio y corrección manual según ADR-005; nunca ubicación del técnico.
- Descripción informada por el cliente y una instantánea de oferta con
  categoría, zona, moneda, importe y versión de tarifa.
- Hasta cinco imágenes opcionales y un video opcional de hasta 30 segundos,
  privados, por streaming al volumen persistente, conforme a ADR-006.
- Consulta por propiedad para `CLIENT` y consulta operativa limitada para
  `ADMIN`/`DISPATCHER`; autorización en servidor y auditoría sanitizada.
- Contrato HTTP, migraciones no destructivas, pruebas de idempotencia,
  permisos, acceso cruzado a domicilio/multimedia y flujo E2E.

## Fuera de alcance

- Tracking, ubicación, teléfono o contacto directo del técnico.
- Asignación, agenda, máquina de estados operativos, diagnóstico, presupuesto,
  pago, conformidad, reprogramación, notificaciones o chat.
- Persistencia offline de domicilio, tokens o multimedia; sólo operación online
  y reintentos idempotentes conforme a ADR-008.
- Cualquier proveedor de almacenamiento adicional, object storage, backup
  externo, transcodificación o despliegue de producción.

## Decisiones abiertas para aprobación humana

| ID | Decisión | Recomendación inicial |
|---|---|---|
| DEC-004-001 | Forma de confirmar domicilio | Google Places/autocompletado y pin corregible, más texto confirmado; permitir edición manual y no aceptar coordenadas de técnico. |
| DEC-004-002 | Campos mínimos de solicitud | Categoría/oferta, descripción obligatoria y domicilio completo; definir campos concretos de dirección e indicaciones de acceso. |
| DEC-004-003 | Momento y flujo de multimedia | Crear la solicitud idempotente con oferta congelada y adjuntar multimedia opcional autorizada a esa solicitud; definir si el cliente puede confirmar sin archivos y hasta cuándo puede agregarlos. |
| DEC-004-004 | Límites efectivos de multimedia | Confirmar o ajustar el máximo ADR-006: 5 imágenes de 10 MB y 1 video de 30 s/50 MB; validar MIME permitido y política ante carga interrumpida. |
| DEC-004-005 | Acceso operativo | `CLIENT` sólo sus solicitudes; `ADMIN` y `DISPATCHER` consulta operativa. Definir si ambos pueden ver/descargar multimedia y bajo qué propósito. |
| DEC-004-006 | Retención | Propuesta ADR-006: borrar multimedia 180 días después del cierre; domicilio y metadatos quedan sujetos a validación legal antes de producción. |
| DEC-004-007 | Cobertura en la zona única | Confirmar si toda dirección normalizada se acepta en el MVP o si Google debe determinar/rechazar direcciones fuera de cobertura pese a existir una sola zona. |

## Decisiones confirmadas el 2026-08-03

| Decisión | Resolución | Estado |
|---|---|---|
| DEC-004-001 | Se usará Google Autocomplete/Geocoding con ingreso manual como degradación. En la zona única, la geocodificación normaliza el domicilio y no rechaza por cobertura. Nunca se usa para tracking técnico. | aprobada para MVP, sujeta a controles arquitectónicos de clave/cuota. |
| DEC-004-002 | La descripción es obligatoria. El domicilio exige calle y número; barrio, entrecalle 1 y entrecalle 2 son campos adicionales de la solicitud. | aprobada para MVP. |
| DEC-004-004 | Se confirman hasta cinco imágenes de 10 MB y un video MP4 de hasta 30 segundos/50 MB. Al menos una evidencia multimedia (una imagen o el video) es obligatoria. | aprobada para MVP. |
| DEC-004-005 | `ADMIN` y `DISPATCHER` pueden consultar y descargar domicilio y multimedia por necesidad operativa; todo acceso queda autorizado en servidor y auditado sin datos sensibles. | aprobada para MVP. |
| DEC-004-006 | La retención/borrado de multimedia y domicilio se difiere a la puerta de producción. La propuesta de 180 días no se adopta todavía. | diferida a producción. |
| DEC-004-007 | Con zona única, toda dirección normalizada o ingresada manualmente se considera cubierta en el MVP; Google no decide cobertura ni prueba domicilio. | aprobada para MVP. |
| DEC-004-008 | Se aprueba cifrado administrado por el proveedor para el disco/volumen del VPS. No se agrega cifrado por archivo en la aplicación. La validación del alcance de Hostinger, backups, capacidad y alertas queda antes de producción; si no puede verificarse, se evaluará LUKS. | aprobada con validación técnica pendiente. |

## Límite de datos de staging

El usuario aprobó que los testers autenticados de staging carguen los datos
necesarios para validar el MVP, incluidos domicilios reales y geolocalización.
No se habilita acceso anónimo ni producción, pero esta etapa no se limita a
fixtures sintéticos.

El usuario aceptó explícitamente que cifrado en reposo, retención/borrado legal,
backup externo cifrado, capacidad productiva y validación comercial de Google
Maps no sean puertas de staging. Esos controles no se eliminan: permanecen como
bloqueantes explícitos de `before_production`. La especificación conserva
autorización por propiedad/rol, sanitización de logs, límites de archivos,
idempotencia y pruebas de acceso cruzado; no se relajan por tratarse de staging.

DEC-004-003 queda resuelta: se permiten adjuntos tanto durante la creación como
después de crear la solicitud. Debe existir al menos una evidencia multimedia
(una imagen o el video opcional) para que la solicitud quede operable; una
solicitud sin esa evidencia no se confirma para operación. La especificación
definirá la representación mínima de ese estado sin anticipar la máquina de
estados completa de feat-005.

## Riesgos y controles candidatos

| Riesgo | Control verificable |
|---|---|
| Precio alterado o cambiado luego | Resolver y copiar la oferta íntegramente en una transacción idempotente; el cliente nunca envía el importe final. |
| Domicilio o coordenadas expuestos | Control por propiedad/rol, representaciones mínimas, logs y auditoría sin dirección/latitud/longitud, sin cache persistente del navegador. |
| Archivo malicioso, grande o huérfano | Streaming, allowlist MIME, límites, checksum, archivo temporal, rename atómico, limpieza y cuota de disco. |
| Acceso cruzado a solicitudes o archivos | Negación explícita para otro CLIENT, técnico y actor sin propósito; Nginx sólo entrega después de autorización interna. |
| Doble envío o timeout | Clave de idempotencia por cliente y payload; mismo resultado para reintento, conflicto para payload distinto. |
| Dependencia de Google | Puerto aislado, restricciones de clave/cuota y degradación explícita; no almacenar payload propietario ni inferir que geocodificar prueba el domicilio. |

## Revisión arquitectónica focalizada (2026-08-03)

Dictamen del Architect Reviewer: `approved_with_conditions`. No se requiere una
ADR nueva si se respeta ADR-005, ADR-006 y ADR-008; la puerta arquitectónica
humana sigue pendiente porque se activan domicilio, coordenadas y un proveedor
externo.

Para datos reales, antes de producción deben quedar decididos y documentados:

- APIs concretas de Google, invocador cliente/servidor, clave restringida por
  referrer/IP/API, cuotas, presupuesto, alertas, timeout y degradación a
  ingreso manual sin geocodificación. Se persiste sólo texto confirmado y
  latitud/longitud normalizadas; nunca candidatos ni payload del proveedor.
- Cifrado en reposo de volumen y backups, capacidad, cuota, alertas de disco y
  límites de contenedor para multimedia. La PoC previa no sustituye esta
  configuración.
- Retención/borrado operable, limpieza de temporales, estado de archivo,
  ownership y autorización de descarga; los 180 días son una propuesta y la
  validación legal sigue bloqueando producción.
- Semántica de snapshot e idempotencia: la confirmación debe copiar oferta
  completa en una transacción; el flujo online no debe dejar solicitudes o
  adjuntos parciales tras timeout/corte y no persiste domicilio, tokens ni
  multimedia en el navegador.

Las pruebas futuras deben incluir MIME por contenido, límites/duración,
interrupción y reintento, acceso cruzado a domicilio y archivos, auditoría sin
PII/ubicación y degradación del proveedor de mapas.

## Próxima puerta

La revisión arquitectónica debe confirmar los controles para datos de ubicación,
Google Maps y multimedia. Luego se necesitan las decisiones `DEC-004-001` a
`DEC-004-007` para preparar requirements, diseño, contrato, aceptación, tareas,
plan de pruebas y evidencia. La aprobación de especificación seguirá siendo
una puerta humana separada.
