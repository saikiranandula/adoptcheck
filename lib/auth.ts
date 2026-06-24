import { createClient } from "@/lib/supabase/server";

export interface AuthUser {
  id: string;
  email: string | null;
}

/**
 * Returns the signed-in user, or null. Never throws: if auth is not configured
 * (no Supabase public env) or there is no session, returns null so the
 * anonymous free tier keeps working.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    return { id: user.id, email: user.email ?? null };
  } catch {
    return null;
  }
}
