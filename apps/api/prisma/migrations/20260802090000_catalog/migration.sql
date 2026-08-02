-- feat-003: catálogo versionado. La reversión es un forward-fix: retirar o
-- publicar otra tarifa; nunca borrar ni reescribir una tarifa histórica.
CREATE TYPE "CatalogPublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');
CREATE TYPE "CoverageZoneStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE "service_category" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "scopeDescription" VARCHAR(1000) NOT NULL,
    "status" "CatalogPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "service_category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "coverage_zone" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "status" "CoverageZoneStatus" NOT NULL DEFAULT 'INACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "coverage_zone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_rate" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "zoneId" UUID NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "validFrom" TIMESTAMPTZ(3) NOT NULL,
    "validUntil" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL,
    "status" "CatalogPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "service_rate_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "service_rate_amount_positive" CHECK ("amount" > 0),
    CONSTRAINT "service_rate_currency_ars" CHECK ("currency" = 'ARS'),
    CONSTRAINT "service_rate_validity" CHECK ("validUntil" IS NULL OR "validUntil" > "validFrom"),
    CONSTRAINT "service_rate_version_positive" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "service_category_name_key" ON "service_category"("name");
CREATE INDEX "service_category_status_idx" ON "service_category"("status");
CREATE UNIQUE INDEX "coverage_zone_name_key" ON "coverage_zone"("name");
CREATE INDEX "coverage_zone_status_idx" ON "coverage_zone"("status");
CREATE UNIQUE INDEX "coverage_zone_single_active" ON "coverage_zone"("status") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "service_rate_categoryId_zoneId_version_key" ON "service_rate"("categoryId", "zoneId", "version");
CREATE INDEX "service_rate_categoryId_zoneId_status_validFrom_idx" ON "service_rate"("categoryId", "zoneId", "status", "validFrom");
ALTER TABLE "service_rate" ADD CONSTRAINT "service_rate_no_published_validity_overlap"
  EXCLUDE USING gist (
    "categoryId" WITH =,
    "zoneId" WITH =,
    tstzrange("validFrom", COALESCE("validUntil", 'infinity'::timestamptz), '[)') WITH &&
  ) WHERE ("status" = 'PUBLISHED');

ALTER TABLE "service_rate" ADD CONSTRAINT "service_rate_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "service_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_rate" ADD CONSTRAINT "service_rate_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "coverage_zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed sintético e idempotente del único catálogo MVP. No contiene PII,
-- domicilio ni coordenadas.
INSERT INTO "coverage_zone" ("id", "name", "status", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000301', 'Zona única MVP', 'ACTIVE', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "service_category" ("id", "name", "description", "scopeDescription", "status", "updatedAt")
VALUES (
  '00000000-0000-4000-8000-000000000302',
  'Visita Simple',
  'Diagnóstico y visita para resolver arreglos informados por el cliente.',
  'Incluye la visita, el diagnóstico y arreglos completables conforme a lo informado. Si excede el alcance, la visita se cobra y el resto requiere presupuesto posterior.',
  'PUBLISHED',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "service_rate" ("id", "categoryId", "zoneId", "currency", "amount", "validFrom", "version", "status", "updatedAt")
VALUES (
  '00000000-0000-4000-8000-000000000303',
  '00000000-0000-4000-8000-000000000302',
  '00000000-0000-4000-8000-000000000301',
  'ARS', 50000.00, CURRENT_TIMESTAMP, 1, 'PUBLISHED', CURRENT_TIMESTAMP
)
ON CONFLICT ("categoryId", "zoneId", "version") DO NOTHING;
