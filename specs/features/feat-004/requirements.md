# Requisitos — feat-004: Creación de solicitud con domicilio y multimedia

## Objetivo y alcance

Un `CLIENT` autenticado crea una solicitud de Visita Simple con oferta congelada,
descripción y domicilio. Debe incluir al menos una imagen o un video antes de
quedar operable. Staging se limita a UAT de testers autenticados; no es
producción ni ofrece acceso anónimo.

## Actores y permisos

| Actor               | Permiso                                                                   |
| ------------------- | ------------------------------------------------------------------------- |
| CLIENT              | Crea y consulta sólo sus solicitudes; carga/descarga sólo sus adjuntos.   |
| DISPATCHER / ADMIN  | Consulta operativa de solicitud, domicilio y multimedia; acceso auditado. |
| Técnico / visitante | Sin acceso.                                                               |

## Requisitos funcionales

### REQ-004-001 — creación y oferta congelada

Al confirmar con una clave de idempotencia, el servidor resuelve la oferta
vigente de feat-003 y copia categoría, zona, descripción comercial, moneda,
importe, versión y vigencia en la solicitud. No acepta importe desde el cliente.

### REQ-004-002 — domicilio confirmado

La solicitud exige descripción, calle y número; admite barrio y dos entrecalles.
Google normaliza texto/coordenadas del domicilio con degradación a entrada
manual. No se almacena ubicación del técnico ni payload del proveedor.

### REQ-004-003 — multimedia privada

Cada solicitud admite hasta cinco imágenes de 10 MB y un video MP4 de 30 s/50
MB. Un archivo de cualquiera de ambos tipos es obligatorio para operación. La
carga es streaming, temporal, validada por contenido, con checksum y rename
atómico; las descargas son autorizadas internamente.

### REQ-004-004 — acceso y auditoría

El servidor valida propiedad, rol y propósito. Rechaza accesos cruzados a
solicitudes, domicilios y archivos. Audita mutaciones y accesos operativos con
IDs opacos, resultado, actor y UTC, sin dirección, coordenadas ni metadata de
archivo sensible.

## Requisitos no funcionales

- NFR-004-001: idempotencia devuelve el mismo resultado al reintentar el mismo
  cliente/clave/payload y conflicto ante payload diferente.
- NFR-004-002: no hay caché persistente de domicilio, tokens ni multimedia en
  el navegador; el flujo requiere conexión.
- NFR-004-003: migraciones forward-only y sin borrar ofertas/tarifas usadas.
- NFR-004-004: staging permite datos de testers autenticados, incluidos
  domicilios/geolocalización; cifrado, backup, retención legal y capacidad
  productiva bloquean producción, no staging. Autorización, minimización de
  logs y controles de acceso aplican en todos los entornos.

## Fuera de alcance

Estados operativos completos, asignación, diagnóstico, presupuesto, pago,
tracking, contacto técnico, notificaciones, acceso anónimo y producción.
