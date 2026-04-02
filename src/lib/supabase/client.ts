import { createBrowserClient } from "@supabase/ssr";

type Client = ReturnType<typeof createBrowserClient>;

declare global {
  // eslint-disable-next-line no-var
  var __supabase: Client | undefined;
}

/**
 * No-op lock — bypasses navigator.locks which causes "lock stolen" errors
 * when Next.js/Turbopack bundles @supabase/ssr into multiple chunks, each
 * with its own module-level cachedBrowserClient and GoTrue instance.
 *
 * Within a single GoTrue instance, operations are still serialized via the
 * internal lockAcquired / pendingInLock queue. The navigator.locks API is
 * only needed for cross-tab / cross-instance coordination, which is
 * acceptable to skip for this single-tab app.
 */
const noopLock = async (
  _name: string,
  _timeout: number,
  fn: () => Promise<unknown>
) => fn();

function makeClient(): Client {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { lock: noopLock } } as any
  );
}

export function createClient(): Client {
  // Server-side: always a fresh instance (no browser APIs available anyway)
  if (typeof window === "undefined") return makeClient();

  // Browser: true global singleton — survives across Next.js chunk boundaries
  // where module-level variables would be duplicated and reset.
  return (globalThis.__supabase ??= makeClient());
}
