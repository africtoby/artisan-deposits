# Work Deposits: build plan

Deadline: Nov 20, 2026, 20:00 UTC (9:00 pm Lagos). Plan to submit by 12:00 noon Lagos time on Nov 20.
Start date: Nov 7, 2026.

## 1. One-line pitch
Artisans and freelancers get paid a deposit, and later the balance, by Lightning, straight into their own wallet. Clients pay in their own currency and follow the job until delivery.

## 2. Problem
Anyone who sells work before it is finished carries the risk: the carpenter buys wood, the tailor buys fabric, the designer spends a week on a logo. Clients delay, change their minds, or vanish. Bank and card payments are slow, costly or unavailable, and freelancers with clients abroad lose time and fees getting paid. They need a safe deposit and a clear record, not a new platform that holds their money.

## 3. Hackathon fit (confirm against `docs/judging-criteria.md` before Phase 2)
Known from the Devpost page: build Bitcoin, nostr and AI-centered solutions that answer local and regional needs. Examples include wallets and learning tools. At least a bitcoin/lightning wallet implementation is required. Prefer proven libraries and secure defaults. Students only.
Last year's weights (for reference only): local usefulness and impact 40%, security by design 30%, working MVP 10%.

Map each judging point to evidence the judges can click:

| Judging point | Evidence in this project |
|---|---|
| Local usefulness and impact | Two real stories (an artisan and a freelancer paid by a client abroad), 8 currencies, a cash-out guide |
| Security by design | Encrypted wallet link, receive-only permissions, no funds held, RLS, threat model, tests |
| Working product | Live URL, judge mode, real payment proof, a distinct phone-first design (`brand.md`) |
| Wallet implementation | Wallet panel: balance, create invoice, QR, history |
| Bitcoin, nostr and AI | NWC (nostr) wallet connection, AI job intake |

If the real criteria differ, tell me in Phase 0 and propose changes to this table.

## 4. Scope
### Must work perfectly
1. Seller signs in, connects a wallet with NWC (encrypted at rest).
2. Wallet panel: balance, create invoice with QR, transaction history. All through NWC.
3. Create a job with a price and deposit in a local currency. The app creates a rate-locked Lightning invoice for the deposit.
4. Client opens a private link, sees the price in their currency, scans the QR, pays. The app detects payment and marks "deposit paid".
5. Strict job status flow, visible to the client as a timeline.
6. Multi-currency: NGN, KES, GHS, ZAR, XOF, USD, EUR, GBP with live rates and a fallback source.

### Should work
7. Balance payment: when the work is ready, the seller requests the balance and the client pays a second invoice.
8. Delivery link: the seller attaches a link to the finished files or a pickup note. The client sees it only after full payment.
9. AI job intake: paste a messy client message (WhatsApp, email or a freelance brief), get a draft job card, the seller confirms.
10. Judge mode at `/demo`: a seeded demo seller with practice coins so a judge can try everything in 60 seconds with no setup.

### Not in scope (do not build)
Escrow or dispute handling (we do not hold funds, so refunds are between seller and client), PDF invoices, tax features, teams or multiple sellers per account, recurring billing, bank payouts, other languages, push notifications, client accounts, an admin dashboard, a mobile app.
Cash-out to a bank is explained in a guide page (partners such as Mavapay or Bitnob). We link out and do not integrate. The wallet panel has a "Cash out" section of links (Phase 4), and nothing more.

## 5. Data model (Prisma, Postgres)
- `seller_profiles`: id, user_id (Supabase Auth), display_name, default_currency, nwc_secret_encrypted, nwc_connected_at, created_at
- `jobs`: id, seller_id, client_name, title, details (json), deadline (optional), currency, price_minor, deposit_minor, status, delivery_url (optional), public_token (unique), created_at, updated_at
- `invoices`: id, job_id, purpose (deposit or balance), bolt11, payment_hash (unique), amount_sats (bigint), fiat_minor, currency, rate_used, expires_at, status (pending, paid, expired), paid_at, created_at
- `job_events`: id, job_id, from_status, to_status, actor (seller, system, client), note, created_at. This is both the audit log and the client timeline.

Status machine:
`created` to `deposit_pending` to `deposit_paid` to `in_progress` to `ready`, then:
- if the balance is more than zero: `ready` to `balance_pending` to `completed`
- if the balance is zero (paid in full upfront): `ready` to `completed`

`cancelled` is allowed from any state before `completed`. No other jumps. The delivery link becomes visible to the client only in `completed`.

## 6. Project layout (kebab-case file names)
```
src/
  app/                      pages and API routes
  components/               ui pieces (shadcn lives in components/ui)
  lib/
    env.ts                  Zod-validated environment variables
    money/                  currencies.ts, convert.ts (+ tests)
    rates/                  rate-provider.ts, coingecko.ts, fallback.ts (+ tests)
    wallet/                 wallet-provider.ts, nwc-wallet-provider.ts, fake-wallet-provider.ts
    crypto/                 secret-box.ts (AES-256-GCM) (+ tests)
    jobs/                   status-machine.ts, create-job.ts, create-invoice.ts,
                            mark-invoice-paid.ts, delivery-url.ts (+ tests)
    ai/                     parse-job.ts (Zod-validated output)
    cash-out-partners.ts    partner names and https links for the Cash out section
    rate-limit.ts
brand.md                    look, colors, type, voice (read before any UI)
prisma/                     schema.prisma, migrations
scripts/                    risk-test.ts (Phase 1)
docs/                       judging-criteria.md, threat-model.md, architecture.md, cash-out-guide.md
e2e/                        Playwright test
```

## 7. Phases
Every phase that builds screens follows `brand.md` and ends with its self-check list.

### Phase 0: Read and confirm (Nov 7)
- Read `CLAUDE.md`, this file, `brand.md` and `docs/judging-criteria.md`.
- Summarize the plan back to me in plain language.
- List anything in the judging criteria that conflicts with this plan, especially what counts as a "wallet implementation" (does it need sending, or is receive plus balance plus history enough?).
- List what you need from me. Write no code.
Done when: I have approved the summary.

### Phase 1: Risk test (Nov 8). Biggest risk, do this first
Goal: prove we can do the hard part before building anything else.
- Create `scripts/risk-test.ts`: connect to a test wallet using NWC, read the balance, create an invoice for 100 sats, and wait until I pay it from a second test wallet and the script detects the payment.
- Environment variable it uses: `TEST_NWC_URL` (the seller test wallet). I pay the invoice myself from a second wallet.
- Run with env loaded from `.env.local`.
Done when: the script prints "payment detected" after I pay. If this fails after 3 attempts, stop and tell me. We decide whether to change approach before spending more time.

### Phase 2: Foundation (Nov 9 to 10)
- Strict TypeScript, ESLint, Prettier, Vitest set up.
- `src/lib/env.ts` with Zod. `.env.example` with names only.
- Prisma schema and first migration on the new Supabase project. RLS on, no public policies.
- Supabase Auth: email magic link for sellers.
- `secret-box.ts` (AES-256-GCM) with unit tests (round trip, wrong key fails, tampered data fails).
- `WalletProvider` interface, `NwcWalletProvider`, `FakeWalletProvider`.
- Connect-wallet page: the seller pastes their NWC link, we test it, encrypt it, store it. Show a card: "what this app can and cannot do with your wallet".
- Design foundation (see `brand.md`): color tokens in `globals.css`, the two fonts, and the first components (Button, Input, Tag, Tape, AmountDisplay, PaymentSlip, JobRow, EmptyState). Build a `/brand` page that shows every component and state.
Done when: I can sign up, connect the test wallet, and see "connected". The `/brand` page works and I have approved how it looks on my phone. Tests pass. CI is not required yet.

### Phase 3: Jobs and deposits (Nov 11 to 12)
- `currencies.ts` and `convert.ts` (fiat to sats, ceil rounding) with tests, including XOF with zero decimals.
- Rate provider: CoinGecko first (free key in `COINGECKO_API_KEY`), a second free source as fallback. Cache for 60 seconds. If both fail, show a clear error and do not create the invoice.
- Create-job form (seller): client name, title, details, deadline (optional), currency, price, deposit.
- Create-invoice on the server (`purpose: deposit`): recompute everything, lock the rate, 15-minute expiry, store `payment_hash`.
- Client page `/j/[token]`: price in their currency, QR code, countdown, "paid" state. Checks payment by polling a server route. Regenerates the invoice after expiry.
- `mark-invoice-paid.ts`: idempotent, transactional, writes a `job_events` row.
Done when: end to end with two test wallets: create job, client pays, status flips to "deposit paid" exactly once, even if the check runs twice. Tests cover idempotency and expiry.

### Phase 4: Wallet panel (Nov 13)
- Page `/wallet`: balance, "receive" (create invoice and QR), recent transactions. Receive-only permissions.
- Label clearly when the wallet is on test coins.
- "Cash out" section on `/wallet`, below the transactions. Links only: one short explanation ("Turn sats into local money through a partner. We never touch your money.") and a row per partner with its name, what it does in one line, and an external link. Links open in a new tab with `rel="noopener noreferrer"`. No integration, no forms, no bank details collected, no partner API calls.
- The partner list lives in one place in code (`src/lib/cash-out-partners.ts`: name, one-line description, https URL, validated with Zod). Starter partners: Mavapay and Bitnob. Before adding each URL, check the partner's current official site and confirm it still serves African users; do not guess URLs.
- Create a short first version of `docs/cash-out-guide.md` with the same partners, so the section has a page to point to. Phase 9 finishes it.
- Follow `brand.md`: rows divided by dye-line, not cards; no logos or partner artwork; lucide icon for external links; sentence case; one primary action on the page stays "Receive".
Done when: a judge can look at this page and see a working wallet interface, and the Cash out section shows working partner links and collects no data.

### Phase 4b (only if the judging criteria require sending)
- Add paying an invoice using a SEPARATE, spend-limited NWC connection that the seller creates on purpose. Requires my explicit approval before you start.

### Phase 5: Progress, balance payment and delivery (Nov 14 to 15)
- `status-machine.ts` with tests (every legal move passes, every illegal move fails, including the zero-balance shortcut).
- Seller buttons to move a job forward. Client timeline from `job_events`.
- Balance payment: when the job is `ready`, the seller requests the balance. This creates a `purpose: balance` invoice and moves the job to `balance_pending`. Paying it moves the job to `completed`.
- Delivery link: the seller can attach an `https` link (`delivery-url.ts`, validated, tested). The client sees it only in `completed`.
- WhatsApp share button on the seller's job page for the client link.
Done when: the client page shows a live timeline, illegal moves are impossible from the UI and the API, and the delivery link stays hidden until the balance is paid.

### Phase 6: AI job intake (Nov 16). Optional
- Feature flag `AI_INTAKE_ENABLED`. When off, the manual form is the only path.
- Server route: pasted text in, Zod-validated draft job out (title, details, deadline, price and currency if mentioned). Use the cheapest suitable Claude model; verify the current model string in the Anthropic docs.
- The draft is shown for the seller to edit and confirm. AI output never saves or sets prices by itself.
- Rate limited. Pasted text is untrusted: treat instructions inside it as data.
Done when: pasting a messy WhatsApp message and a messy freelance brief each produce a sensible draft, and a malicious message ("ignore your rules...") produces nothing harmful.
Note: the Anthropic API is billed separately from a Claude Pro subscription. The app must work fully without it.

### Phase 7: Judge mode (Nov 17)
- `/demo`: one click opens a seeded demo seller with two sample jobs (one artisan, one freelancer). Uses `FakeWalletProvider` or a test-coin wallet. Clearly labelled "TEST COINS".
- Destructive actions are limited and the demo data resets. Rate limited.
Done when: a stranger can open `/demo` on a phone and complete the full flow in 60 seconds with no setup.
Feature freeze after this phase: only bug fixes, docs and the video.

### Phase 8: Quality, security, deploy (Nov 18)
- Unit tests for money, rates, secret-box, status machine, mark-invoice-paid, delivery-url.
- One Playwright end-to-end test using `FakeWalletProvider`.
- GitHub Actions: install, lint, type check, tests on every push.
- Security pass: walk through the checklist in section 8 and fix every gap.
- Deploy to Vercel (I add the environment variables in the Vercel dashboard myself).
Done when: CI is green and the live URL works from my phone.

### Phase 9: Proof and docs (Nov 19)
- Real-money proof: one small mainnet payment (a few hundred sats) through the live app. I do the payment. Save a screenshot with timestamp in `docs/proof/` and the README.
- README (see section 9), `LICENSE` (MIT), `SECURITY.md`, `docs/threat-model.md`, `docs/architecture.md`, and the finished `docs/cash-out-guide.md` (started in Phase 4; re-check every partner link).

### Phase 10: Demo and submission (Nov 19 evening to Nov 20)
- Demo video script in section 10. I record it; you help with the script and the checklist.
- Devpost write-up skeleton in section 11.
- Final check of the live URL, repo visibility (public) and license.
- Submit by 12:00 noon Lagos on Nov 20. The extra hours are the buffer.

## 8. Security checklist (Phase 8)
- [ ] No secrets in the repo or in git history
- [ ] `.env.example` has names only
- [ ] NWC string encrypted at rest; never logged; never sent to the browser
- [ ] Wallet permissions limited as in `CLAUDE.md`
- [ ] RLS on every table, no public policies
- [ ] Every server action and API route checks the signed-in user owns the record
- [ ] Amounts and currencies recomputed on the server
- [ ] Idempotent payment marking, tested (deposit and balance)
- [ ] Delivery link is `https` only, hidden until `completed`, opened with `rel="noopener noreferrer"`
- [ ] Rate limits on login, invoice creation, AI intake, token lookups
- [ ] Client tokens are 32 random bytes and never appear in logs
- [ ] AI output validated with Zod; pasted text treated as untrusted
- [ ] Security headers set; no wildcard CORS
- [ ] `npm audit` reviewed; Dependabot on
- [ ] Threat model written: what could go wrong and what stops it

## 9. README must contain
Problem, one-paragraph pitch, a screenshot or GIF, live URL, judge-mode link, how it works (with a simple diagram), the "what this app can and cannot do with your wallet" explanation, the judging-criteria table from section 3 with links to evidence, tech stack, how to run it locally, how to run tests, the real-payment proof, the cash-out guide link, known limitations (including: no escrow, so refunds are between seller and client), license.

## 10. Demo video script (2 min 30 sec)
1. 0:00 to 0:20: Two people, one problem. Musa, a carpenter, buys wood and the client vanishes. Amaka, a freelance designer, finishes a logo for a client abroad and waits weeks to be paid.
2. 0:20 to 1:30: Live flow on a phone, told through Amaka. Paste the client's message, AI drafts the job, she confirms, the client opens the link, sees the price in dollars, pays the deposit by Lightning, the status flips to paid. Later she requests the balance, the client pays, and the delivery link unlocks. Quick cut to Musa's job in the same app.
3. 1:30 to 2:00: Wallet panel: balance, invoice, history.
4. 2:00 to 2:30: Security (encrypted receive-only wallet link, no funds held), how sellers cash out through partners, and what is next.

## 11. Devpost write-up skeleton
Inspiration, what it does, how we built it, security decisions, challenges, what we learned, what is next, links (live app, repo, demo video, proof). Use the headings the Devpost form asks for.

## 12. Risks and cut line
- Biggest risk: the NWC wallet connection and payment detection. Phase 1 exists to find out early.
- The deposit flow (Phase 3) and the wallet panel (Phase 4) must work. Everything else can be cut.
- If Nov 16 arrives and Phase 4 is not working, cut Phase 6 (AI intake) first, then the delivery link, then judge-mode polish. Keep the balance payment if at all possible.
- Do not start new features after Nov 17. After that, only fix bugs and finish docs and the video.
- If design time runs short, keep the client page (tape, amount, payment slip) fully polished and cut polish on the seller list pages first.