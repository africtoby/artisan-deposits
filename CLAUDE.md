# Work Deposits: rules for Claude Code

## What this project is
A hackathon entry for the Dakar Bitcoin Hack by BTrust. Submission deadline: Nov 20, 2026, 20:00 UTC (9:00 pm Lagos time).
It is a Lightning deposit and project tracker for **artisans and freelancers** across Africa (tailors, carpenters, repairers, designers, developers, writers, video editors). The client pays a deposit, and later the balance, in their own currency and follows the job's progress. The seller keeps full control of the money. We never hold funds.

Words we use everywhere in code and screens: the person doing the work is the **seller**, the person paying is the **client**, and one piece of work is a **job** (shown to users as "job" or "project").

Read these before writing any code:
- `build-plan.md` (what to build, in what order)
- `brand.md` (the look, colors, type, copy voice and UI rules; read it before building any screen)
- `docs/judging-criteria.md` (the official hackathon rules and criteria; they override the plan if they conflict)

Work on ONE phase at a time. Do not start the next phase until I say so.

## Who I am
Complete beginner. Windows, VS Code, PowerShell. I paste commands into the terminal. Explain everything in plain language. No jargon without a one-line explanation.

## How to work with me
- Before each phase: say in 3 to 5 lines what you will do and which files you will create or change.
- After each phase give me:
  1. what was done, in plain language
  2. the exact commands to test it, and what I should see
  3. what to send you if it breaks (the exact error text or a screenshot; never the contents of .env files)
- Give exact file paths from the project root.
- If you need to see an existing file before writing a new one, say so first.
- File names are kebab-case (for example `wallet-panel.tsx`). The only exceptions are names tools require (`CLAUDE.md`, `README.md`, `LICENSE`).
- Never ask me to paste .env files, passwords, API keys or the wallet connection string. Refer to variable names only.
- If a library works differently from what you remember (Next.js, Prisma, Alby SDK, Supabase, shadcn), read its current docs before writing code. Do not guess APIs.
- If I ask for something that conflicts with these rules or the plan, tell me the tradeoff before doing it.
- Be honest. If you could not test something, say so. Never say tests pass unless you ran them in this session.

## Fixed stack (ask before adding anything major)
- Next.js (latest), App Router, `src/` directory, TypeScript with `strict: true`
- Tailwind CSS and shadcn/ui, restyled with the tokens in `brand.md`
- Fonts: Big Shoulders Display and Atkinson Hyperlegible Next through `next/font` (see `brand.md`)
- Supabase (Postgres and Auth) with Prisma as the ORM. This is a NEW Supabase project, separate from any other project of mine.
- Zod for all validation: user input, environment variables, AI output
- `@getalby/sdk` for Nostr Wallet Connect (NWC). Check the current docs for the exact API.
- Anthropic API for the AI job intake. Optional, behind the `AI_INTAKE_ENABLED` flag.
- Vitest (unit tests), Playwright (one end-to-end test), ESLint, Prettier
- GitHub Actions for CI, Vercel for hosting

## Money rules (never break these)
- Sats are stored as integers (bigint). Fiat is stored in the smallest unit (kobo, cents) as integers. Never use floating point for money.
- Currencies: NGN, KES, GHS, ZAR, XOF, USD, EUR, GBP. Decimals per currency come from one table (`src/lib/money/currencies.ts`). XOF has no decimals.
- Every invoice stores the exchange rate it was created with. The rate is locked at creation. Invoices expire after 15 minutes. After expiry, create a new invoice at a new rate.
- A job has a price, a deposit and a balance (price minus deposit). The balance can be zero (full payment upfront). Both payments are separate invoices with a `purpose` of `deposit` or `balance`.
- Never trust an amount, price or currency sent from the browser. Recompute on the server.
- Marking an invoice as paid must be idempotent: the same payment checked twice must never create two payments or two status changes. Use a unique constraint on `payment_hash` and a guarded update.
- The job status follows a strict state machine (see `build-plan.md`). Illegal jumps are rejected in code and tested.

## Security rules (never break these)
- We never hold client or seller funds. Payments go straight into the seller's own wallet. There is no escrow, and we say so honestly in the docs.
- Request only these wallet permissions: make invoice, look up invoice, get balance, list transactions, get info. Never request spending permission unless `build-plan.md` Phase 4b is explicitly approved by me.
- The wallet connection string is a secret. Encrypt it at rest with AES-256-GCM (Node `crypto`) using `APP_ENCRYPTION_KEY`. Never log it, never send it to the browser, never put it in an error message.
- Secrets live only in environment variables. Validate all env vars with Zod at startup in `src/lib/env.ts`. Keep `.env.example` up to date with names only.
- Row Level Security is ON for every table with no public policies (deny by default). All data access goes through server code that checks the signed-in user owns the record.
- Client pages use an unguessable token (32 random bytes, base64url). Clients do not log in. Those pages show only what the client needs.
- The delivery link (where a freelancer puts the finished files) must be an `https` URL, validated with Zod, shown to the client only after the job is `completed`, and rendered with `rel="noopener noreferrer"`. Treat it as untrusted input.
- Rate limit login, invoice creation, AI intake and token lookups.
- Treat all pasted text and all AI output as untrusted. AI may fill draft fields only. A person confirms before anything is saved. AI never sets money amounts without confirmation.
- Never commit secrets. `.env*` stays in `.gitignore`. Do not read `.env` files.

## UI rules
- Follow `brand.md` for every screen and component. It overrides the default look of shadcn/ui and Tailwind. Colors come only from the CSS variable tokens; never hard-code a hex value in a component.
- No generic AI styling: no gradients, no glass effects, no emoji icons, no sparkle icons, no grids of identical cards, no all-caps labels.
- Money screens are phone-first. The amount is the biggest thing on the screen, in local currency first.
- Before you say a UI phase is done, run the self-check list at the end of `brand.md` and tell me exactly which page to open on my phone.

## Code rules
- No `any`, no `@ts-ignore`, no unexplained `eslint-disable`.
- Code that touches money, secrets, wallets, status changes or delivery links lives in `src/lib/` and has unit tests.
- Wallet access goes through a `WalletProvider` interface with two implementations: `NwcWalletProvider` and `FakeWalletProvider` (used for tests and judge mode).
- Comments explain WHY, not what.
- Do not build features that are not in `build-plan.md`. If you think something is missing, tell me.

## Git
- Commit after each working step with a clear message (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
- Do not commit if lint, type check or tests fail.
- Never force push. Never rewrite history.

## When something fails
- Show me the real error. Do not hide it with try/catch.
- Try a fix at most 3 times. If it still fails, stop, tell me what you learned, and give me options.
- If you are stuck on the wallet connection (Phase 1), stop immediately and tell me. It is the biggest risk in the project.