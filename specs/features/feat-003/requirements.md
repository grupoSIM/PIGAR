# Requisitos — feat-003: Catálogo de servicios, zonas y tarifas

Estado: `approved` — aprobado por el usuario el 2026-08-02. La aprobación
habilita implementación local; no autoriza commit, push, PR ni despliegue.

## Objetivo y alcance

Ofrecer una vista pública limitada y un catálogo administrable para el MVP: una
zona única, la categoría inicial **Visita Simple** y una tarifa final de
ARS 50.000. La tarifa se congela al confirmar una solicitud futura.

## Fuera de alcance

Mapas, geocodificación, coordenadas, zonas múltiples activas, variaciones por
horario/urgencia/distancia, impuestos separados, pagos y presupuestos.

## Actores y permisos

`ADMIN` administra categorías, zona y tarifas. `DISPATCHER` sólo consulta.
Visitante y `CLIENT` sólo ven la representación pública vigente. Técnico no
accede.

## Requisitos funcionales

### REQ-003-001 — Catálogo de categorías

- The system shall: permitir a `ADMIN` crear, editar, publicar o retirar categorías de visita, sin eliminar registros referenciados.
- Errores y límites: sólo las categorías publicadas se exponen públicamente.

### REQ-003-002 — Cobertura MVP

- The system shall: mantener una única zona de cobertura activa para el MVP y rechazar una segunda zona activa o toda ambigüedad.

### REQ-003-003 — Tarifas finales versionadas

- The system shall: permitir a `ADMIN` publicar una tarifa final ARS por categoría y zona, con importe decimal seguro, vigencia y versión.
- Errores y límites: se rechazan importes negativos, coma flotante, solapamientos de vigencia y monedas distintas de ARS.

### REQ-003-004 — Oferta pública y congelamiento

- The system shall: devolver sólo categorías y una tarifa vigente publicables; al confirmar una solicitud futura, `feat-004` conservará la instantánea inmutable.
- Errores y límites: ausencia de categoría o tarifa devuelve resultado explícito, sin inferir importe.

### REQ-003-005 — Alcance comercial

- The system shall: describir que la Visita Simple cubre la visita y arreglos completables durante ella conforme a lo informado por el cliente. Si no se puede completar, la visita se cobra y el trabajo adicional requiere presupuesto posterior.

### REQ-003-006 — Autorización y auditoría

- The system shall: aplicar permisos en servidor y auditar cambios/resoluciones con actor, acción, recurso, resultado y UTC, sin PII ni secretos.

## Requisitos no funcionales

- NFR-003-001: dinero sin coma flotante, ARS y precisión decimal segura.
- NFR-003-002: pruebas negativas para visitante/CLIENT/DISPATCHER/técnico.
- NFR-003-003: logs y fixtures sin domicilio, coordenadas, PII ni secretos.
- NFR-003-004: migración no destructiva y referencias históricas preservadas.

## Dependencias

feat-002 cerrada; feat-004 consumirá la oferta congelada y feat-007 cobrará
esa instantánea, no el catálogo vigente.
