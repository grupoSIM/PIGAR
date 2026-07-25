-- CreateEnum
CREATE TYPE "ProcessingState" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "ValidationState" AS ENUM ('RECEIVED', 'VALID', 'INVALID');

-- CreateEnum
CREATE TYPE "MediaPocState" AS ENUM ('PENDING', 'AVAILABLE', 'REJECTED', 'EXPIRED', 'DELETED');

-- CreateTable
CREATE TABLE "outbox_event" (
    "id" UUID NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "version" INTEGER NOT NULL,
    "aggregateType" VARCHAR(60),
    "aggregateId" VARCHAR(100),
    "payload" JSONB,
    "state" "ProcessingState" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "outbox_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claimed_job" (
    "id" UUID NOT NULL,
    "jobType" VARCHAR(100) NOT NULL,
    "idempotencyKey" VARCHAR(160) NOT NULL,
    "state" "ProcessingState" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseExpiresAt" TIMESTAMPTZ(3),
    "lastSafeError" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "claimed_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_event_receipt" (
    "id" UUID NOT NULL,
    "provider" VARCHAR(60) NOT NULL,
    "externalEventIdHash" VARCHAR(128) NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "validationState" "ValidationState" NOT NULL DEFAULT 'RECEIVED',
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_event_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_poc_object" (
    "id" UUID NOT NULL,
    "physicalName" VARCHAR(180) NOT NULL,
    "detectedMime" VARCHAR(120) NOT NULL,
    "bytes" BIGINT NOT NULL,
    "checksum" VARCHAR(128) NOT NULL,
    "state" "MediaPocState" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "media_poc_object_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbox_event_state_availableAt_idx" ON "outbox_event"("state", "availableAt");

-- CreateIndex
CREATE INDEX "claimed_job_state_availableAt_idx" ON "claimed_job"("state", "availableAt");

-- CreateIndex
CREATE UNIQUE INDEX "claimed_job_jobType_idempotencyKey_key" ON "claimed_job"("jobType", "idempotencyKey");

-- CreateIndex
CREATE INDEX "provider_event_receipt_validationState_receivedAt_idx" ON "provider_event_receipt"("validationState", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "provider_event_receipt_provider_externalEventIdHash_key" ON "provider_event_receipt"("provider", "externalEventIdHash");

-- CreateIndex
CREATE UNIQUE INDEX "media_poc_object_physicalName_key" ON "media_poc_object"("physicalName");

-- CreateIndex
CREATE INDEX "media_poc_object_state_expiresAt_idx" ON "media_poc_object"("state", "expiresAt");
