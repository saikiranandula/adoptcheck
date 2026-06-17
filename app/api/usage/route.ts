import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { getUsage } from "@/lib/usage";

export const runtime = "nodejs";

export async function GET() {
  const sessionId = await getSessionId();
  const usage = await getUsage(sessionId);
  return NextResponse.json(usage);
}
