import { z } from "zod";

// Optional flags arrive as strings; anything but "true" means off.
const flag = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => value === "true");

// 32 random bytes, base64 encoded (44 characters). Generate one with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
const encryptionKey = z.string().refine((value) => Buffer.from(value, "base64").length === 32, {
  message: "must be 32 random bytes encoded as base64",
});

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.url(),
  APP_ENCRYPTION_KEY: encryptionKey,
  // Used from later phases; optional now so Phase 2 can run without them.
  COINGECKO_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  AI_INTAKE_ENABLED: flag,
});

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.url(),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type PublicEnv = z.infer<typeof publicSchema>;

// Names only in the message: a value from a bad .env must never end up in a log.
function explain(error: z.ZodError): string {
  const lines = error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`);
  return `Invalid environment variables. Fix these in .env.local (or the Vercel dashboard):\n${lines.join("\n")}`;
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverSchema.safeParse(source);
  if (!result.success) throw new Error(explain(result.error));
  return result.data;
}

export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const result = publicSchema.safeParse(source);
  if (!result.success) throw new Error(explain(result.error));
  return result.data;
}

let cachedServerEnv: ServerEnv | undefined;

// Lazy so that `next build` and tests do not need secrets; instrumentation.ts calls it at startup.
export function getServerEnv(): ServerEnv {
  cachedServerEnv ??= parseServerEnv(process.env);
  return cachedServerEnv;
}

// Next.js only inlines NEXT_PUBLIC_ values into browser code when they are written out in full,
// so each one is read by name here instead of passing process.env along.
export function getPublicEnv(): PublicEnv {
  return parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
}
