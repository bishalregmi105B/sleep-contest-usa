-- Initial schema for the sleep contest, targeting PostgreSQL.
--
-- The first migration in this project. There is no legacy to preserve: the
-- previous model only ever ran against SQLite (dev.db) and an in-memory demo
-- store, neither of which held real registrations.
--
-- Raw SQL is used for the parts Prisma cannot express and that the write path
-- depends on:
--   * mat_number_seq          atomic, gap-free-per-payment mat assignment
--   * reg_email_active_uq     one active row per email, enforced by the database
--   * reg_paid_public_idx     index-only scan for the public counter
--   * reg_hold_expiry_ix      the sweeper's working set
--   * reg_status_chk          status cannot drift into an unknown value

-- ---------------------------------------------------------------------------
-- Registration
-- ---------------------------------------------------------------------------

CREATE TABLE "Registration" (
    "id"               SERIAL       NOT NULL PRIMARY KEY,
    "publicId"         TEXT         NOT NULL,
    "fullName"         TEXT         NOT NULL,
    "email"            TEXT         NOT NULL,
    "emailNormalized"  TEXT         NOT NULL,
    "mobileE164"       TEXT         NOT NULL,
    "dateOfBirth"      DATE         NOT NULL,
    "cityState"        TEXT         NOT NULL,
    "status"           TEXT         NOT NULL DEFAULT 'pending',
    "isInternal"       BOOLEAN      NOT NULL DEFAULT false,
    "matNumber"        INTEGER,
    "refCode"          TEXT         NOT NULL,
    "referredBy"       TEXT,
    "paymentProvider"  TEXT         NOT NULL DEFAULT 'stripe',
    "paymentRef"       TEXT,
    "stripeSessionId"  TEXT,
    "holdExpiresAt"    TIMESTAMP(3),
    "ipHash"           TEXT,
    "consentAt"        TIMESTAMP(3) NOT NULL,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt"           TIMESTAMP(3),
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Declared in schema.prisma as well. The migration is the source of truth for
-- what exists; Prisma needs the declaration to generate the client types.
CREATE INDEX "Registration_email_idx"        ON "Registration"("email");
CREATE INDEX "Registration_status_idx"       ON "Registration"("status");
CREATE INDEX "Registration_refCode_idx"      ON "Registration"("refCode");
CREATE INDEX "Registration_status_created_at_id_idx"
    ON "Registration"("status", "createdAt", "id");

-- The constraint the whole duplicate-registration story rests on: at most one
-- live (pending or paid) registration per email. Expired, refunded and
-- cancelled rows drop out, so somebody who was refunded may register again.
CREATE UNIQUE INDEX "reg_email_active_uq"
    ON "Registration"("emailNormalized")
    WHERE "status" IN ('pending', 'paid');

-- Serves the public counter. Partial, so the index holds only paid
-- non-internal rows: at 200,000 registrations the counter is an index-only
-- scan of a few thousand entries rather than a heap scan.
CREATE INDEX "reg_paid_public_idx"
    ON "Registration"("id")
    WHERE "status" = 'paid' AND NOT "isInternal";

-- The sweeper's working set: only rows that can actually expire.
CREATE INDEX "reg_hold_expiry_ix"
    ON "Registration"("holdExpiresAt")
    WHERE "status" = 'pending';

CREATE INDEX "reg_referred_ix"
    ON "Registration"("referredBy")
    WHERE "referredBy" IS NOT NULL;

CREATE UNIQUE INDEX "reg_stripe_session_uq"
    ON "Registration"("stripeSessionId")
    WHERE "stripeSessionId" IS NOT NULL;

ALTER TABLE "Registration"
    ADD CONSTRAINT "reg_status_chk"
    CHECK ("status" IN ('pending', 'paid', 'expired', 'refunded', 'cancelled'));

ALTER TABLE "Registration"
    ADD CONSTRAINT "reg_mat_number_chk"
    CHECK ("matNumber" IS NULL OR "matNumber" > 0);

-- ---------------------------------------------------------------------------
-- Settings and audit
-- ---------------------------------------------------------------------------

CREATE TABLE "Setting" (
    "key"       TEXT         NOT NULL PRIMARY KEY,
    "value"     JSONB        NOT NULL,
    "version"   INTEGER      NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "SettingAudit" (
    "id"       SERIAL       NOT NULL PRIMARY KEY,
    "key"      TEXT         NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "adminId"  TEXT         NOT NULL,
    "ipHash"   TEXT,
    "at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "SettingAudit_key_at_idx" ON "SettingAudit"("key", "at");

-- ---------------------------------------------------------------------------
-- Capacity
-- ---------------------------------------------------------------------------

CREATE TABLE "Counter" (
    "id"       INTEGER NOT NULL PRIMARY KEY,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "paid"     INTEGER NOT NULL DEFAULT 0
);

-- Exactly one row. The cap check is a conditional UPDATE against this row.
INSERT INTO "Counter" ("id", "reserved", "paid") VALUES (1, 0, 0);

-- ---------------------------------------------------------------------------
-- Waitlist
-- ---------------------------------------------------------------------------

CREATE TABLE "WaitlistEntry" (
    "id"        SERIAL       NOT NULL PRIMARY KEY,
    "email"     TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source"    TEXT
);

CREATE UNIQUE INDEX "WaitlistEntry_email_key" ON "WaitlistEntry"("email");
CREATE INDEX "WaitlistEntry_created_at_idx" ON "WaitlistEntry"("createdAt");

-- ---------------------------------------------------------------------------
-- Webhook ledger and email outbox
-- ---------------------------------------------------------------------------

CREATE TABLE "WebhookEvent" (
    "id"          TEXT         NOT NULL PRIMARY KEY,
    "type"        TEXT         NOT NULL,
    "receivedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "status"      TEXT         NOT NULL DEFAULT 'received',
    "lastError"   TEXT
);

CREATE INDEX "WebhookEvent_status_received_at_idx" ON "WebhookEvent"("status", "receivedAt");

CREATE TABLE "EmailOutbox" (
    "id"             SERIAL       NOT NULL PRIMARY KEY,
    "type"           TEXT         NOT NULL,
    "toEmail"        TEXT         NOT NULL,
    "payload"        JSONB        NOT NULL,
    "idempotencyKey" TEXT         NOT NULL,
    "status"         TEXT         NOT NULL DEFAULT 'pending',
    "attempts"       INTEGER      NOT NULL DEFAULT 0,
    "nextAttemptAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError"      TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt"         TIMESTAMP(3)
);

CREATE UNIQUE INDEX "EmailOutbox_idempotency_key_key" ON "EmailOutbox"("idempotencyKey");

-- Partial, so the sweeper only ever looks at rows it can act on.
CREATE INDEX "outbox_due_ix"
    ON "EmailOutbox"("status", "nextAttemptAt")
    WHERE "status" IN ('pending', 'retry');

-- ---------------------------------------------------------------------------
-- Idempotency keys
-- ---------------------------------------------------------------------------

CREATE TABLE "IdempotencyRecord" (
    "key"          TEXT         NOT NULL PRIMARY KEY,
    "scope"        TEXT         NOT NULL,
    "publicId"     TEXT,
    "responseCode" INTEGER,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"    TIMESTAMP(3) NOT NULL
);

CREATE INDEX "IdempotencyRecord_expires_at_idx" ON "IdempotencyRecord"("expiresAt");

-- ---------------------------------------------------------------------------
-- Mat numbers
-- ---------------------------------------------------------------------------

-- Assigned only at payment, with nextval(), inside the same UPDATE that flips
-- the status. The database serialises concurrent nextval calls, so two
-- simultaneous payments can never receive the same number. The previous
-- implementation read MAX(matNumber)+1 and raced; this is why it does not.
--
-- Deliberately not OWNED BY the column: dropping the column should not drop the
-- sequence, because mat numbers are never reused and the highest number issued
-- must stay issued even if the column is ever rebuilt.
CREATE SEQUENCE IF NOT EXISTS "mat_number_seq" AS INTEGER START 1;

-- Keep the sequence ahead of any mat number written by a manual correction, so
-- a later payment cannot collide with it.
--
-- The name is single-quoted: a double-quoted identifier makes Postgres resolve
-- it as a column, and this fails with "column mat_number_seq does not exist".
SELECT setval(
    'mat_number_seq',
    GREATEST(COALESCE((SELECT MAX("matNumber") FROM "Registration"), 0), 1),
    EXISTS (SELECT 1 FROM "Registration" WHERE "matNumber" IS NOT NULL)
);