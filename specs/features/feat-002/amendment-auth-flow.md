# Enmienda propuesta — flujo de autenticación

- Feature: `feat-002`
- Estado: `approved — especificación aprobada por el usuario el 2026-07-29; alcance de Google enmendado por el usuario el 2026-08-01`
- Tipo: cambio de autenticación/autorización aprobado; habilita implementación local, no cambios externos sin autorización específica.
- Relación: complementa y, si se aprueba, reemplaza los apartados en conflicto de `requirements.md`, `design.md`, `acceptance.md`, `test-plan.md` y ADR-003.

## Motivo

La experiencia actual del proveedor muestra opciones genéricas que no representan
el flujo de producto. Se busca que el acceso sea comprensible y limitado a las
alternativas aprobadas por cada actor.

## Decisión propuesta

### AUTH-FLOW-002-01 — Portal de clientes

La pantalla propia de PIGAR mostrará exclusivamente **“Recibir código por
email”**. La opción inicia la conexión Auth0 de OTP email exacta, sin presentar
la selección genérica del Universal Login. El flujo usa un código OTP email, no
contraseña ni magic link.

No habrá en PIGAR una pantalla, enlace ni campos de registro, contraseña,
Google, Apple, teléfono, SMS o WhatsApp. Después de verificar el código email,
Auth0 puede crear técnicamente la identidad si es la primera vez; para el
cliente esto es ingreso al portal, no un proceso visible de registro. Google
queda fuera del MVP y sólo se reconsiderará antes de producción con aprobación
y validación no productiva separadas.

### AUTH-FLOW-002-02 — Acceso interno

Administradores y personal interno autorizado usarán una identidad de base de
datos de Auth0, creada o habilitada por un **ADMIN** de PIGAR. El inicio de
sesión tendrá usuario o email y contraseña, seguido de MFA TOTP obligatorio.

No estarán disponibles para el backoffice Google, OTP por email, registro
público ni recuperación que permita crear una cuenta sin mediación
administrativa. PIGAR no recibe ni almacena contraseñas: la pantalla de
credenciales y su recuperación segura permanecen en Auth0.

El alta inicial de un ADMIN se realiza fuera de banda y queda documentada como
procedimiento operativo. Las altas posteriores se solicitan en el backoffice,
mediante el adaptador Auth0 Management API, y se registran con auditoría.

Esta decisión reemplazaría el modelo actualmente aprobado de invitación mediante
Auth0 Organizations. No se eliminará ni alterará la configuración existente
hasta completar la migración y verificar el acceso del ADMIN inicial.

### AUTH-FLOW-002-03 — Operarios

El alcance aprobado del MVP no contiene cuentas, sesiones ni portal para
operarios/técnicos. Por lo tanto, esta enmienda mantiene al operario sin acceso
en `feat-002`.

Si se desea que el operario inicie sesión con usuario y contraseña, debe abrirse
una feature posterior: implica habilitar actor, permisos, pantallas, amenazas y
pruebas que hoy están explícitamente fuera de alcance.

## Requisitos que sustituirían al aprobarse

| ID propuesto | Requisito verificable |
| --- | --- |
| REQ-002-001A | El portal cliente ofrece sólo OTP por email desde una pantalla propia e inicia la conexión Auth0 exacta. |
| REQ-002-001B | El portal cliente no expone registro, contraseña, Google, Apple, teléfono, SMS ni WhatsApp. |
| REQ-002-001C | El backoffice admite exclusivamente identidades Auth0 de base de datos creadas/habilitadas por ADMIN, con contraseña y MFA TOTP. |
| REQ-002-004A | Un ADMIN puede aprovisionar, asignar rol, desactivar y recuperar acceso interno mediante el adaptador Auth0, con auditoría e idempotencia. |
| REQ-002-004B | No existe identidad ni acceso autenticado de operario en este incremento. |

## Criterios de aceptación propuestos

| ID | Criterio |
| --- | --- |
| AC-002-001A | Una persona cliente recibe y valida un OTP por email; no se le solicita contraseña ni registro visible. |
| AC-002-001B | La pantalla de acceso de cliente muestra sólo OTP email y no muestra Google. |
| AC-002-002A | Una persona interna preaprovisionada inicia con usuario/email y contraseña, completa MFA TOTP y accede según su rol local. |
| AC-002-002B | Un visitante no puede crear una cuenta interna ni usar Google/OTP de cliente en el backoffice. |
| AC-002-002C | Un operario/técnico no puede autenticarse ni acceder a rutas o API protegidas. |

## Impacto técnico y operativo

- Se reemplazará la ruta interna basada en `invitation` y `organization` por un
  flujo de cuentas internas aprovisionadas. La API y su contrato cambiarán de
  “invitación” a “aprovisionamiento” una vez aprobada la enmienda.
- El acceso OTP email se inicia desde PIGAR para evitar que el Universal Login
  genérico exponga alternativas no deseadas. Google queda fuera del MVP y será
  materia de revisión antes de producción. Las credenciales internas seguirán
  siendo hospedadas por Auth0.
- Antes de migrar se conservará una vía de recuperación para el ADMIN inicial,
  se probará el rollback y no se deshabilitará el flujo existente hasta que el
  nuevo esté verificado en staging.
- Se actualizarán ADR-003, requisitos, diseño, contrato, tareas, plan de
  pruebas y evidencia antes de escribir código o modificar Auth0.

## Decisiones que requieren confirmación humana

1. Aprobar el reemplazo de invitaciones Auth0 Organizations por cuentas internas
   aprovisionadas por un ADMIN.
2. Confirmar que **operario** continúa sin cuenta en el MVP, como recomienda el
   alcance actual, o abrir una nueva feature para él.
3. Confirmar que la recuperación de contraseña interna se permite sólo para una
   cuenta ya aprovisionada y no constituye registro público.

## Estado de sistemas externos

No se realizaron cambios en Auth0, Hostinger ni staging al redactar esta
enmienda.
