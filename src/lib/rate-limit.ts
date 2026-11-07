// A small fixed-window limiter kept in memory. It is a speed bump, not a wall: on serverless
// hosting each instance has its own counters, so a determined attacker gets more tries than the
// number below. Supabase also limits magic-link emails on its side, and the Phase 8 security pass
// should decide whether to move this to a shared store.

type Window = { count: number; resetsAt: number };

const windows = new Map<string, Window>();
const MAX_TRACKED_KEYS = 10_000;

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  if (windows.size > MAX_TRACKED_KEYS) {
    // Drop expired entries so the map cannot grow without bound.
    for (const [existingKey, entry] of windows) {
      if (entry.resetsAt <= now) windows.delete(existingKey);
    }
  }

  const current = windows.get(key);
  if (!current || current.resetsAt <= now) {
    windows.set(key, { count: 1, resetsAt: now + windowMs });
    return { allowed: true };
  }
  if (current.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((current.resetsAt - now) / 1000) };
  }
  current.count += 1;
  return { allowed: true };
}

export function resetRateLimitsForTests(): void {
  windows.clear();
}
