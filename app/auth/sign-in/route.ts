import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const providers = new Set(["github", "google"]);

function safeNext(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const provider = searchParams.get("provider");
  const next = safeNext(searchParams.get("next"));

  if (!provider || !providers.has(provider)) {
    return NextResponse.redirect(`${origin}/login?error=invalid_provider`);
  }

  const supabase = await createClient();
  const redirectTo = new URL("/auth/callback", origin);
  redirectTo.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as "github" | "google",
    options: { redirectTo: redirectTo.toString() },
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/login?error=oauth_start_failed`);
  }

  return NextResponse.redirect(data.url);
}
