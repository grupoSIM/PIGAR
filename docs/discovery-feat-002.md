# Discovery — feat-002: Identidad, roles y perfiles básicos

- Estado: `completed`
- Inicio: 2026-07-27
- Dependencia satisfecha: feat-001
- Decisión aplicable: [ADR-003](adr/ADR-003.md), `accepted`

## Resultado de alcance

La feature habilitará la identidad y los perfiles mínimos necesarios para los
flujos posteriores del MVP. Auth0 será exclusivamente el proveedor de
autenticación OIDC; PIGAR conservará en PostgreSQL el perfil local, su
`identity_subject` opaco y los roles activos. La API seguirá siendo la
autoridad de autorización.

Incluido para especificar:

- Clientes: inicio de sesión por código OTP de email o Google.
- Personal interno: alta mediante invitación y MFA obligatorio.
- Roles locales `CLIENT`, `DISPATCHER` y `ADMIN`, con permisos explícitos.
- Creación, sincronización idempotente, desactivación y revocación de perfiles.
- Validación de token OIDC en API (issuer, audience, expiración) y rechazo
  seguro de tokens o roles no válidos.
- Auditoría minimizada de altas, bajas y cambios administrativos.

Fuera de alcance:

- Contraseñas, SMS/WhatsApp OTP, cuentas, sesiones o tokens para técnicos.
- Portal o acceso autenticado para operarios, tracking o datos de ubicación.
- Solicitudes, órdenes, pagos, multimedia, notificaciones y configuración
  administrativa no relacionada con perfiles.
- Activación de Auth0 productivo, uso de credenciales reales o despliegue.

## Actores y límite de autorización

| Actor | Alcance previsto |
|---|---|
| Visitante | Puede iniciar los flujos de autenticación del portal correspondiente; no accede a recursos de PIGAR. |
| CLIENT | Gestiona solo su propio perfil y, en features posteriores, recursos de su propiedad. |
| DISPATCHER | Usa el backoffice con permisos operativos explícitos; no administra roles. |
| ADMIN | Administra perfiles internos y roles permitidos, además de sus capacidades operativas posteriores. |
| Técnico | No tiene cuenta, sesión, token ni permisos en el MVP. |

## Riesgos y controles a convertir en especificación

- Confusión entre roles del proveedor y permisos locales: la API resolverá el
  perfil activo local y aplicará autorización contextual, sin confiar en la UI.
- Alta duplicada o eventos fuera de orden: la sincronización deberá ser
  idempotente por `identity_subject` y no elevar privilegios.
- Revocación tardía: una cuenta desactivada localmente deberá ser denegada aun
  si conserva un token OIDC válido hasta su expiración.
- Suplantación o configuración errónea: validar estrictamente issuer,
  audience, firma, expiración y algoritmo permitido; no registrar tokens,
  emails ni encabezados de autorización.
- Acceso cruzado: pruebas negativas cubrirán perfiles de otro cliente, rol
  inexistente, cuenta desactivada y técnico sin identidad PIGAR.

## Validación externa requerida antes de spec_review

Auth0 ya fue aprobado como proveedor mediante ADR-003, pero falta evidencia
con una cuenta no productiva de:

1. Plan, cuotas y coste aplicable al entorno de prueba.
2. Una aplicación cliente con código OTP email y Google, y una aplicación de
   administración con invitaciones y MFA obligatorio.
3. Restricciones de callback/logout, audience de la API, issuer y rotación de
   claves OIDC; sin exponer valores, dominios privados ni secretos en el repo.
4. Flujo de invitación, baja/revocación y sus límites operativos.

## Decisiones a confirmar durante la validación

El usuario aprobó el 2026-07-27 código OTP de email mediante Universal Login
en reemplazo de magic link. La decisión conserva un patrón familiar para
clientes y permite MFA selectivo de administración mediante Actions. Las
invitaciones administradas de Auth0 usan Organizations; se debe confirmar si
ese modelo corresponde al único equipo interno de PIGAR antes de incorporarlo
al diseño.

El procedimiento detallado y la evidencia no sensible requerida se encuentran
en [auth0-nonprod-validation.md](runbooks/auth0-nonprod-validation.md).

La ausencia de esa validación bloquea la aprobación de la especificación, no
el trabajo de discovery. No se seleccionan planes, dominios ni valores de
configuración de forma implícita.

## Próximo entregable

Con la validación anterior, se prepararán `requirements.md`, `design.md`,
`tasks.md`, `acceptance.md`, `test-plan.md`, `evidence.md` y el contrato HTTP
de feat-002. Esos artefactos pasarán a `spec_review` y requerirán aprobación
humana antes de implementar.
