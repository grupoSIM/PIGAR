-- feat-010 is additive and forward-only. Application rollback leaves aftercare history intact.
CREATE TYPE "RatingReason" AS ENUM ('CALIDAD_DEL_TRABAJO', 'PUNTUALIDAD', 'TRATO_Y_COMUNICACION', 'CLARIDAD_DEL_PROCESO', 'EXPERIENCIA_GENERAL', 'OTRO');
CREATE TYPE "AftercareIncidentType" AS ENUM ('RESULTADO_NO_ESPERADO', 'PROBLEMA_REAPARECIO', 'TRABAJO_INCOMPLETO', 'DANIO_REPORTADO', 'CONSULTA_SOBRE_COBRO');
CREATE TYPE "AftercareIncidentStatus" AS ENUM ('ABIERTA', 'EN_TRIAGE', 'CERRADA');

CREATE TABLE "order_rating" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "workOrderId" UUID NOT NULL, "clientProfileId" UUID NOT NULL,
  "stars" SMALLINT NOT NULL, "reason" "RatingReason" NOT NULL, "otherMessage" VARCHAR(100),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_rating_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_rating_work_order_key" UNIQUE ("workOrderId"),
  CONSTRAINT "order_rating_stars_check" CHECK ("stars" BETWEEN 1 AND 5),
  CONSTRAINT "order_rating_other_check" CHECK (("reason" = 'OTRO' AND "otherMessage" IS NOT NULL) OR ("reason" <> 'OTRO' AND "otherMessage" IS NULL)),
  CONSTRAINT "order_rating_order_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_order"("id") ON DELETE RESTRICT,
  CONSTRAINT "order_rating_client_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "profile"("id") ON DELETE RESTRICT
);
CREATE INDEX "order_rating_client_created_idx" ON "order_rating" ("clientProfileId", "createdAt" DESC, "id" DESC);

CREATE TABLE "aftercare_incident" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "workOrderId" UUID NOT NULL, "clientProfileId" UUID NOT NULL,
  "type" "AftercareIncidentType" NOT NULL, "status" "AftercareIncidentStatus" NOT NULL DEFAULT 'ABIERTA', "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "closedAt" TIMESTAMPTZ(3),
  CONSTRAINT "aftercare_incident_pkey" PRIMARY KEY ("id"), CONSTRAINT "aftercare_incident_version_check" CHECK ("version" > 0),
  CONSTRAINT "aftercare_incident_order_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_order"("id") ON DELETE RESTRICT,
  CONSTRAINT "aftercare_incident_client_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "profile"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "aftercare_incident_one_active_order" ON "aftercare_incident" ("workOrderId") WHERE "status" IN ('ABIERTA', 'EN_TRIAGE');
CREATE INDEX "aftercare_incident_client_created_idx" ON "aftercare_incident" ("clientProfileId", "createdAt" DESC, "id" DESC);
CREATE INDEX "aftercare_incident_status_created_idx" ON "aftercare_incident" ("status", "createdAt" DESC, "id" DESC);
CREATE UNIQUE INDEX "aftercare_incident_id_version_key" ON "aftercare_incident" ("id", "version");

CREATE TABLE "aftercare_incident_transition" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "incidentId" UUID NOT NULL, "sequence" INTEGER NOT NULL,
  "action" VARCHAR(30) NOT NULL, "fromStatus" "AftercareIncidentStatus", "toStatus" "AftercareIncidentStatus" NOT NULL,
  "actorProfileId" UUID NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "aftercare_incident_transition_pkey" PRIMARY KEY ("id"), CONSTRAINT "aftercare_incident_transition_sequence_key" UNIQUE ("incidentId", "sequence"),
  CONSTRAINT "aftercare_incident_transition_incident_fkey" FOREIGN KEY ("incidentId") REFERENCES "aftercare_incident"("id") ON DELETE RESTRICT,
  CONSTRAINT "aftercare_incident_transition_actor_fkey" FOREIGN KEY ("actorProfileId") REFERENCES "profile"("id") ON DELETE RESTRICT
);

CREATE TABLE "aftercare_idempotency" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "actorProfileId" UUID NOT NULL, "scope" VARCHAR(40) NOT NULL,
  "idempotencyKey" VARCHAR(160) NOT NULL, "payloadHash" CHAR(64) NOT NULL, "resultId" UUID, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "aftercare_idempotency_pkey" PRIMARY KEY ("id"), CONSTRAINT "aftercare_idempotency_actor_scope_key" UNIQUE ("actorProfileId", "scope", "idempotencyKey"),
  CONSTRAINT "aftercare_idempotency_actor_fkey" FOREIGN KEY ("actorProfileId") REFERENCES "profile"("id") ON DELETE RESTRICT
);

CREATE OR REPLACE FUNCTION aftercare_prevent_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'aftercare history is append-only'; END; $$;
CREATE TRIGGER order_rating_append_only BEFORE UPDATE OR DELETE ON "order_rating" FOR EACH ROW EXECUTE FUNCTION aftercare_prevent_history_mutation();
CREATE TRIGGER aftercare_incident_transition_append_only BEFORE UPDATE OR DELETE ON "aftercare_incident_transition" FOR EACH ROW EXECUTE FUNCTION aftercare_prevent_history_mutation();
