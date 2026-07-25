# Evidencia — feat-012: Staging técnico en Hostinger

Estado: implementación habilitada por aprobación de especificación del usuario el 2026-07-25. No se realizó acceso al VPS, cambio DNS, despliegue ni carga de datos.

## Registro de comandos

| Fecha | Comando | Resultado | Alcance/notas |
|---|---|---|---|
| Pendiente | — | — | La ejecución comienza únicamente tras aprobación de la especificación y entrega segura de datos operativos. |
| 2026-07-25 | `docker compose -f infra/compose/docker-compose.yml config --quiet && pnpm docs:check` | pass | TASK-012-001: Compose validó la interpolación con defaults locales y la documentación fue consistente. Docker informó que el sandbox no puede leer su configuración de usuario, sin impedir la validación. La configuración de PostgreSQL quedó parametrizada y Compose conserva Nginx en loopback; DNS/TLS/acceso remoto siguen como puerta explícita. |
| 2026-07-25 | Revisión de `infra/hostinger/staging.env.example` y `docs/runbooks/hostinger-staging.md` | pass | TASK-012-002: plantilla sin secretos, uso obligatorio de archivo `0600` fuera de Git, secretos URL-safe y prohibición explícita de datos/cuentas productivas. |
| 2026-07-25 | `docker compose -f infra/hostinger/docker-compose.traefik.yml config --quiet` con valores sintéticos | pass | Variante autónoma validada: build remoto fijado por SHA, labels Traefik, sin puertos publicados por PIGAR y redes privadas para backend. Docker informó que el sandbox no puede leer su configuración de usuario, sin impedir la validación. |
| 2026-07-25 | `docker compose -f infra/hostinger/docker-compose.traefik.yml config --quiet` con valores sintéticos, tras usar `context: ../..` | pass | Corrección de compatibilidad con Compose from URL: Docker Manager ya clona el repositorio en el SHA de la URL raw antes de interpretar el Compose. El archivo ya no requiere `PIGAR_DEPLOY_REF` durante la creación inicial. Docker informó que el sandbox no puede leer su configuración de usuario, sin impedir la validación. |
| 2026-07-25 | `pnpm docs:check` | pass | El runbook y la plantilla de variables se actualizaron para fijar la revisión por la URL raw del Compose, sin requerir una variable de SHA en Docker Manager. |
| 2026-07-25 | `docker compose -f infra/hostinger/docker-compose.traefik.yml config --quiet` sin variables y con `COMPOSE_PROFILES=app` más valores sintéticos; `pnpm docs:check` | pass | Corrección para el flujo de Docker Manager: sin variables sólo queda el servicio `bootstrap`; con el perfil `app` y configuración sintética, el stack completo valida. No se introdujeron valores secretos por defecto. Docker informó que el sandbox no puede leer su configuración de usuario, sin impedir la validación. |
| 2026-07-25 | `docker compose -f infra/hostinger/docker-compose.traefik.yml config --quiet` con y sin perfil; `pnpm format:check`; `pnpm docs:check`; `pnpm test:ci-contract`; `docker build` de `app.Dockerfile` y `nginx.Dockerfile` | pass | STG-012-002: Compose valida referencias inmutables a GHCR sin builds remotos; las dos imágenes construyen localmente y el contrato CI mantiene las categorías bloqueantes. El workflow publicará sólo después de calidad exitosa y no contiene credenciales de Hostinger. Docker informó que el sandbox no puede leer su configuración de usuario, sin impedir la validación. |
| 2026-07-25 | GitHub Actions `quality` 30173957426 y `publish-staging-images` 30174073936; consulta anónima de manifests de `pigar-app` y `pigar-nginx` | pass | La calidad y la primera publicación GHCR del SHA `ebea94d6809d9bf09e210d2957cd24137c930a0d` finalizaron correctamente. Ambos manifests respondieron `200` con token de pull anónimo, por lo que Hostinger no requiere credenciales de GitHub. |

## Publicación y despliegue

- La autorización de publicación de `feat-001` no autoriza el despliegue de esta feature.
- Cualquier despliegue en Hostinger requiere aprobación explícita de ejecución, acceso operativo entregado fuera del repositorio y evidencia sanitizada.
- Este entorno es exclusivamente testing/staging; no constituye producción.

## Decisiones de staging

- STG-012-001: el usuario eligió Traefik administrado por Hostinger para HTTPS y enrutamiento de staging el 2026-07-25. La inspección del proyecto existente `hermes-agent-oixa` confirmó que no publica 80/443 y ya usa etiquetas de Traefik; no se realizó aún el despliegue de Traefik.
- STG-012-002: el usuario aprobó GHCR el 2026-07-25 para imágenes inmutables de staging. No habilita despliegue automático ni otorga acceso de GitHub al VPS.
- La primera publicación de GHCR para el SHA `ebea94d6809d9bf09e210d2957cd24137c930a0d` finalizó correctamente. La consulta API de visibilidad requirió un alcance local `read:packages` no concedido, pero ambos manifests respondieron `200` mediante pull anónimo, equivalente al acceso de Hostinger. Se actualiza `docker/setup-buildx-action` a v4 para eliminar su warning de Node 20.
