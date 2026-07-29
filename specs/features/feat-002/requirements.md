# Requisitos — feat-002: Identidad, roles y perfiles básicos

- Estado: approved
- Decisión aplicable: ADR-003 (`accepted`)
- Puerta pendiente: aprobación humana de esta especificación

## Objetivo y alcance

Incorporar autenticación OIDC administrada por Auth0 y perfiles/roles locales
para clientes y personal interno. PIGAR no almacena contraseñas y la API aplica
la autorización, incluso si la interfaz oculta acciones.

## Fuera de alcance

- Acceso, cuenta, token o portal para técnicos.
- SMS/WhatsApp OTP, notificaciones, solicitudes, órdenes, pagos o multimedia.
- Producción, cuentas o secretos productivos y despliegue.

## Actores y permisos

| Actor | Permiso de esta feature |
|---|---|
| Visitante | Iniciar el flujo Auth0 del portal adecuado; sin API de negocio. |
| CLIENT | Consultar y actualizar su perfil mínimo; no administra roles ni perfiles ajenos. |
| DISPATCHER | Consultar su perfil; no invita, desactiva ni cambia roles. |
| ADMIN | Invitar personal interno, consultar perfiles internos y cambiar/desactivar roles internos permitidos. |
| Técnico | Ninguno; toda petición autenticada se deniega. |

## Requisitos funcionales

### REQ-002-001 — Autenticación por superficie

- When: un visitante inicia sesión en el portal cliente o el backoffice.
- Where: Auth0 mediante OIDC Authorization Code con PKCE.
- The system shall: permitir código OTP por email o Google a clientes y sólo
  invitación a personal interno con MFA obligatorio; cada aplicación usará sus
  callbacks/logout permitidos y su audience de API configurada.
- Para aceptar una invitación, el backoffice dispondrá de una ruta HTTPS
  `/login` registrada como callback exacto, que conserva y entrega a Auth0 los
  parámetros `invitation` y `organization` del enlace recibido.
- Errores y límites: callbacks, audiencia, issuer, firma, algoritmo o token
  expirado/ausente no autorizan acceso; no hay flujo de contraseña ni técnico.

### REQ-002-002 — Perfil local idempotente

- When: la API acepta por primera vez un token OIDC de un cliente o de una
  persona interna invitada.
- Where: PostgreSQL, tabla de perfiles locales.
- The system shall: crear o recuperar un único perfil mediante
  `identity_subject` opaco, asociar el rol local autorizado y actualizar sólo
  campos permitidos de perfil. Repeticiones concurrentes no duplican perfiles.
- Errores y límites: un sujeto de Auth0 no puede elegir ni elevar su rol;
  emails y nombres no son claves de identidad.

### REQ-002-003 — Validación y contexto de autorización en API

- When: una ruta protegida recibe una petición.
- Where: guard/middleware común de API.
- The system shall: validar JWT con claves OIDC rotables, issuer, audience,
  expiración y algoritmo permitido; resolver el perfil local activo y entregar
  al controlador sólo actor, rol e ID interno mínimos.
- Errores y límites: respuesta 401 para token inválido/ausente y 403 para
  identidad válida sin permiso, perfil inexistente/inactivo o técnico; nunca
  se confía en roles declarados por el cliente ni en la UI.

### REQ-002-004 — Administración de personal interno

- When: un ADMIN administra acceso interno.
- Where: backoffice y API administrativa.
- The system shall: crear una invitación a través del adaptador Auth0, asignar
  inicialmente `DISPATCHER` o `ADMIN`, listar perfiles internos mínimos y
  permitir el cambio o desactivación explícitos con auditoría.
- Errores y límites: un DISPATCHER no administra accesos; no se permite borrar
  historial, auto-desactivarse ni dejar sin ADMIN activo el sistema; reintentos
  no emiten invitaciones duplicadas para la misma operación idempotente.

### REQ-002-005 — Perfil propio de cliente

- When: un CLIENT autenticado consulta o edita su perfil.
- Where: portal cliente y API.
- The system shall: exponer y actualizar únicamente nombre visible y teléfono
  opcional del propio perfil, con validación de formato y una auditoría mínima
  de cambio.
- Errores y límites: no se muestran ni modifican perfiles de terceros; el
  email de identidad no es editable en PIGAR y se gestiona en Auth0.

### REQ-002-006 — Revocación y trazabilidad minimizada

- When: un ADMIN desactiva un perfil interno o el proveedor informa una baja.
- Where: perfil local y bitácora de seguridad.
- The system shall: marcar el perfil inactivo de forma idempotente, negar toda
  petición posterior aunque el JWT no haya vencido y registrar actor, acción,
  sujeto, resultado y timestamp UTC.
- Errores y límites: no se registran tokens, email, headers de autorización ni
  payloads de proveedor; la baja no borra auditoría.

## Requisitos no funcionales

- NFR-002-001 Seguridad: secretos sólo fuera de Git; validación OIDC del lado
  servidor; mínimo privilegio y pruebas negativas de acceso cruzado.
- NFR-002-002 Privacidad: conservar `identity_subject`, rol, estado, nombre
  visible y teléfono opcional; no duplicar tokens ni contraseñas. Retención y
  borrado definitivo quedan sujetos a la validación legal previa a producción.
- NFR-002-003 Disponibilidad: indisponibilidad de Auth0 impide nuevos inicios
  de sesión sin degradar healthchecks; validación de claves tiene caché y
  reintentos acotados.
- NFR-002-004 Observabilidad: eventos estructurados y sanitizados con
  correlation ID, código y duración, sin PII ni secretos.

## Dependencias y condición de aprobación

- Auth0 no productivo ya tiene configurados los dos clientes, los proveedores
  de cliente, MFA selectivo para administración y la Organization interna. La
  aceptación de invitaciones queda pendiente de implementar y desplegar en la
  ruta HTTPS `/login` del backoffice; es alcance verificable de esta feature,
  no una capacidad asumida como probada.
- La revisión no sensible de plan/cuotas, token/JWKS, issuer, audience y URLs
  exactas se completa y evidencia en TASK-002-001 antes del cierre de la
  feature.
- El usuario aprobó el 2026-07-27 código OTP por email con Universal Login en
  reemplazo de magic link y Auth0 Organizations para invitaciones del único
  equipo interno. Organizations no es fuente de roles de PIGAR.
- La configuración resultante se suministrará mediante variables de ambiente,
  sin valores en este repositorio.
- La implementación sólo podrá comenzar después de la aprobación humana de
  estos artefactos.
