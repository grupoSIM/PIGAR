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
6. En **Administrar → Update**, cargar las variables de
   `infra/hostinger/docker-manager.env.example`. Reemplazar únicamente los
   marcadores de contraseña por un secreto aleatorio URL-safe, generado y
   cargado directamente en Hostinger; nunca compartirlo. Incluir
   `COMPOSE_PROFILES=app` y establecer `PIGAR_IMAGE_TAG` con el hash elegido en
   el paso 1.
7. Aplicar **Update**: recién entonces Hostinger descarga las imágenes e inicia
   PIGAR. No debe compilar código en el VPS.
8. Revisar que el servicio `nginx` tenga las etiquetas `traefik.*`, no tenga
   `ports:` y que PostgreSQL/API/worker tampoco expongan puertos.
9. Usar la vista previa YAML y desplegar solo después de la aprobación explícita
   de ejecución.

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
