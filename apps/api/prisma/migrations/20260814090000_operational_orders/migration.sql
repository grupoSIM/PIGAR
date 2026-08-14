CREATE TYPE "TechnicianStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "WorkOrderState" AS ENUM ('SOLICITADA', 'TECNICO_ASIGNADO', 'EN_CAMINO', 'EN_ATENCION', 'TRABAJO_FINALIZADO', 'CANCELADA');

CREATE TABLE "technician" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "fullName" VARCHAR(160) NOT NULL,
  "phone" VARCHAR(32), "status" "TechnicianStatus" NOT NULL DEFAULT 'INACTIVE',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "technician_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "technician_active_phone_check" CHECK ("status" <> 'ACTIVE' OR "phone" IS NOT NULL)
);
CREATE INDEX "technician_status_idx" ON "technician"("status");

CREATE TABLE "work_order" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "requestId" UUID NOT NULL, "technicianId" UUID,
  "state" "WorkOrderState" NOT NULL DEFAULT 'SOLICITADA', "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "work_order_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_requestId_key" UNIQUE ("requestId"),
  CONSTRAINT "work_order_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "service_request"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "work_order_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technician"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "work_order_version_check" CHECK ("version" >= 0)
);
CREATE INDEX "work_order_state_updatedAt_idx" ON "work_order"("state", "updatedAt");

CREATE TABLE "work_order_transition" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "workOrderId" UUID NOT NULL, "actorProfileId" UUID NOT NULL,
  "technicianId" UUID, "action" VARCHAR(60) NOT NULL, "fromState" "WorkOrderState" NOT NULL,
  "toState" "WorkOrderState" NOT NULL, "reason" VARCHAR(500), "version" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_transition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_transition_order_version_key" UNIQUE ("workOrderId", "version"),
  CONSTRAINT "work_order_transition_order_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "work_order_transition_actor_fkey" FOREIGN KEY ("actorProfileId") REFERENCES "profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "work_order_transition_technician_fkey" FOREIGN KEY ("technicianId") REFERENCES "technician"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "work_order_transition_order_createdAt_idx" ON "work_order_transition"("workOrderId", "createdAt");

CREATE TABLE "assignment_idempotency" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "actorProfileId" UUID NOT NULL, "idempotencyKey" VARCHAR(160) NOT NULL,
  "requestId" UUID NOT NULL, "technicianId" UUID NOT NULL, "workOrderId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assignment_idempotency_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assignment_idempotency_actor_key" UNIQUE ("actorProfileId", "idempotencyKey"),
  CONSTRAINT "assignment_idempotency_actor_fkey" FOREIGN KEY ("actorProfileId") REFERENCES "profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "assignment_idempotency_order_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "assignment_idempotency_request_idx" ON "assignment_idempotency"("requestId");

CREATE FUNCTION prevent_work_order_transition_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'work_order_transition is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER work_order_transition_append_only
BEFORE UPDATE OR DELETE ON "work_order_transition"
FOR EACH ROW EXECUTE FUNCTION prevent_work_order_transition_mutation();
