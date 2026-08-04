# Evidencia de Pruebas

## Frontend E2E Tests

Comando: `pnpm test:e2e:frontends`

Salida resumida:
```
$ pnpm --filter @pigar/customer-web run test:e2e && pnpm --filter @pigar/admin-web run test:e2e
$ playwright test
[WebServer] $ next dev "--port" "3000" "--hostname" "127.0.0.1"

Running 1 test using 1 worker
[1/1] [chromium] › e2e\home.spec.ts:3:5 › página principal carga y muestra PIGAR
  1 passed (2.7s)

$ playwright test
[WebServer] $ next dev "--port" "3001" "--hostname" "127.0.0.1"

Running 1 test using 1 worker
[1/1] [chromium] › e2e\home.spec.ts:3:5 › página principal de admin carga y muestra PIGAR
  1 passed (2.6s)
```
