# Migraciones técnicas iniciales

La migración `0001_technical_foundations` crea exclusivamente tablas de soporte:
`outbox_event`, `claimed_job`, `provider_event_receipt` y `media_poc_object`.

`20260831090000_feat_009_transactional_notifications` es aditiva y forward-only:
agrega el lease al outbox y la proyección `transactional_notification` con FKs
RESTRICT, unicidad fuente/destinatario e índices de bandeja/no leídos. Un rollback
de aplicación conserva filas; cualquier corrección posterior debe ser forward-fix.
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

La migración `20260814090000_operational_orders` es aditiva: crea técnicos,
órdenes, reservas idempotentes e historial append-only. El forward-fix ante un
defecto es otra migración aditiva; no se eliminan órdenes, transiciones ni
técnicos históricos. Una restauración exige un backup verificado y aprobación
de producción.

Las migraciones de feat-007 son igualmente forward-only. La primera incorpora
resolución, cargo, intentos, conformidad y transiciones de pago; la migración
`20260827100000_feat_007_payment_attempt_hardening` agrega la protección parcial
de PostgreSQL que impide más de un intento activo por cargo. Un rollback de
aplicación debe seguir tolerando tablas y estados nuevos; una corrección se hace
con otra migración aditiva, sin borrar evidencia comercial.
