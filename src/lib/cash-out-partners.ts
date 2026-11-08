import { z } from "zod";

// The one place the Cash out links live. We only link out: no integration, no data collected.
// Both sites were opened on 2026-11-08. Mavapay's app is linked from its own site; Bitnob's page
// did not confirm bitcoin cash-out, so its wording stays cautious. Re-check both in Phase 9.
const partnerSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  url: z.url().refine((value) => value.startsWith("https://"), "Partner links must use https."),
});

export type CashOutPartner = z.infer<typeof partnerSchema>;

export const CASH_OUT_PARTNERS: CashOutPartner[] = z.array(partnerSchema).parse([
  {
    name: "Mavapay",
    description:
      "Receive bitcoin over Lightning and get local money in a bank account. Check which countries it supports today.",
    url: "https://app.mavapay.money/",
  },
  {
    name: "Bitnob",
    description:
      "Wallet and payouts for people and businesses in Africa. Check that it can turn bitcoin into local money where you live.",
    url: "https://bitnob.com/",
  },
]);
