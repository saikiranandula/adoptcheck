import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { getUsage } from "@/lib/usage";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const sessionId = await getSessionId();
  const user = await getCurrentUser();
  const usage = await getUsage(sessionId, user?.id ?? null);
  return NextResponse.json({
    ...usage,
    user: user ? { email: user.email } : null,
  });
}
