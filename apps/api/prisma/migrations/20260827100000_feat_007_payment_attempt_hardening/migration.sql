-- Forward-only hardening for feature 007. Existing evidence is preserved.
ALTER TYPE "PaymentAttemptState" ADD VALUE IF NOT EXISTS 'UNKNOWN';

-- PostgreSQL, not application timing, is the final guard against two active
-- checkout attempts for the same frozen charge.
CREATE UNIQUE INDEX "payment_attempt_one_active_per_charge_key"
  ON "payment_attempt" ("chargeId")
  WHERE "state" IN ('CREATED', 'UNKNOWN', 'PENDING');
