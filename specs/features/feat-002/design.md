# Diseño — feat-002: Identidad, roles y perfiles básicos

## Resumen

Dos clientes OIDC separados (portal cliente y backoffice) delegan el inicio de
sesión en Auth0. La API valida el access token y obtiene el perfil local de
PostgreSQL. Auth0 autentica; PIGAR autoriza y audita.

La pantalla propia del portal cliente ofrece sólo código OTP por email e invoca
la conexión Auth0 exacta, sin selección genérica del Universal Login. Google
queda fuera del MVP y sólo podrá reconsiderarse antes de producción mediante
una decisión y validación separadas. Un primer ingreso verificado se
aprovisiona de forma idempotente como CLIENT, sin registro visible para la
persona.

El backoffice deriva a Auth0 para usuario/email y contraseña de una identidad
de base de datos ya aprovisionada por un ADMIN. La Action Post Login exige MFA
TOTP sólo para este cliente OIDC. No se usa Auth0 Organizations ni parámetros
de invitación; los roles de negocio siguen locales.

## Componentes afectados

```text
customer-web/admin-web -> Auth0 OIDC -> API NestJS -> Auth guard -> PostgreSQL
admin-web              -> API admin -> adaptador Auth0 Management API (cuentas internas)
```

El dominio define puertos para validación de identidad y aprovisionamiento. Los SDK y
llamadas HTTP de Auth0 quedan en adaptadores de API, no en paquetes de dominio.

## Modelo de datos

`Profile`: UUID, `identitySubject` único, `role` (`CLIENT|DISPATCHER|ADMIN`),
`status` (`ACTIVE|INACTIVE`), nombre visible, teléfono opcional, timestamps.

`AccessAuditEvent`: UUID, tipo, actor interno opcional, sujeto interno,
resultado, correlation ID, timestamp UTC y metadatos técnicos sanitizados.

Una restricción única sobre `identitySubject` hace idempotente el alta. La
desactivación es un cambio de estado; nunca se borra el perfil ni su auditoría.

## API y contratos

- `GET /v1/me`: perfil mínimo del actor autenticado.
- `PATCH /v1/me`: actualiza nombre visible/teléfono del CLIENT autenticado.
- `GET /v1/admin/profiles`: listado paginado de perfiles internos para ADMIN.
- `POST /v1/admin/profiles`: aprovisiona una cuenta interna idempotentemente.
- `POST /v1/admin/profiles/{profileId}/password-reset`: inicia recuperación
  únicamente para una cuenta interna existente.
- `PATCH /v1/admin/profiles/{profileId}/role`: cambia rol interno permitido.
- `POST /v1/admin/profiles/{profileId}/deactivate`: desactiva acceso interno.

Las respuestas de error usan `application/problem+json`, `X-Request-ID` y no
revelan la razón detallada de validación de token. El contrato detallado está
en `api-contract.yaml`.

## Seguridad y consistencia

- Authorization Code + PKCE en webs; no password grant ni tokens en logs.
- JWKS con caché limitada y renovación ante `kid` desconocido; issuer,
  audience, expiración, firma y algoritmo se validan estrictamente.
- El rol efectivo procede sólo del perfil local activo.
- El aprovisionamiento y la recuperación usan claves idempotentes almacenadas
  en la infraestructura existente; no se duplica un efecto remoto tras reintento.
- El último ADMIN no puede desactivarse ni degradarse en la misma transacción.

## Experiencia por actor

- Cliente: pantalla propia con código OTP email y edición del perfil propio; no
  ve contraseña, registro ni Google.
- Administración: cuenta preaprovisionada, contraseña hospedada por Auth0 y
  MFA, con pantalla mínima de personal.
- Técnico: no recibe una ruta ni un flujo autenticado.

## Observabilidad, errores y degradación

Eventos: `auth.token.accepted`, `auth.token.rejected`, `profile.provisioned`,
`profile.deactivated`, `admin.account.provision.requested`; sólo códigos e IDs opacos.
Si Auth0 o JWKS no están disponibles, las solicitudes que requieren validación
fallan de forma segura; liveness/readiness técnico no los consulta.

## Migración, rollback y riesgos

La migración añade tablas/enum de perfiles y auditoría, con despliegue
compatible: crear esquema, publicar API/web, y sólo después habilitar rutas.
No hay rollback automático de Prisma: ante fallo se aplica forward-fix o se
revierte código antes de depender de columnas nuevas. Riesgos principales:
configuración OIDC incorrecta, acceso cruzado y revocación tardía; las pruebas
de integración y E2E los cubren explícitamente.
