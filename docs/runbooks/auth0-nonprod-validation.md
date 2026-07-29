# Runbook — Validación no productiva de Auth0 para feat-002

## Propósito y límites

Este procedimiento valida ADR-003 antes de aprobar la especificación de
`feat-002`. Usá un tenant de desarrollo/prueba separado; no cargues datos reales
ni copies secretos, tokens, dominios privados, Client IDs o capturas sensibles
en el repositorio, chat o evidencia.

No crea producción, no habilita usuarios finales y no autoriza implementación.
Al terminar, compartí sólo el checklist de resultados de la última sección.

## Antes de comenzar

1. Ingresá al Dashboard de Auth0 con una cuenta de propietario del tenant de
   prueba o creá un tenant de desarrollo. Verificá que no sea el tenant de
   producción.
2. Anotá fuera del repositorio el nombre/ID del tenant y quién conserva el
   acceso de administrador. Activá MFA para esa cuenta administradora si el
   tenant lo permite.
3. Revisá el plan, límites de usuarios activos, límite de emails/passwordless,
   conexiones sociales, MFA, Organizations e invitaciones. Registrá fecha,
   nombre del plan y si cada capacidad está disponible; no es necesario
   registrar importes ni datos de facturación.

## Flujo cliente por email aprobado

El usuario aprobó el 2026-07-27 el código OTP por email mediante **Universal
Login**, en reemplazo de magic link. Habilitá la conexión Email Passwordless
para la aplicación de cliente y comprobá que un correo sintético recibe y
canjea un código. PIGAR no solicita ni almacena contraseña.

## Configurar Google para clientes

1. En Auth0, creá o habilitá la conexión social Google exclusivamente para el
   tenant de prueba. Usá credenciales OAuth de prueba separadas de producción.
2. Habilitala sólo para la futura aplicación de cliente, no para el backoffice.
3. Probá con una cuenta Google de prueba y verificá que el retorno llega a una
   callback permitida. No compartas el Client Secret ni la configuración OAuth.

Si Google solicita una pantalla de consentimiento o verificación que no está
disponible en el plan/cuenta de prueba, anotá el impedimento; no lo resuelvas
usando una cuenta productiva.

## Configurar acceso interno y MFA

1. Creá una aplicación de prueba separada para administración; el tipo exacto
   de aplicación, callbacks y SDK se fijarán durante implementación. No copies
   ejemplos de URL a producción ni uses comodines.
2. En **Security > Multi-factor Auth**, habilitá un factor apropiado para
   pruebas (por ejemplo, autenticador TOTP o WebAuthn) y verificá que el login
   de un usuario interno de prueba exige enrolamiento y desafío MFA.
3. Confirmá que las conexiones habilitadas para administración no permiten el
   acceso público de cliente por Google/passwordless, salvo que la futura
   decisión explícita indique lo contrario.

## Invitaciones administrativas aprobadas

El usuario aprobó Auth0 Organizations el 2026-07-27 para el único equipo
interno PIGAR. Crear una organización de prueba, habilitar sólo la conexión de
personal y enviar una invitación a un correo de prueba. Verificar aceptación,
expiración y baja. La futura ruta de login administrativa debe aceptar los
parámetros `invitation` y `organization`; no se crea un mecanismo de email
propio.

## OIDC, API y restricciones de URL

1. Creá un API/resource server de prueba y anotá en un gestor seguro su
   identifier/audience. No debe ser un secreto, pero no hace falta publicarlo.
2. Para cada aplicación, configurá sólo URLs exactas de callback, logout, web
   origin y CORS del entorno de prueba. No uses `*`, rutas de terceros ni URLs
   productivas. Las URLs definitivas se completarán cuando el SDK defina las
   rutas de callback de las dos aplicaciones Next.js.
3. Inspeccioná una respuesta de prueba y confirmá, sin pegar el JWT, que el
   access token contiene el issuer esperado, audience de API, expiración y un
   `kid` resoluble por JWKS. Comprobá que un token con audience equivocada se
   rechaza en el validador o depurador de prueba.
4. Verificá que las claves JWKS se consultan mediante HTTPS y que la rotación
   de claves está disponible. No descargues ni versionés claves privadas.

### URLs exactas de staging

Para el FQDN de staging aprobado, configurar los siguientes valores reemplazando
`<staging-fqdn>` fuera de Git. El SDK monta las rutas de cliente en la raíz y
las administrativas debajo de `/admin`; no usar comodines.

| Aplicación | Callback permitido | Logout permitido | Web origin / CORS |
|---|---|---|---|
| Cliente | `https://<staging-fqdn>/auth/callback` | `https://<staging-fqdn>/auth/logout` | `https://<staging-fqdn>` |
| Backoffice | `https://<staging-fqdn>/admin/auth/callback` | `https://<staging-fqdn>/admin/auth/logout` | `https://<staging-fqdn>` |

La aceptación de invitación de Organizations comienza en
`https://<staging-fqdn>/login`. Nginx la entrega internamente a
`/admin/login`, que conserva `invitation` y `organization` sólo durante el
redireccionamiento a Universal Login. Esta URL no sustituye el callback OIDC
de `/admin/auth/callback`.

## Evidencia segura que debés devolver

Copiá y completá este bloque sin secretos ni URLs privadas:

```text
AUTH0-002-VALIDATION
fecha: AAAA-MM-DD
tenant: development/test (no nombre)
plan y cuotas revisados: sí/no; capacidades disponibles: ...
cliente email: código OTP Universal Login probado / bloqueado
cliente Google: probado / bloqueado
administración MFA: probado / bloqueado; factor: TOTP/WebAuthn/otro
invitaciones: Organizations probado / no se usará / bloqueado
OIDC: issuer, audience, expiración, firma y JWKS comprobados: sí/no
URLs: callbacks/logout/origins exactos, sin comodines: sí/no
datos reales o secretos compartidos: no
impedimentos o decisiones pendientes: ...
```

Con ese resultado se actualizan la especificación, las tareas y `evidence.md`.
Si la prueba de Organizations revela una limitación de plan o configuración, la
especificación vuelve a revisión antes de pedir aprobación de implementación.

## Estado conocido — 2026-07-28

El tenant de staging tiene dos clientes separados: cliente con Email OTP y
Google; administración con usuario/contraseña. Las conexiones quedaron
revisadas sin habilitar Google ni Email Passwordless para el backoffice. Se
creó la API de staging con firma RS256, con audiencia fuera de Git, y el
cliente técnico de invitaciones recibió exclusivamente el permiso de crear
invitaciones de Organization. La Organization interna única ya existe.

El factor TOTP está habilitado. La política general de MFA está configurada
para no exigirlo globalmente, de modo que no afecte al cliente; la exigencia
selectiva del backoffice debe mantenerse mediante la Action Post Login que
identifica la aplicación administrativa. Antes de activar el entorno, revisar
esa Action y realizar un login administrativo de prueba.

Callbacks, logout, audience, issuer, IDs y secretos se mantienen fuera del
repositorio.

Queda por implementar y desplegar la ruta HTTPS exacta `/login` del backoffice
para que la invitación de Organization pueda completar su aceptación con los
parámetros `invitation` y `organization`. Hasta entonces no debe marcarse como
probada la aceptación, expiración o baja de una invitación. La revisión de
plan/cuotas y la comprobación de token/JWKS se ejecutarán y registrarán en
`TASK-002-001`, sin secretos ni URLs privadas.

## Referencias oficiales

- [Passwordless email y magic links](https://auth0.com/docs/authenticate/passwordless)
- [Passwordless con Universal Login](https://auth0.com/docs/authenticate/login/auth0-universal-login/passwordless-login/email-or-sms)
- [Configuración de URLs de aplicaciones](https://auth0.com/docs/get-started/applications/application-settings)
- [Invitaciones de Organizations](https://auth0.com/docs/manage-users/organizations/configure-organizations/invite-members)
- [Universal Login y MFA](https://auth0.com/docs/authenticate/login/auth0-universal-login)
