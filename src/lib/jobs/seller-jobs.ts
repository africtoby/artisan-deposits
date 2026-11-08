import "server-only";
import type { JobStatus } from "@/generated/prisma/enums";
import { getDb } from "@/lib/db";
import { isCurrencyCode, type CurrencyCode } from "@/lib/money/currencies";

export type SellerJobSummary = {
  id: string;
  title: string;
  clientName: string;
  currency: CurrencyCode;
  priceMinor: bigint;
  depositMinor: bigint;
  status: JobStatus;
  publicToken: string;
};

const select = {
  id: true,
  title: true,
  clientName: true,
  currency: true,
  priceMinor: true,
  depositMinor: true,
  status: true,
  publicToken: true,
} as const;

function toSummary(row: {
  id: string;
  title: string;
  clientName: string;
  currency: string;
  priceMinor: bigint;
  depositMinor: bigint;
  status: JobStatus;
  publicToken: string;
}): SellerJobSummary {
  if (!isCurrencyCode(row.currency))
    throw new Error(`Unknown currency in database: ${row.currency}`);
  return { ...row, currency: row.currency };
}

// Both lookups filter by the seller's own sign-in id, so a seller can never read another's job
// by guessing its id.
export async function listSellerJobs(userId: string): Promise<SellerJobSummary[]> {
  const rows = await getDb().job.findMany({
    where: { seller: { userId } },
    orderBy: { createdAt: "desc" },
    select,
  });
  return rows.map(toSummary);
}

export async function getSellerJob(
  userId: string,
  jobId: string,
): Promise<SellerJobSummary | null> {
  // An id that is not a UUID would make Postgres throw; treat it as simply not found.
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) return null;
  const row = await getDb().job.findFirst({ where: { id: jobId, seller: { userId } }, select });
  return row ? toSummary(row) : null;
}
