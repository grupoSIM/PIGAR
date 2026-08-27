ALTER TYPE "WorkOrderState" ADD VALUE IF NOT EXISTS 'PENDIENTE_PAGO';
ALTER TYPE "WorkOrderState" ADD VALUE IF NOT EXISTS 'PENDIENTE_CONFORMIDAD';
ALTER TYPE "WorkOrderState" ADD VALUE IF NOT EXISTS 'CERRADA';
ALTER TABLE "work_order_transition" ALTER COLUMN "actorProfileId" DROP NOT NULL;
CREATE TYPE "PaymentAttemptState" AS ENUM ('CREATED', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "ChargeResolutionOutcome" AS ENUM ('RESUELTO_EN_VISITA', 'REQUIERE_PRESUPUESTO');

CREATE TABLE "resolution" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "workOrderId" UUID NOT NULL,
  "outcome" "ChargeResolutionOutcome" NOT NULL, "summary" VARCHAR(500) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "resolution_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "resolution_workOrderId_key" UNIQUE ("workOrderId"),
  CONSTRAINT "resolution_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "resolution_command" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "actorProfileId" UUID NOT NULL,
  "idempotencyKey" VARCHAR(160) NOT NULL, "workOrderId" UUID NOT NULL,
  "payloadHash" CHAR(64) NOT NULL, "resolutionId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "resolution_command_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "resolution_command_actor_key" UNIQUE ("actorProfileId", "idempotencyKey"),
  CONSTRAINT "resolution_command_resolution_key" UNIQUE ("resolutionId"),
  CONSTRAINT "resolution_command_actor_fkey" FOREIGN KEY ("actorProfileId") REFERENCES "profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "resolution_command_resolution_fkey" FOREIGN KEY ("resolutionId") REFERENCES "resolution"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "charge" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "workOrderId" UUID NOT NULL,
  "categoryName" VARCHAR(120) NOT NULL, "offerVersion" INTEGER NOT NULL,
  "currency" CHAR(3) NOT NULL, "amount" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "charge_pkey" PRIMARY KEY ("id"), CONSTRAINT "charge_workOrderId_key" UNIQUE ("workOrderId"),
  CONSTRAINT "charge_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "charge_currency_check" CHECK ("currency" = 'ARS'), CONSTRAINT "charge_amount_check" CHECK ("amount" > 0)
);
CREATE TABLE "payment_attempt" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "chargeId" UUID NOT NULL,
  "externalReference" VARCHAR(100) NOT NULL, "checkoutUrl" VARCHAR(2048), "providerPaymentIdHash" CHAR(64),
  "state" "PaymentAttemptState" NOT NULL DEFAULT 'CREATED', "sequence" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "checkedAt" TIMESTAMPTZ(3),
  CONSTRAINT "payment_attempt_pkey" PRIMARY KEY ("id"), CONSTRAINT "payment_attempt_externalReference_key" UNIQUE ("externalReference"),
  CONSTRAINT "payment_attempt_charge_sequence_key" UNIQUE ("chargeId", "sequence"),
  CONSTRAINT "payment_attempt_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "charge"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "payment_attempt_state_checkedAt_idx" ON "payment_attempt"("state", "checkedAt");
CREATE TABLE "conformity" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "chargeId" UUID NOT NULL, "clientProfileId" UUID NOT NULL,
  "textVersion" VARCHAR(60) NOT NULL, "acceptedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conformity_pkey" PRIMARY KEY ("id"), CONSTRAINT "conformity_chargeId_key" UNIQUE ("chargeId"),
  CONSTRAINT "conformity_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "charge"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "conformity_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- Los hechos de resolución, cargo y conformidad son evidencia de negocio:
-- las correcciones se expresan como nuevos hechos, nunca sobrescribiendo éstos.
CREATE OR REPLACE FUNCTION prevent_append_only_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'append-only record cannot be modified';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER resolution_append_only BEFORE UPDATE OR DELETE ON "resolution"
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER charge_append_only BEFORE UPDATE OR DELETE ON "charge"
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER conformity_append_only BEFORE UPDATE OR DELETE ON "conformity"
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
