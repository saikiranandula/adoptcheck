import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const FREE_LIMIT = Number(process.env.ADOPTCHECK_FREE_LIMIT ?? "3");

const TABLE = "adoptcheck_sessions";

export interface UsageState {
  freeUsed: number;
  freeLimit: number;
  freeRemaining: number;
  credits: number;
  /** Whether another scan is allowed right now. */
  allowed: boolean;
  /** Whether the metering store is configured (Supabase env present). */
  configured: boolean;
}

/**
 * Server-only Supabase client using the service role key. Returns null when
 * the store is not configured, in which case metering fails open and the
 * scanner keeps working (deterministic-first philosophy).
 */
function admin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function unconfigured(): UsageState {
  return {
    freeUsed: 0,
    freeLimit: FREE_LIMIT,
    freeRemaining: FREE_LIMIT,
    credits: 0,
    allowed: true,
    configured: false,
  };
}

export async function getUsage(sessionId: string): Promise<UsageState> {
  const db = admin();
  if (!db) return unconfigured();

  try {
    const { data } = await db
      .from(TABLE)
      .select("free_used, credits")
      .eq("session_id", sessionId)
      .maybeSingle();

    const freeUsed = data?.free_used ?? 0;
    const credits = data?.credits ?? 0;
    const freeRemaining = Math.max(0, FREE_LIMIT - freeUsed);
    return {
      freeUsed,
      freeLimit: FREE_LIMIT,
      freeRemaining,
      credits,
      allowed: freeRemaining > 0 || credits > 0,
      configured: true,
    };
  } catch {
    // If the table/query fails, fail open rather than blocking scans.
    return unconfigured();
  }
}

/** Record one successful scan: spend a free scan, else a paid credit. */
export async function consumeScan(sessionId: string): Promise<void> {
  const db = admin();
  if (!db) return;

  const { data } = await db
    .from(TABLE)
    .select("free_used, credits")
    .eq("session_id", sessionId)
    .maybeSingle();

  const freeUsed = data?.free_used ?? 0;
  const credits = data?.credits ?? 0;
  const now = new Date().toISOString();

  if (freeUsed < FREE_LIMIT) {
    await db
      .from(TABLE)
      .upsert(
        { session_id: sessionId, free_used: freeUsed + 1, updated_at: now },
        { onConflict: "session_id" }
      );
  } else if (credits > 0) {
    await db
      .from(TABLE)
      .upsert(
        { session_id: sessionId, credits: credits - 1, updated_at: now },
        { onConflict: "session_id" }
      );
  }
}

/** Add purchased credits to a session (called from the Dodo webhook). */
export async function addCredits(sessionId: string, amount: number): Promise<void> {
  const db = admin();
  if (!db) return;

  const { data } = await db
    .from(TABLE)
    .select("credits")
    .eq("session_id", sessionId)
    .maybeSingle();

  const credits = data?.credits ?? 0;
  await db
    .from(TABLE)
    .upsert(
      { session_id: sessionId, credits: credits + amount, updated_at: new Date().toISOString() },
      { onConflict: "session_id" }
    );
}
