import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const FREE_LIMIT = Number(process.env.ADOPTCHECK_FREE_LIMIT ?? "3");

const SESSIONS = "adoptcheck_sessions"; // anonymous free tier, keyed by ac_sid cookie
const CREDITS = "adoptcheck_credits"; // paid credits, keyed by auth user_id

export interface UsageState {
  freeUsed: number;
  freeLimit: number;
  freeRemaining: number;
  credits: number;
  /** Can another scan run right now (free remaining OR account credits). */
  allowed: boolean;
  /** Metering store configured (Supabase service-role env present). */
  configured: boolean;
}

/**
 * Service-role Supabase client for metering writes (bypasses RLS). Returns null
 * when not configured, in which case metering fails open.
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

async function freeUsedFor(db: SupabaseClient, sessionId: string): Promise<number> {
  const { data } = await db.from(SESSIONS).select("free_used").eq("session_id", sessionId).maybeSingle();
  return data?.free_used ?? 0;
}

async function creditsFor(db: SupabaseClient, userId: string | null): Promise<number> {
  if (!userId) return 0;
  const { data } = await db.from(CREDITS).select("credits").eq("user_id", userId).maybeSingle();
  return data?.credits ?? 0;
}

export async function getUsage(sessionId: string, userId: string | null): Promise<UsageState> {
  const db = admin();
  if (!db) return unconfigured();
  try {
    const freeUsed = await freeUsedFor(db, sessionId);
    const credits = await creditsFor(db, userId);
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
    return unconfigured();
  }
}

/** Record one successful scan: spend a free scan first, else a paid credit. */
export async function consumeScan(sessionId: string, userId: string | null): Promise<void> {
  const db = admin();
  if (!db) return;
  const now = new Date().toISOString();

  const freeUsed = await freeUsedFor(db, sessionId);
  if (freeUsed < FREE_LIMIT) {
    await db
      .from(SESSIONS)
      .upsert({ session_id: sessionId, free_used: freeUsed + 1, updated_at: now }, { onConflict: "session_id" });
    return;
  }

  if (userId) {
    const credits = await creditsFor(db, userId);
    if (credits > 0) {
      await db
        .from(CREDITS)
        .upsert({ user_id: userId, credits: credits - 1, updated_at: now }, { onConflict: "user_id" });
    }
  }
}

/** Add purchased credits to a user account (called from the Dodo webhook). */
export async function addCredits(userId: string, amount: number): Promise<void> {
  const db = admin();
  if (!db) return;
  const credits = await creditsFor(db, userId);
  await db
    .from(CREDITS)
    .upsert(
      { user_id: userId, credits: credits + amount, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
}
