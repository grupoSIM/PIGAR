# Diseño — feat-002: Identidad, roles y perfiles básicos

## Resumen

Dos clientes OIDC separados (portal cliente y backoffice) delegan el inicio de
sesión en Auth0. La API valida el access token y obtiene el perfil local de
PostgreSQL. Auth0 autentica; PIGAR autoriza y audita.

Clientes usan Universal Login con código OTP por email o Google. El usuario
aprobó esta variante el 2026-07-27 en reemplazo de magic link. La Action Post
Login exige MFA TOTP sólo cuando el cliente OIDC es el backoffice; el portal
cliente no recibe una política MFA global. Auth0 Organizations entrega las
invitaciones del único equipo interno; los roles de negocio siguen locales.

El backoffice expone HTTPS `/login` como callback de invitación. Conserva los
parámetros `invitation` y `organization` únicamente durante el redireccionamiento
OIDC, no los registra, y los entrega al Universal Login. La URL exacta se
configura en Auth0 al desplegar staging; no se usan comodines.

## Componentes afectados

```text
customer-web/admin-web -> Auth0 OIDC -> API NestJS -> Auth guard -> PostgreSQL
admin-web              -> API admin -> adaptador Auth0 Management API
```

El dominio define puertos para validación de identidad e invitación. Los SDK y
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
- `POST /v1/admin/profiles/invitations`: crea una invitación idempotente.
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
- Invitación y alta usan claves idempotentes almacenadas en la infraestructura
  existente; no se duplica un efecto remoto tras reintento.
- El último ADMIN no puede desactivarse ni degradarse en la misma transacción.

## Experiencia por actor

- Cliente: acceso por código OTP email/Google y edición del perfil propio.
- Administración: login HTTPS `/login` tras invitación, con MFA y pantalla
  mínima de personal.
- Técnico: no recibe una ruta ni un flujo autenticado.

## Observabilidad, errores y degradación

Eventos: `auth.token.accepted`, `auth.token.rejected`, `profile.provisioned`,
`profile.deactivated`, `admin.invitation.requested`; sólo códigos y IDs opacos.
Si Auth0 o JWKS no están disponibles, las solicitudes que requieren validación
fallan de forma segura; liveness/readiness técnico no los consulta.

## Migración, rollback y riesgos

La migración añade tablas/enum de perfiles y auditoría, con despliegue
compatible: crear esquema, publicar API/web, y sólo después habilitar rutas.
No hay rollback automático de Prisma: ante fallo se aplica forward-fix o se
revierte código antes de depender de columnas nuevas. Riesgos principales:
configuración OIDC incorrecta, acceso cruzado y revocación tardía; las pruebas
de integración y E2E los cubren explícitamente.
