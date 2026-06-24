import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase SSR client (anon key) for reading the auth session on the server.
 * Used for login/identity only; metering writes use the service-role client in
 * lib/usage.ts.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component; safe to ignore.
          }
        },
      },
    }
  );
}
