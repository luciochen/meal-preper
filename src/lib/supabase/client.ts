import { createBrowserClient } from "@supabase/ssr";

type SupabaseClient = ReturnType<typeof createBrowserClient>;

declare global {
  // eslint-disable-next-line no-var
  var __supabase: SupabaseClient | undefined;
}

export function createClient(): SupabaseClient {
  // On the server, always create a fresh instance (no lock contention server-side)
  if (typeof window === "undefined") {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  // In the browser, use globalThis so the singleton survives across
  // Next.js code-split chunk boundaries — module-level vars don't.
  if (!globalThis.__supabase) {
    globalThis.__supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  return globalThis.__supabase;
}
