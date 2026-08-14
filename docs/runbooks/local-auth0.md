# Pruebas manuales locales con Auth0

## Convención obligatoria de puertos

Las pruebas manuales de identidad y funcionalidad local usan siempre estos
orígenes; no se cambian según el orden de arranque:

| Superficie     | URL canónica                | Uso Auth0                           |
| -------------- | --------------------------- | ----------------------------------- |
| Cliente        | `http://localhost:3000`     | callback y logout de cliente        |
| Administración | `http://localhost:3002`     | callback y logout de administración |
| API            | `http://127.0.0.1:3001/api` | sólo consumo de los portales        |

Auth0 debe registrar exactamente los callbacks, logout URLs y web origins no
productivos que correspondan a `http://localhost:3000` y
`http://localhost:3002`. No usar `8088` para las pruebas manuales autenticadas.

Las descargas de adjuntos desde el backoffice son la excepción: el enlace abre
`localhost:8088` internamente, porque Nginx entrega el archivo privado después
de que el backoffice autorizó la consulta. Los callbacks y el resto de la
sesión administrativa continúan en `localhost:3002`.

## Arranque

1. Copiar `.env.example` a `.env` y completar únicamente las credenciales no
   productivas necesarias. No versionar ese archivo.
2. Para probar el conjunto completo con los servicios internos de Compose,
   levantar el override local de Auth0:

   ```powershell
   docker compose --env-file .env -f infra/compose/docker-compose.yml -f infra/compose/docker-compose.auth0-local.yml up --build -d
   ```

   Quedan publicados únicamente los dos portales en loopback; API, PostgreSQL,
   worker y multimedia siguen en redes privadas. También queda disponible Nginx
   en `8088` exclusivamente para smoke/integración.

3. Como alternativa de desarrollo de los portales, construir e iniciar la API
   en una terminal:

   ```powershell
   pnpm --filter @pigar/api build
   pnpm --filter @pigar/api start:local
   ```

4. Iniciar cada portal en terminales separadas:

   ```powershell
   pnpm --filter @pigar/customer-web dev:local
   pnpm --filter @pigar/admin-web dev:local
   ```

Los comandos fijan los puertos y el host loopback. Si uno ya está ocupado, el
comando debe fallar: no aceptar el puerto alternativo que ofrece Next, porque
no estaría autorizado por la configuración de Auth0.

## Compose local

`infra/compose/docker-compose.yml` publica sólo Nginx en
`http://127.0.0.1:8088`. Es un entorno integrado para smoke tests de redes,
migraciones y healthchecks; no sustituye la convención anterior ni se usa para
login manual con Auth0. Mantener esa separación evita callbacks inconsistentes
y no publica API, PostgreSQL, worker o multimedia directamente.
