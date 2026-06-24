import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listReports } from "@/lib/reports";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export default async function HistoryPage() {
  const user = await getCurrentUser();

  return (
    <main className="shell">
      <nav className="topbar" aria-label="Main navigation">
        <div className="brand">
          <span>AdoptCheck</span>
        </div>
        <div className="top-actions">
          <Link className="quiet-link" href="/">
            &larr; New check
          </Link>
          {user && (
            <a className="quiet-link" href="/auth/sign-out">
              Sign out
            </a>
          )}
        </div>
      </nav>

      <section className="hero" aria-labelledby="history-title">
        <div className="hero-copy">
          <p className="eyebrow">Your checks</p>
          <h1 id="history-title">Check history</h1>
          <p className="lede">Every repo you&apos;ve scanned while signed in, newest first. Open one to view or share it.</p>
        </div>
      </section>

      {!user ? (
        <div className="status">
          <span>
            <Link className="quiet-link" href="/login?next=/history">
              Sign in
            </Link>{" "}
            to save and revisit your repo checks across devices.
          </span>
        </div>
      ) : (
        <HistoryList userId={user.id} />
      )}
    </main>
  );
}

async function HistoryList({ userId }: { userId: string }) {
  const reports = await listReports(userId);

  if (reports.length === 0) {
    return (
      <div className="status">
        <span>
          No checks yet. <Link className="quiet-link" href="/">Run your first scan</Link>.
        </span>
      </div>
    );
  }

  return (
    <section className="report" aria-label="Past checks">
      <ul className="history-list">
        {reports.map((r) => (
          <li key={r.slug}>
            <Link className="history-item" href={`/r/${r.slug}`}>
              <span className="history-repo">{r.repoFullName}</span>
              <span className={`history-verdict verdict-${r.verdict.toLowerCase()}`}>{r.verdict}</span>
              <span className="history-date">{formatDate(r.createdAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
