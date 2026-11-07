-- Prisma's own bookkeeping table is created outside our schema file, so the first migration
-- could not lock it. Same rule as every other table: RLS on, no policies, no public API access.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "_prisma_migrations" FROM anon, authenticated;
