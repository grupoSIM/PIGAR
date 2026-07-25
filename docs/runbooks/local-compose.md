# Entorno Compose local

Este entorno crea dos redes: `edge` para Nginx y sus upstreams, y `backend`
interna para API, worker y PostgreSQL. Solo Nginx publica un puerto del host.
PostgreSQL y el volumen multimedia no tienen puertos ni rutas públicas.

## Inicio local

Desde la raíz:

```powershell
docker compose -f infra/compose/docker-compose.yml up --build -d
docker compose -f infra/compose/docker-compose.yml ps
```

El acceso local queda limitado a `http://127.0.0.1:8088/` y el backoffice a
`http://127.0.0.1:8088/admin`. La API se consume solo a través de
`http://127.0.0.1:8088/api/`; no publicar ni usar puertos directos para ella,
PostgreSQL, worker o multimedia.

## Verificación y detención

```powershell
Invoke-WebRequest http://127.0.0.1:8088/health/live
Invoke-WebRequest http://127.0.0.1:8088/api/health/ready
docker compose -f infra/compose/docker-compose.yml down
```

`down` conserva los volúmenes nombrados. Para borrar datos locales sintéticos
de forma explícita, ejecutar `docker compose -f infra/compose/docker-compose.yml down -v`.

Si `8088` está ocupado, elegir otro puerto sin publicar servicios internos:
`$env:PIGAR_HTTP_PORT = "8090"` antes de levantar Compose.

## VPS y producción

El archivo base no configura TLS ni publica el puerto fuera de loopback. Antes
de cualquier despliegue productivo se requiere una configuración aprobada que
exponga Nginx con TLS, certificados y renovación; cifrado en reposo verificable;
backup externo cifrado y restauración probada. El valor de contraseña incluido
solo permite el entorno local de desarrollo y debe sustituirse por una variable
secreta fuera del repositorio.

No hay alta disponibilidad: un único VPS sigue siendo un punto único de falla.
