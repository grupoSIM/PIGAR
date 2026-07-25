# Migraciones técnicas iniciales

La migración `0001_technical_foundations` crea exclusivamente tablas de soporte:
`outbox_event`, `claimed_job`, `provider_event_receipt` y `media_poc_object`.
No contiene perfiles, solicitudes, órdenes, pagos, ubicaciones, URLs firmadas ni
payloads externos completos.

## Forward

Con `DATABASE_URL` apuntando a PostgreSQL, ejecutar desde la raíz:

```powershell
$env:DATABASE_URL = "postgresql://..."
pnpm --filter @pigar/api prisma:migrate:deploy
```

En desarrollo, para crear una migración nueva (nunca en producción):

```powershell
pnpm --filter @pigar/api exec prisma migrate dev --name nombre_descriptivo
```

## Rollback

Prisma Migrate aplica migraciones hacia adelante y no ejecuta un rollback
automático. Una reversión exige una migración compensatoria revisada (por
ejemplo, para retirar una columna sin perder datos) o restaurar un backup
verificado. Antes de cualquier cambio destructivo se debe exportar y probar la
restauración; el procedimiento completo de backup queda en TASK-015.
