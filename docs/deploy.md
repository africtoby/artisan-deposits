# Deploying to Vercel

Vercel hosts the app. Supabase keeps the data. You type the secret values yourself in the Vercel
dashboard; they are never put in the repository.

## 1. Before you deploy

1. In Supabase, open **Authentication > Sign In / Providers** and turn on **Allow anonymous
   sign-ins**. Without it, `/demo` shows "The demo is not available right now".
2. Make sure the database is up to date: `npm run db:migrate`.
3. Push the code to GitHub and check that the **CI** run is green.

## 2. Create the Vercel project

1. Go to vercel.com, choose **Add New > Project** and import the GitHub repository.
2. Leave the framework as Next.js. Do not change the build command.

## 3. Environment variables

Add these in **Settings > Environment Variables** (Production). Names only here:

| Name                                   | Notes                                                      |
| -------------------------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`                         | Supabase pooled connection string                          |
| `DIRECT_URL`                           | Optional. Direct or session-pooler string, for migrations  |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL                                       |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key                                   |
| `NEXT_PUBLIC_APP_URL`                  | The live address, for example `https://your-app.vercel.app` |
| `APP_ENCRYPTION_KEY`                   | 32 random bytes in base64. Use a NEW key for production    |
| `COINGECKO_API_KEY`                    | Optional                                                   |
| `AI_INTAKE_ENABLED`                    | `true` or `false`                                          |
| `ANTHROPIC_API_KEY`                    | Only if `AI_INTAKE_ENABLED` is `true`                      |

A new `APP_ENCRYPTION_KEY` means wallet links saved on your laptop cannot be opened on the live
site. Connect the wallet again on the live site.

## 4. After the first deploy

1. In Supabase, open **Authentication > URL Configuration** and add the live address to the
   **Redirect URLs** (for example `https://your-app.vercel.app/**`). Sign-in emails need it.
2. Set `NEXT_PUBLIC_APP_URL` to the final address and redeploy if it changed.
3. On your phone, open the live address, then `/demo`, and finish the whole flow.

## Known limits

- The rate limiter keeps its counts in memory, per server instance. On Vercel each instance
  counts separately, so the limits are softer than they look. A shared store (for example Redis)
  would fix that.
- The end-to-end test (`npm run test:e2e`) needs `.env.local` and the real database, so CI does
  not run it. It uses the demo wallet, not a real Lightning wallet.
