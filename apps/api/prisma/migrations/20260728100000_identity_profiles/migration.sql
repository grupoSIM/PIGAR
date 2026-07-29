-- Perfil local de autorización; los sujetos de identidad son opacos y no se
-- almacenan tokens, emails ni credenciales.
CREATE TYPE "ProfileRole" AS ENUM ('CLIENT', 'DISPATCHER', 'ADMIN');
CREATE TYPE "ProfileStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "profile" (
    "id" UUID NOT NULL,
    "identitySubject" VARCHAR(255) NOT NULL,
    "role" "ProfileRole" NOT NULL,
    "status" "ProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "displayName" VARCHAR(120),
    "phone" VARCHAR(32),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "access_audit_event" (
    "id" UUID NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "actorProfileId" UUID,
    "subjectProfileId" UUID,
    "outcome" VARCHAR(30) NOT NULL,
    "correlationId" VARCHAR(128) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "access_audit_event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "profile_identitySubject_key" ON "profile"("identitySubject");
CREATE INDEX "profile_role_status_idx" ON "profile"("role", "status");
CREATE INDEX "access_audit_event_subjectProfileId_createdAt_idx" ON "access_audit_event"("subjectProfileId", "createdAt");
