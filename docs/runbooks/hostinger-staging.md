# Staging técnico en Hostinger

Este runbook aplica exclusivamente a `feat-012`. El VPS de Hostinger es un
entorno de testing/staging; no es producción ni debe contener datos, cuentas o
credenciales productivas.

## Puerta previa

Antes de ejecutar cualquier paso remoto, confirmar y registrar fuera del
repositorio:

1. Un subdominio dedicado de staging y quién controla su DNS.
2. Traefik administrado por Hostinger en estado `Funcionando` y sin otro proxy
   ocupando los puertos 80/443.
3. Una ventana de despliegue y las personas autorizadas a usar el entorno.
4. Que todos los valores del proyecto Docker son sintéticos/no productivos y no
   se copiarán a Git, tickets, logs ni conversaciones.

No continuar si alguno de estos puntos falta. No abrir puertos de PostgreSQL,
API, worker ni multimedia.

## Preparación del proyecto en Docker Manager

1. Elegir el hash completo de una revisión publicada y aprobada en GitHub.
2. En Docker Manager, usar **Compose → Compose from URL** con la URL raw del
   archivo `infra/hostinger/docker-compose.traefik.yml` de esa misma revisión.
3. Nombrar el proyecto `pigar-staging`.
4. Cargar como variables de proyecto los nombres de
   `infra/hostinger/docker-manager.env.example`. Reemplazar únicamente los
   marcadores de contraseña por un secreto aleatorio URL-safe, generado y
   cargado directamente en Hostinger; nunca compartirlo.
5. Revisar que el servicio `nginx` tenga las etiquetas `traefik.*`, no tenga
   `ports:` y que PostgreSQL/API/worker tampoco expongan puertos.
6. Usar la vista previa YAML y desplegar solo después de la aprobación explícita
   de ejecución.

El Compose descarga el contexto de build desde el commit aprobado de GitHub.
Esto conserva la reproducibilidad sin requerir un registry de imágenes ni acceso
SSH al VPS.

## DNS y TLS

El FQDN de staging elegido es `pigar.ferchamorro.cloud`; su registro A debe
apuntar al VPS y propagarse antes de emitir el certificado. Traefik toma las
etiquetas del servicio `nginx`, redirige HTTP a HTTPS y solicita/renueva el
certificado mediante su resolvedor Let’s Encrypt.

No continuar ante error de certificado ni aceptar certificados inválidos.

## Pruebas de superficie y recuperación

Ejecutar smoke tests sólo tras HTTPS válido. Confirmar que `/`, `/admin`,
`/health/live` y `/api/health/ready` responden por el FQDN. Desde fuera del
VPS, confirmar que los puertos de PostgreSQL y de los servicios internos no son
accesibles. Usar únicamente marcadores sintéticos para comprobar persistencia.

Para un reinicio controlado, usar **Administrar → reiniciar** sobre el proyecto
`pigar-staging` y luego comprobar
`https://pigar.ferchamorro.cloud/api/health/ready`.

## Actualización y rollback

Antes de actualizar, anotar el hash en ejecución. Para volver a una revisión
anterior, editar las variables del proyecto con el SHA previo aprobado, aplicar
**Update** y repetir los smoke tests. Este rollback no sustituye backups ni
restauración productiva.

## Prohibiciones

- No usar este runbook para producción.
- No configurar secretos reales, pagos reales ni datos personales.
- No ejecutar `docker compose down -v` en el VPS sin autorización explícita y
  verificación de los volúmenes exactos.
- No habilitar deploy automático desde GitHub Actions en esta feature.
