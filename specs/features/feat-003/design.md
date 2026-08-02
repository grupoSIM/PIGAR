# Diseño — feat-003: Catálogo de servicios, zonas y tarifas

## Resumen

`ServiceCategory`, `CoverageZone` y `ServiceRate` son recursos versionados.
El seed inicial contiene zona única y `Visita Simple` con ARS 50.000 final.

## Datos y consistencia

`ServiceRate` guarda moneda ISO, importe decimal, vigencia, estado y versión;
la unicidad impide dos tarifas publicables vigentes para categoría/zona/momento.
No se borra una tarifa usada. Una futura `QuotedOffer` copia categoría, zona,
importe, moneda y versión al confirmar la solicitud.

## API y actores

La lectura pública devuelve únicamente nombre, descripción, alcance y precio
final vigente. Administración exige `ADMIN`; `DISPATCHER` sólo lee la vista
operativa. Errores usan `application/problem+json`.

## Seguridad y migración

No se persisten domicilio ni coordenadas. Auditoría sanitizada. La migración es
forward-only y el forward-fix retira/publica una nueva tarifa, nunca reescribe
una tarifa histórica.
