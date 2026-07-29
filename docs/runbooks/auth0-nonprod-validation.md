# Runbook — Validación no productiva de Auth0 para feat-002

## Propósito y límites

Este procedimiento valida el flujo aprobado de ADR-003 en un tenant separado de
producción. No copiar al repositorio, chat ni evidencia secretos, tokens, IDs,
dominios privados, direcciones de correo o capturas sensibles.

## Configuración a verificar

1. Revisar plan y cuotas de Google, Email Passwordless OTP, MFA TOTP y
   Management API. Registrar sólo disponibilidad y fecha.
2. En la aplicación cliente, habilitar exclusivamente las conexiones Google y
   Email Passwordless en modo código. Configurar los nombres de ambas conexiones
   fuera de Git en las variables `PIGAR_CUSTOMER_AUTH0_*_CONNECTION`.
3. En la aplicación administrativa, habilitar sólo la conexión de base de datos.
   La Action Post Login debe exigir MFA TOTP para este cliente y no para cliente.
4. Configurar el cliente de Management API con el mínimo privilegio para crear,
   consultar, desactivar y emitir recuperación de cuentas internas. Definir
   `AUTH0_INTERNAL_CONNECTION` fuera de Git.
5. Configurar callbacks, logout y origins exactos por aplicación; sin comodines.
   El SDK usa `/auth/callback` para cliente y `/admin/auth/callback` para
   backoffice. Ya no se usa `/login`, `invitation` ni `organization`.
6. Verificar issuer, audience, expiración, RS256 y JWKS sin copiar JWTs.

## Pruebas manuales requeridas

- Cliente: Google retorna al portal y Email OTP valida un código; no aparecen
  contraseña, registro, Apple, teléfono, SMS ni WhatsApp.
- ADMIN: aprovisiona una cuenta sintética `DISPATCHER`; la persona establece
  contraseña por el flujo hospedado de Auth0 y completa MFA TOTP.
- Seguridad: visitante no crea cuentas internas; Google/OTP no funcionan en
  backoffice; una cuenta desactivada y un técnico no acceden a la API.
- Recuperación: ADMIN solicita cambio de contraseña sólo para una cuenta interna
  existente. No se crea una cuenta nueva.

## Evidencia segura

```text
AUTH0-002-VALIDATION
fecha: AAAA-MM-DD
tenant: development/test (no nombre)
plan y cuotas revisados: sí/no
cliente Google y OTP: probado / bloqueado
administración: cuenta preaprovisionada, contraseña y MFA TOTP probados / bloqueado
Management API mínimo privilegio: sí/no
OIDC (issuer, audience, expiración, firma y JWKS): sí/no
URLs exactas sin comodines: sí/no
datos reales o secretos compartidos: no
impedimentos: ...
```
