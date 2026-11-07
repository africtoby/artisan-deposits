-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('created', 'deposit_pending', 'deposit_paid', 'in_progress', 'ready', 'balance_pending', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "InvoicePurpose" AS ENUM ('deposit', 'balance');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('pending', 'paid', 'expired');

-- CreateEnum
CREATE TYPE "EventActor" AS ENUM ('seller', 'system', 'client');

-- CreateTable
CREATE TABLE "seller_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "default_currency" TEXT NOT NULL DEFAULT 'NGN',
    "nwc_secret_encrypted" TEXT,
    "nwc_connected_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "client_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "deadline" DATE,
    "currency" TEXT NOT NULL,
    "price_minor" BIGINT NOT NULL,
    "deposit_minor" BIGINT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'created',
    "delivery_url" TEXT,
    "public_token" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "purpose" "InvoicePurpose" NOT NULL,
    "bolt11" TEXT NOT NULL,
    "payment_hash" TEXT NOT NULL,
    "amount_sats" BIGINT NOT NULL,
    "fiat_minor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "rate_used" DECIMAL(24,8) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_events" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "from_status" "JobStatus",
    "to_status" "JobStatus" NOT NULL,
    "actor" "EventActor" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seller_profiles_user_id_key" ON "seller_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_public_token_key" ON "jobs"("public_token");

-- CreateIndex
CREATE INDEX "jobs_seller_id_created_at_idx" ON "jobs"("seller_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_payment_hash_key" ON "invoices"("payment_hash");

-- CreateIndex
CREATE INDEX "invoices_job_id_purpose_idx" ON "invoices"("job_id", "purpose");

-- CreateIndex
CREATE INDEX "job_events_job_id_created_at_idx" ON "job_events"("job_id", "created_at");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_events" ADD CONSTRAINT "job_events_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Safety nets the app also enforces in code: a bad write is stopped at the database too.
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_amounts_valid"
  CHECK ("price_minor" > 0 AND "deposit_minor" >= 0 AND "deposit_minor" <= "price_minor");
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_amounts_valid"
  CHECK ("amount_sats" > 0 AND "fiat_minor" > 0 AND "rate_used" > 0);

-- Row Level Security: ON for every table, with NO policies. Supabase's public API roles
-- (anon, authenticated) therefore see nothing. All access goes through our server code,
-- which connects as the database owner and checks that the signed-in user owns the record.
-- Do not add FORCE here: it would lock out that owner connection too.
ALTER TABLE "seller_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_events" ENABLE ROW LEVEL SECURITY;

-- Belt and braces: even without RLS, these roles get no table rights.
REVOKE ALL ON TABLE "seller_profiles", "jobs", "invoices", "job_events" FROM anon, authenticated;
