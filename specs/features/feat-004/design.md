# Diseño — feat-004: Creación de solicitud con domicilio y multimedia

## Resumen

`ServiceRequest` referencia al perfil cliente y conserva `QuotedOfferSnapshot`.
`RequestAddress` contiene sólo campos confirmados y coordenadas normalizadas.
`RequestMedia` guarda descriptor neutral, checksum, MIME, tamaño, duración y
estado; el binario vive en volumen privado.

## Consistencia

La creación transaccional resuelve la tarifa publicable y escribe la instantánea
con el `Idempotency-Key`. La solicitud inicia `MEDIA_REQUIRED`; sólo pasa a
`READY_FOR_OPERATION` al existir una imagen o video válido. Estos son estados
técnicos de completitud, no reemplazan la máquina de estados de feat-005.

## API propuesta

- `POST /v1/requests`: CLIENT, clave idempotente, oferta/domicilio/descripción;
  crea snapshot y retorna solicitud.
- `POST /v1/requests/{id}/media`: propietario CLIENT, streaming de cuerpo binario;
  adjunta imagen/video y actualiza completitud.
- `GET /v1/requests/{id}` y `GET /v1/requests/{id}/media/{mediaId}`:
  propiedad o rol operativo; descarga mediante autorización API + Nginx interno.
- `GET /v1/admin/requests`: ADMIN/DISPATCHER, listado mínimo operativo.

## Seguridad y privacidad

Google se encapsula detrás de un puerto, con fallback manual para UAT de testers
autenticados. No se guardan respuestas del proveedor. Nginx no sirve rutas físicas. MIME se
verifica por magic bytes; temporales/errores se limpian. Logs/auditoría no
incluyen dirección, coordenadas, nombre físico, payload o secretos.

## Migración y evolución

Tablas nuevas sin cambios destructivos. Los adjuntos y la instantánea nunca se
reescriben para reflejar cambios de catálogo. La limpieza/retención productiva
se implementará antes de producción.
