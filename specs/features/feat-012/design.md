# Diseño — feat-012: Staging técnico en Hostinger

## Topología objetivo

El VPS de Hostinger ejecutará la topología existente de `infra/compose/docker-compose.yml` como entorno de staging:

```text
Internet -> DNS de staging -> Traefik (HTTPS) -> Nginx de PIGAR -> customer-web | admin-web | API
                                                                   |
                                                      red privada -> worker + PostgreSQL
                                                                   |
                                                      volúmenes privados -> PostgreSQL + multimedia
```

Traefik será el único proyecto que publica los puertos 80/443 en el VPS. El Nginx de PIGAR queda como proxy interno del stack; la API, worker, PostgreSQL y rutas físicas de multimedia permanecen en redes no públicas.

## Decisión de staging

STG-012-001: el usuario eligió el Traefik administrado por Hostinger el 2026-07-25 para el HTTPS de staging. Esta elección no aplica a producción y no habilita despliegue automático.

STG-012-002: el usuario aprobó GitHub Container Registry (GHCR) el 2026-07-25 para distribuir imágenes inmutables de staging. GitHub Actions publica las imágenes sólo después de la calidad exitosa; Hostinger las descarga durante una actualización manual y no recibe credenciales de GitHub.

## Operación prevista

1. GitHub Actions publica en GHCR las imágenes `pigar-app` y `pigar-nginx`, etiquetadas con el SHA completo, después de validar calidad.
2. Crear en Docker Manager el proyecto bootstrap desde la revisión Git aprobada; no inicia PIGAR, PostgreSQL ni expone rutas.
3. Cargar en Docker Manager la configuración de staging fuera de Git, incluido el secreto aleatorio, `COMPOSE_PROFILES=app` y el mismo SHA en `PIGAR_IMAGE_TAG`.
4. Aplicar **Update** para descargar/iniciar el perfil `app` y esperar healthchecks.
5. Usar las etiquetas/HTTPS de Traefik únicamente tras contar con el subdominio y control DNS aprobados.
6. Ejecutar smoke tests HTTPS y pruebas negativas de superficie/red.
7. Registrar hash de revisión, resultados y procedimiento de rollback en `evidence.md`.

## Controles de seguridad

- No registrar valores de `DATABASE_URL`, secretos de firma, tokens, IPs privadas ni rutas físicas privadas.
- Usar solo credenciales no productivas y datos sintéticos.
- No exponer PostgreSQL, API, worker ni filesystem multimedia al host público.
- TLS, firewall y acceso SSH se validan según los datos que entregue el usuario; no se cambia DNS ni se acepta una huella de host sin su autorización operativa. Traefik gestiona el certificado de staging mediante su resolvedor Let’s Encrypt.

## Rollback

El rollback de staging consistirá en detener la revisión nueva y volver a levantar la revisión Git anterior documentada, preservando volúmenes de staging. Si una migración futura fuera irreversible, requerirá una decisión y plan de reversión propios; esta feature no introduce migraciones de negocio.

## Criterios de salida

El entorno puede estar listo para pruebas del equipo, pero no se declara producción ni se habilita para datos reales. Los bloqueantes de producción de `progress/current.yaml` continúan vigentes.
