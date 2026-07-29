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

1. Elegir el hash completo de una revisión publicada y aprobada en GitHub cuya
   ejecución `publish-staging-images` haya terminado correctamente.
2. Confirmar una única vez que los paquetes `pigar-app` y `pigar-nginx` de
   `grupoSIM` sean públicos en GitHub Packages. Hostinger debe poder descargarlos
   sin credenciales de GitHub.
3. En Docker Manager, usar **Compose → Compose from URL** con la URL raw del
   archivo `infra/hostinger/docker-compose.traefik.yml` de esa misma revisión.
4. Nombrar el proyecto `pigar-staging`.
5. Desplegar: esta primera operación inicia exclusivamente el contenedor
   `bootstrap`, sin PIGAR, PostgreSQL, builds ni puertos publicados.
6. En **Administrar → Editor .yaml**, reemplazar el Compose bootstrap por la
   configuración final: usar las imágenes GHCR con el SHA elegido, eliminar los
   perfiles `app`, fijar el FQDN de staging y completar las credenciales
   sintéticas directamente en el editor. Esos valores quedan sólo en la
   configuración del proyecto en Hostinger; nunca se copian a Git ni a este
   runbook. Usar el mismo secreto URL-safe para PostgreSQL y `DATABASE_URL`.
   Cargar además las variables `PIGAR_*_AUTH0_*` del ejemplo
   `infra/hostinger/docker-manager.env.example`: API, cliente, backoffice y
   cliente técnico de invitaciones son credenciales separadas. La audiencia es
   la misma API de staging para los dos clientes web. No revelar ni registrar
   los secretos de cliente/sesión en la vista previa, logs o capturas.
7. Aplicar **Desplegar**: Hostinger descarga las imágenes e inicia PIGAR. No
   debe compilar código en el VPS.
8. Revisar que el servicio `nginx` tenga las etiquetas `traefik.*`, no tenga
   `ports:` y que PostgreSQL/API/worker tampoco expongan puertos.
9. Usar la vista previa YAML y desplegar solo después de la aprobación explícita
   de ejecución.

### Proyecto ya existente

Si `pigar-staging` ya figura como `Funcionando`, no crear otro proyecto ni
usar acciones destructivas. Abrir **Administrar**, revisar el SHA de las
imágenes y editar únicamente el YAML/entorno del proyecto existente. En
Docker Manager la aplicación de esas modificaciones ocurre con
**Desplegar** y reinicia o actualiza los servicios: requiere una autorización
explícita de despliegue, aun cuando sólo se agreguen variables de entorno.

El SHA de la URL raw y `PIGAR_IMAGE_TAG` deben ser el mismo. Docker Manager usa
el primero para obtener la configuración y el segundo para descargar las
imágenes OCI inmutables desde GHCR. GitHub Actions no conoce ni usa acceso al
VPS.

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
anterior, usar la URL raw y `PIGAR_IMAGE_TAG` con el mismo SHA previo aprobado,
aplicar **Update** y repetir los smoke tests. Este rollback no sustituye backups
ni restauración productiva.

## Prohibiciones

- No usar este runbook para producción.
- No configurar secretos reales, pagos reales ni datos personales.
- No ejecutar `docker compose down -v` en el VPS sin autorización explícita y
  verificación de los volúmenes exactos.
- No habilitar deploy automático desde GitHub Actions en esta feature.
