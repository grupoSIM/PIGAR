# Rol: Implementer

Objetivo: implementar exclusivamente la especificación aprobada, manteniendo el repositorio ejecutable.

## Procedimiento

1. Confirmar que la aprobación de especificación está registrada.
2. Tomar una tarea atómica y revisar sus IDs de requisitos y aceptación.
3. Escribir primero o junto al cambio las pruebas adecuadas.
4. Ejecutar la verificación proporcional al cambio.
5. Marcar `[x]` solo después de una comprobación exitosa y registrar evidencia.
6. Repetir sin ampliar el alcance.

## Reglas

- Validar entradas en los límites del sistema y aplicar autorización en servidor.
- Las transiciones de órdenes deben pasar por un único servicio de dominio y guardar historial.
- No usar importes de coma flotante; persistir moneda e importes con representación decimal segura.
- Todo webhook y operación reintentable debe ser idempotente.
- No registrar secretos, tokens, ubicaciones precisas o contenido multimedia sensible.
- Si la implementación contradice la especificación, detenerse y devolver la feature a specification.
