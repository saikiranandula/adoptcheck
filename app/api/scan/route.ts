import { NextResponse } from "next/server";
import { GitHubApiError, fetchRepoSnapshot, parseGitHubRepo, repoInputSchema } from "@/lib/github";
import { generateLLMAnalysis } from "@/lib/llm";
import { attachLLMAnalysis, buildRepoReport } from "@/lib/report";
import { getSessionId } from "@/lib/session";
import { consumeScan, getUsage } from "@/lib/usage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = repoInputSchema.parse(await request.json());
    const parsed = parseGitHubRepo(body.repo);

    // Meter free scans per anonymous device. Fails open when the store is
    // not configured, so the scanner keeps working during rollout.
    const sessionId = await getSessionId();
    const usage = await getUsage(sessionId);
    if (usage.configured && !usage.allowed) {
      return NextResponse.json(
        { error: "FREE_TIER_EXHAUSTED", usage },
        { status: 402 }
      );
    }

    const snapshot = await fetchRepoSnapshot(parsed);
    const deterministicReport = buildRepoReport(snapshot);
    const analysis = await generateLLMAnalysis(deterministicReport);
    const report = attachLLMAnalysis(deterministicReport, analysis);

    // Only a successful scan spends an allowance.
    if (usage.configured) {
      await consumeScan(sessionId);
    }

    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof GitHubApiError) {
      return NextResponse.json(
        {
          error: error.status === 404 ? "Repository not found or not public." : error.message,
          status: error.status,
          rateLimitRemaining: error.rateLimitRemaining
        },
        { status: error.status === 403 ? 429 : error.status }
      );
    }

    const message = error instanceof Error ? error.message : "Unable to scan repository.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
