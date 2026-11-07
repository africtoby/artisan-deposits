// Runs once when the server starts, so a missing or malformed variable fails loudly at boot
// instead of on the first seller who hits the broken code path.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getServerEnv } = await import("@/lib/env");
    getServerEnv();
  }
}
