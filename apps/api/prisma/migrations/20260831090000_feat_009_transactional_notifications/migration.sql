-- Forward-only, additive notification projection. Application rollback leaves these rows intact.
ALTER TABLE "outbox_event" ADD COLUMN "leaseExpiresAt" TIMESTAMPTZ(3);

CREATE TABLE "transactional_notification" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "recipientProfileId" UUID NOT NULL,
  "sourceEventId" UUID NOT NULL,
  "requestId" UUID NOT NULL,
  "eventType" VARCHAR(100) NOT NULL,
  "templateKey" VARCHAR(80) NOT NULL,
  "templateVersion" INTEGER NOT NULL,
  "readAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "transactional_notification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "transactional_notification_recipient_fkey" FOREIGN KEY ("recipientProfileId") REFERENCES "profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "transactional_notification_source_fkey" FOREIGN KEY ("sourceEventId") REFERENCES "outbox_event"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "transactional_notification_request_fkey" FOREIGN KEY ("requestId") REFERENCES "service_request"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "transactional_notification_source_recipient_key" ON "transactional_notification" ("sourceEventId", "recipientProfileId");
CREATE INDEX "transactional_notification_recipient_created_id_idx" ON "transactional_notification" ("recipientProfileId", "createdAt" DESC, "id" DESC);
CREATE INDEX "transactional_notification_recipient_unread_idx" ON "transactional_notification" ("recipientProfileId") WHERE "readAt" IS NULL;
