CREATE TYPE "RequestCompleteness" AS ENUM ('MEDIA_REQUIRED', 'READY_FOR_OPERATION');
CREATE TYPE "RequestMediaKind" AS ENUM ('IMAGE', 'VIDEO');

CREATE TABLE "service_request" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "clientProfileId" UUID NOT NULL,
  "idempotencyKey" VARCHAR(160) NOT NULL, "description" VARCHAR(2000) NOT NULL,
  "completeness" "RequestCompleteness" NOT NULL DEFAULT 'MEDIA_REQUIRED',
  "categoryId" UUID NOT NULL, "categoryName" VARCHAR(120) NOT NULL, "categoryScope" VARCHAR(1000) NOT NULL,
  "zoneId" UUID NOT NULL, "zoneName" VARCHAR(120) NOT NULL, "currency" CHAR(3) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL, "rateVersion" INTEGER NOT NULL,
  "rateValidFrom" TIMESTAMPTZ(3) NOT NULL, "rateValidUntil" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "service_request_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "service_request_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "service_request_money_check" CHECK ("currency" = 'ARS' AND "amount" > 0),
  CONSTRAINT "service_request_rate_validity_check" CHECK ("rateValidUntil" IS NULL OR "rateValidUntil" > "rateValidFrom")
);
CREATE UNIQUE INDEX "service_request_clientProfileId_idempotencyKey_key" ON "service_request"("clientProfileId", "idempotencyKey");
CREATE INDEX "service_request_clientProfileId_createdAt_idx" ON "service_request"("clientProfileId", "createdAt");

CREATE TABLE "request_address" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "requestId" UUID NOT NULL, "street" VARCHAR(160) NOT NULL,
  "number" VARCHAR(32) NOT NULL, "neighborhood" VARCHAR(120), "crossStreetOne" VARCHAR(160), "crossStreetTwo" VARCHAR(160),
  "normalizedAddress" VARCHAR(500), "latitude" DECIMAL(9,6), "longitude" DECIMAL(9,6),
  CONSTRAINT "request_address_pkey" PRIMARY KEY ("id"), CONSTRAINT "request_address_requestId_key" UNIQUE ("requestId"),
  CONSTRAINT "request_address_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "service_request"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "request_address_coordinates_check" CHECK (("latitude" IS NULL) = ("longitude" IS NULL))
);

CREATE TABLE "request_media" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "requestId" UUID NOT NULL, "kind" "RequestMediaKind" NOT NULL,
  "physicalName" VARCHAR(180) NOT NULL, "detectedMime" VARCHAR(120) NOT NULL, "bytes" BIGINT NOT NULL,
  "checksum" VARCHAR(128) NOT NULL, "durationSeconds" INTEGER, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "request_media_pkey" PRIMARY KEY ("id"), CONSTRAINT "request_media_physicalName_key" UNIQUE ("physicalName"),
  CONSTRAINT "request_media_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "service_request"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "request_media_bytes_check" CHECK ("bytes" > 0),
  CONSTRAINT "request_media_duration_check" CHECK (("kind" = 'VIDEO' AND "durationSeconds" BETWEEN 1 AND 30) OR ("kind" = 'IMAGE' AND "durationSeconds" IS NULL))
);
CREATE INDEX "request_media_requestId_kind_idx" ON "request_media"("requestId", "kind");
