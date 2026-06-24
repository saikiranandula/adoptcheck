import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function signOut(request: Request) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}

export const GET = signOut;
export const POST = signOut;
