import type { JobInput } from "./job-input";
import type { JobRecord, JobStore } from "./job-store";
import { generatePublicToken } from "./public-token";

// `sellerId` must come from the signed-in session (see requireUser), never from the browser.
export async function createJob(
  store: JobStore,
  sellerId: string,
  input: JobInput,
): Promise<JobRecord> {
  return store.createJob({
    sellerId,
    clientName: input.clientName,
    title: input.title,
    details: input.details,
    deadline: input.deadline,
    currency: input.currency,
    priceMinor: input.priceMinor,
    depositMinor: input.depositMinor,
    publicToken: generatePublicToken(),
  });
}
