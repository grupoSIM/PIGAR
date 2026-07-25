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

## Operación prevista

1. Preparar un directorio remoto dedicado y una copia de la revisión Git aprobada.
2. Crear configuración de staging fuera de Git con permisos restrictivos.
3. Construir/iniciar Compose y esperar healthchecks.
4. Desplegar el proyecto Traefik de Hostinger y configurar sus etiquetas/HTTPS únicamente tras contar con el subdominio y control DNS aprobados.
5. Ejecutar smoke tests HTTPS y pruebas negativas de superficie/red.
6. Registrar hash de revisión, resultados y procedimiento de rollback en `evidence.md`.

## Controles de seguridad

- No registrar valores de `DATABASE_URL`, secretos de firma, tokens, IPs privadas ni rutas físicas privadas.
- Usar solo credenciales no productivas y datos sintéticos.
- No exponer PostgreSQL, API, worker ni filesystem multimedia al host público.
- TLS, firewall y acceso SSH se validan según los datos que entregue el usuario; no se cambia DNS ni se acepta una huella de host sin su autorización operativa. Traefik gestiona el certificado de staging mediante su resolvedor Let’s Encrypt.

## Rollback

El rollback de staging consistirá en detener la revisión nueva y volver a levantar la revisión Git anterior documentada, preservando volúmenes de staging. Si una migración futura fuera irreversible, requerirá una decisión y plan de reversión propios; esta feature no introduce migraciones de negocio.

## Criterios de salida

El entorno puede estar listo para pruebas del equipo, pero no se declara producción ni se habilita para datos reales. Los bloqueantes de producción de `progress/current.yaml` continúan vigentes.
