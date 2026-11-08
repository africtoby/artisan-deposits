-- AlterTable
ALTER TABLE "seller_profiles" ADD COLUMN "is_demo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "demo_wallet_invoices" (
    "payment_hash" TEXT NOT NULL,
    "seller_id" UUID NOT NULL,
    "amount_sats" BIGINT NOT NULL,
    "description" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "settled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_wallet_invoices_pkey" PRIMARY KEY ("payment_hash")
);

-- CreateIndex
CREATE INDEX "demo_wallet_invoices_seller_id_created_at_idx" ON "demo_wallet_invoices"("seller_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "demo_wallet_invoices" ADD CONSTRAINT "demo_wallet_invoices_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same rule as every other table: RLS on, no policies, no rights for the public API roles.
ALTER TABLE "demo_wallet_invoices" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "demo_wallet_invoices" FROM anon, authenticated;
