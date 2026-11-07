# Work Deposits: brand and UI rules

Claude Code: read this before writing ANY screen or component. These rules override the default look of shadcn/ui, Tailwind and your own habits. The goal is an app that looks designed for African artisans and freelancers paying from a phone, not a generated fintech template.

## Who it is for
Sellers: tailors, carpenters, repairers, designers, developers, editors. Clients: people paying from a phone, often on weak data, in sunlight, in a hurry. A money screen must be understood in two seconds.

## The one idea: the measuring tape
Tailors, carpenters and designers all measure before they charge. The tape measure is the single memorable element of this app. It shows time and progress. Everything else stays quiet and plain. Colors come from indigo cloth dye and a tailor's tape.

## Palette (contrast tested)
All colors live as CSS variables in `:root` in `src/app/globals.css`. Never hard-code a hex value in a component.

| Token | Hex | Use | Tested pair |
|---|---|---|---|
| ground | #ECEFF7 | page background | ink on ground 14.4:1 |
| surface | #FFFFFF | sheets, rows, inputs | ink on surface 16.5:1 |
| ink | #141B45 | text, strong lines, sign-in background | |
| ink-soft | #4A5180 | secondary text, input borders | 6.6:1 on ground, 7.6:1 on surface |
| indigo | #2A3A9C | primary buttons, links, focus ring | white on indigo 9.6:1 |
| tape | #F2D77A | the tape component ONLY | ink on tape 11.6:1 |
| tape-tint | #FBEFC4 | the "Owed" tag background ONLY | ink on tape-tint 14.3:1 |
| paid | #1B6B47 | paid state text and check | 6.5:1 on surface |
| paid-tint | #DCEFE4 | paid tag background | 5.4:1 |
| error | #B3372B | errors | 6.0:1 on surface |
| error-tint | #F7DDD9 | error background | 4.7:1 |
| dye-line | #B8BFD9 | decorative dividers only | 1.6:1, so never the only edge of an input |

Rules:
- Yellow appears only on the tape and the Owed tag. Nowhere else.
- No gradients. No dark mode (cut for the hackathon).
- Use only the pairs in the table for text.

Starting point for `globals.css` (adapt the shadcn variable names to the installed version; check its docs):
```css
:root {
  --ground: #ECEFF7;  --surface: #FFFFFF;  --ink: #141B45;  --ink-soft: #4A5180;
  --indigo: #2A3A9C;  --tape: #F2D77A;     --tape-tint: #FBEFC4;
  --paid: #1B6B47;    --paid-tint: #DCEFE4;
  --error: #B3372B;   --error-tint: #F7DDD9;  --dye-line: #B8BFD9;

  /* shadcn mapping */
  --background: var(--ground);   --foreground: var(--ink);
  --card: var(--surface);        --card-foreground: var(--ink);
  --primary: var(--indigo);      --primary-foreground: var(--surface);
  --muted-foreground: var(--ink-soft);
  --border: var(--dye-line);     --input: var(--ink-soft);
  --ring: var(--indigo);         --destructive: var(--error);
}
```

## Type
- **Display: Big Shoulders Display.** A condensed face like the numerals on a tape. Used for amounts, page titles and tape numbers. Weights 600 and 800 only.
- **Text: Atkinson Hyperlegible Next.** Designed for legibility. Weights 400 and 600 only.
- Load both with `next/font/google`, latin subset, `display: swap`, only those weights (low bandwidth). If a family is not available there, tell me before swapping. Fallbacks: Barlow Condensed and Atkinson Hyperlegible.
- No monospace anywhere. Use tabular figures (`font-variant-numeric: tabular-nums`) wherever amounts line up.
- Scale on mobile: amount hero 64/60 (display 800), h1 36, h2 26, body 17/26, small 14/20. Nothing under 14. Inputs at least 16 so phones do not zoom.
- Left-aligned everywhere. Line length under 65 characters. Sentence case everywhere.
- Never: ALL CAPS labels, small tracked-out labels above headings, one highlighted word inside a headline.

## Shape and surface
- Radii by role: tags 6px, inputs and buttons 12px, bottom sheets 20px on the top corners, tape 2px.
- No drop shadows. Separate things with white surface on the ground color, and 1.5px ink-soft borders on inputs. Only a bottom sheet may have a shadow.
- No grids of identical cards. Lists are rows divided by dye-line. A row that needs action goes first and has a tape-tint background only if it is an Owed row.
- Icons: lucide-react only, imported one by one, 1.5px stroke. No emoji. No Bitcoin coin art, no sparkle or robot icons. No stock photos or illustrations of people. No glass or blur effects.
- Never use "→" at the end of buttons, middle-dot strings like "A · B · C", or "WORD — fragment" labels.

## The signature: the tape
Build one `Tape` component.
- A full-width strip, 36px tall, `tape` background, square ends (2px radius), running edge to edge at the top of the client page and the job page.
- Tick marks along the bottom edge in ink: a short tick every 8px, a tall tick every 40px with a small number (display font, 12px) on the tall ones. Draw them as an inline SVG pattern. No image files.
- It has exactly two jobs. It is never decoration.
  1. **Countdown.** While an invoice is open, the tape shrinks from full width to zero over its 15 minutes. Text beside it: "Pay within 12:40".
  2. **Progress.** After payment, the tape shows the job stages as numbered marks and an ink pin on the current one. Stages shown to the client: 1 Deposit, 2 In progress, 3 Ready, 4 Balance, 5 Done. When the balance is zero, stage 4 is skipped.
- One tape on screen at a time.
- The same information is always available as text (for example "Step 2 of 5: In progress"). Countdown text is announced politely to screen readers, not every second.

## Layout
- Mobile first at 360px wide. On desktop, client pages are a centered 480px column; the seller app is at most 960px.
- Client page order, top to bottom: tape, one line saying who and what, the amount (hero, local currency first), "about 31,250 sats" in small text, the payment slip (QR, "Copy invoice", "Open in wallet"), then the status text.
- Seller app: a bottom tab bar with two items, Jobs and Wallet, each with icon and word. Job list is rows, not cards.
- Wallet: the balance large and left-aligned, "Receive" as the primary action, transactions as rows. No credit-card visuals.
- One primary action per screen. Tap targets at least 48px. Keyboard focus always visible: 3px indigo ring with 2px offset.
- Sign-in screen: full ink background, white wordmark, form on a white sheet. This is the only full-dark screen.
- Keep the client page light: no images, no heavy libraries. Check the bundle before calling a phase done.

## Motion
- Two moments only. (1) Payment detected: the green check draws in over 300ms and the tape fills and locks while the tag changes to "Paid". (2) The tape countdown shrinking.
- No entrance animations, no scroll effects, no hover effects beyond a color change.
- Respect `prefers-reduced-motion`: skip the animation and show the final state.

## Voice
- Sentence case. Plain verbs. Short. Active voice. No exclamation marks, no "Oops", no "Welcome to".
- Name things the way users say them: job, deposit, balance, client.
- Buttons say exactly what happens, and the same word is used through the flow: the button "Request balance" leads to the message "Balance requested".
- Money: local currency first and in full ("₦40,000"). Sats are small and secondary ("about 31,250 sats"). Use `Intl.NumberFormat`. XOF has no decimals.
- The AI feature is called "Fill from message", with a clipboard icon. Never "AI magic".
- Errors say what happened and what to do. They do not apologize.

| Moment | Copy |
|---|---|
| Deposit paid | "Deposit received. {seller} can start the work." |
| Invoice expired | "This invoice expired. Make a new one." Button: "Make new invoice" |
| Rate unavailable | "Couldn't get today's exchange rate. Try again in a minute." |
| No jobs yet | "No jobs yet. Create a job to send your first deposit link." Button: "Create job" |
| Wallet not connected | "Connect your wallet to get paid. Money goes straight to it. We never hold it." |
| Test coins | "Test coins. No real money moves." |
| Link copied | "Link copied" |

Wordmark: "Work Deposits" in the display font, 800, indigo on ground (white on ink on the sign-in screen). No logo symbol. Favicon: a tape-yellow square with three ink ticks.

## Components to build first (Phase 2 design foundation)
Each with all its states (default, focus, disabled, loading, error where relevant):
- `Button`: primary (indigo), secondary (white with ink-soft border), danger (error text)
- `Input`: label above, error text below with an icon, 48px tall
- `Tag`: Paid (paid on paid-tint), Owed (ink on tape-tint), Expired and Cancelled (ink-soft on ground with a border). Sentence case, not caps.
- `Tape`: countdown and progress
- `AmountDisplay`: local currency large, sats small
- `PaymentSlip`: QR on white with padding and a 1.5px ink-soft border, plus "Copy invoice" and "Open in wallet"
- `JobRow`, `WalletBalance`, `EmptyState`, `TestCoinsBanner` (bordered ink-soft banner, no yellow)
- A `/brand` page, not linked from the navigation, that shows every component and state so I can check it on my phone. Remove or protect it before launch.

## Self-check before you say a UI phase is done
- [ ] Looks right at 360px wide with no sideways scrolling
- [ ] Text uses only the color pairs in the palette table
- [ ] No gradients, shadows (except a sheet), emoji, stock images or coin art
- [ ] No all-caps labels, eyebrow labels, middle-dot strings or arrow glyphs
- [ ] Not a grid of identical cards
- [ ] One primary action per screen, tap targets at least 48px
- [ ] On money screens the amount is the biggest thing, local currency first
- [ ] Keyboard focus visible, every input has a label, reduced motion respected
- [ ] Copy follows the voice rules
- [ ] If you can run the app and take a screenshot, do it and review it against this list before showing me. Then tell me exactly which page to open on my phone.
