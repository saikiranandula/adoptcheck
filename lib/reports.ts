import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { customAlphabet } from "nanoid";
import type { RepoReport } from "@/lib/types";

const TABLE = "adoptcheck_reports";
// Unambiguous alphabet (no 0/o/1/l/i) for shareable slugs.
const newSlug = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 10);

function admin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface ReportListItem {
  slug: string;
  repoFullName: string;
  verdict: string;
  createdAt: string;
}

/** Persist a completed scan to a user's history. Returns the share slug, or null. */
export async function saveReport(userId: string, report: RepoReport): Promise<string | null> {
  const db = admin();
  if (!db) return null;
  const slug = newSlug();
  try {
    const { error } = await db.from(TABLE).insert({
      user_id: userId,
      slug,
      repo_full_name: report.repo.fullName,
      verdict: report.verdict,
      report_data: report,
    });
    if (error) {
      console.error("saveReport failed:", error.message);
      return null;
    }
    return slug;
  } catch (err) {
    console.error("saveReport error:", err);
    return null;
  }
}

/** Public read of a shared report by slug. */
export async function getReportBySlug(slug: string): Promise<RepoReport | null> {
  const db = admin();
  if (!db) return null;
  try {
    const { data } = await db.from(TABLE).select("report_data").eq("slug", slug).maybeSingle();
    return (data?.report_data as RepoReport) ?? null;
  } catch {
    return null;
  }
}

/** A user's recent checks, newest first. */
export async function listReports(userId: string): Promise<ReportListItem[]> {
  const db = admin();
  if (!db) return [];
  try {
    const { data } = await db
      .from(TABLE)
      .select("slug, repo_full_name, verdict, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    return (data ?? []).map((r) => ({
      slug: r.slug as string,
      repoFullName: (r.repo_full_name as string) ?? "",
      verdict: (r.verdict as string) ?? "—",
      createdAt: r.created_at as string,
    }));
  } catch {
    return [];
  }
}
