"use client";

import { AlertTriangle, Brain, Check, Copy, Download, ExternalLink, FileJson, GitBranch, Loader2, Search } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { RepoReport } from "@/lib/types";
import { UpgradePrompt } from "./upgrade-prompt";

interface UsageState {
  freeRemaining: number;
  freeLimit: number;
  credits: number;
  configured: boolean;
  user: { email: string | null } | null;
}

const examples = ["vercel/next.js", "langchain-ai/langchainjs", "modelcontextprotocol/typescript-sdk"];

export function Scanner() {
  const [input, setInput] = useState("");
  const [report, setReport] = useState<RepoReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<"markdown" | "json" | null>(null);
  const [usage, setUsage] = useState<UsageState | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const refreshUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/usage", { cache: "no-store" });
      if (res.ok) setUsage((await res.json()) as UsageState);
    } catch {
      // non-fatal; metering UI is best-effort
    }
  }, []);

  useEffect(() => {
    refreshUsage();
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("purchased") === "true") {
      // Purchased credits arrive via webhook; poll briefly so the UI reflects them.
      const timers = [800, 2000, 4000].map((ms) => window.setTimeout(refreshUsage, ms));
      return () => timers.forEach((timer) => window.clearTimeout(timer));
    }
  }, [refreshUsage]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setReport(null);
    setCopied(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: input })
      });
      const payload = (await response.json()) as RepoReport | { error?: string };

      if (response.status === 402 || (typeof payload === "object" && "error" in payload && payload.error === "FREE_TIER_EXHAUSTED")) {
        setShowPaywall(true);
        refreshUsage();
        return;
      }

      if (!response.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Scan failed.");
      }

      setReport(payload as RepoReport);
      refreshUsage();
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Scan failed.");
    } finally {
      setLoading(false);
    }
  }

  async function copy(kind: "markdown" | "json") {
    if (!report) return;
    const value = kind === "markdown" ? report.markdown : JSON.stringify(report, null, 2);
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
  }

  const jsonReport = useMemo(() => (report ? JSON.stringify(report, null, 2) : ""), [report]);

  return (
    <main className="shell">
      <nav className="topbar" aria-label="Main navigation">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Check size={17} />
          </span>
          <span>AdoptCheck</span>
        </div>
        <div className="top-actions">
          {usage?.user ? (
            <span className="auth-state">
              {usage.user.email}
              {" · "}
              <a className="quiet-link" href="/auth/sign-out">
                Sign out
              </a>
            </span>
          ) : (
            <a className="quiet-link" href="/login?next=/">
              Sign in
            </a>
          )}
          <a className="quiet-link" href="https://nullhype.tech" target="_blank" rel="noreferrer">
            nullhype.tech
          </a>
        </div>
      </nav>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Open-source repo due diligence</p>
          <h1 id="hero-title">Should you trust this repo?</h1>
          <p className="lede">
            Paste a GitHub repository and get an evidence-backed verdict before you install, fork, feature, or ship it.
          </p>
        </div>

        <div className="scan-panel">
          <form className="scan-form" onSubmit={submit}>
            <input
              className="repo-input"
              aria-label="GitHub repository"
              placeholder="owner/repo or https://github.com/owner/repo"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              autoComplete="off"
            />
            <button className="primary-button" type="submit" disabled={loading || input.trim().length < 3}>
              {loading ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
              {loading ? "Scanning" : "Scan repo"}
            </button>
          </form>
          <div className="examples" aria-label="Example repositories">
            <span>Try</span>
            {examples.map((example) => (
              <button key={example} className="example-button" type="button" onClick={() => setInput(example)}>
                {example}
              </button>
            ))}
          </div>
          {usage?.configured && (
            <p className="usage-note">
              {usage.credits > 0
                ? `${usage.credits} paid check${usage.credits === 1 ? "" : "s"} remaining`
                : `${usage.freeRemaining} of ${usage.freeLimit} free checks left`}
            </p>
          )}
        </div>
      </section>

      {loading && <div className="status">Collecting GitHub metadata, README evidence, manifests, releases, CI, and security signals.</div>}

      {error && (
        <div className="status error" role="alert">
          <AlertTriangle size={17} /> {error}
        </div>
      )}

      {report && (
        <section className="report" aria-label={`Due diligence report for ${report.repo.fullName}`}>
          <div className="verdict-band">
            <div>
              <p className="verdict-kicker">Verdict</p>
              <h2 className="verdict-title">
                <span className={`verdict-${report.verdict.toLowerCase()}`}>{report.verdict}</span>
                <span className="verdict-pill">{report.confidence} confidence</span>
              </h2>
              <p className="bottom-line">{report.bottomLine}</p>
            </div>
            <div className="report-actions">
              <a className="icon-button" href={report.repo.htmlUrl} target="_blank" rel="noreferrer" title="Open GitHub repo">
                <GitBranch size={18} />
              </a>
              <button className="secondary-button" type="button" onClick={() => copy("markdown")}>
                <Copy size={16} /> {copied === "markdown" ? "Copied" : "Markdown"}
              </button>
              <button className="secondary-button" type="button" onClick={() => copy("json")}>
                <FileJson size={16} /> {copied === "json" ? "Copied" : "JSON"}
              </button>
              <DownloadLink report={report} />
            </div>
          </div>

          <div className="grid">
            <div className="section">
              <h2>Scores</h2>
              <ul className="score-list">
                {report.scores.map((score) => (
                  <li className="score-row" key={score.category}>
                    <span className="score-name">{score.name}</span>
                    <span className="score-label">
                      {score.label} · {score.score}/100
                    </span>
                    <span className="meter" aria-hidden="true">
                      <span style={{ width: `${score.score}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="section">
              <h2>Recommended Action</h2>
              <ul className="risk-list">
                <li>{report.recommendedAction}</li>
                <li>{report.nullhypeAngle}</li>
              </ul>
            </div>
          </div>

          <div className="grid">
            <div className="section">
              <h2>Top Risks</h2>
              <ul className="risk-list">
                {(report.risks.length ? report.risks : ["No major blocker appeared in the deterministic scan."]).map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
            </div>

            <div className="section">
              <h2>Repo Signals</h2>
              <ul className="meta-list">
                <li>{report.repo.stars.toLocaleString()} stars</li>
                <li>{report.repo.forks.toLocaleString()} forks</li>
                <li>{report.repo.openIssues.toLocaleString()} open issues</li>
                <li>{report.repo.license ? report.repo.license.name : "No detected license"}</li>
              </ul>
            </div>
          </div>

          <div className="section ai-section">
            <div className="section-title-row">
              <h2>AI Analyst</h2>
              <span className={`analysis-badge analysis-${report.llmAnalysis.status}`}>
                <Brain size={14} /> {analysisLabel(report.llmAnalysis.status)}
              </span>
            </div>
            {report.llmAnalysis.status === "generated" ? (
              <div className="analysis-body">
                <p>{report.llmAnalysis.summary}</p>
                <dl className="analysis-list">
                  <div>
                    <dt>README Honesty</dt>
                    <dd>{report.llmAnalysis.readmeHonesty}</dd>
                  </div>
                  <div>
                    <dt>Next Action</dt>
                    <dd>{report.llmAnalysis.nextAction}</dd>
                  </div>
                  <div>
                    <dt>Market Angle</dt>
                    <dd>{report.llmAnalysis.nullhypeAngle}</dd>
                  </div>
                </dl>
                <ul className="risk-list">
                  {(report.llmAnalysis.adoptionRisks ?? []).map((risk) => (
                    <li key={risk}>{risk}</li>
                  ))}
                </ul>
                {report.llmAnalysis.evidenceIds?.length ? (
                  <p className="evidence-source">Cites {report.llmAnalysis.evidenceIds.map((id) => id).join(", ")}</p>
                ) : null}
              </div>
            ) : (
              <p className="analysis-body muted-copy">
                {report.llmAnalysis.status === "failed"
                  ? `LLM analysis failed, so this report is using deterministic scoring only. ${report.llmAnalysis.error ?? ""}`
                  : "AI analyst output is unavailable for this scan. The deterministic report remains complete."}
              </p>
            )}
          </div>

          <div className="section">
            <h2>Evidence</h2>
            <ul className="evidence-list">
              {report.evidence.map((item) => (
                <li key={item.id}>
                  <span className="evidence-id">{item.id}</span>
                  <span className="evidence-claim">{item.claim}</span>
                  <span className="evidence-source">
                    {item.type} · {item.source} · {item.confidence}
                    {item.url ? (
                      <>
                        {" · "}
                        <a href={item.url} target="_blank" rel="noreferrer">
                          source <ExternalLink size={12} />
                        </a>
                      </>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <details>
            <summary>Markdown report</summary>
            <pre>{report.markdown}</pre>
          </details>
          <details>
            <summary>Raw JSON</summary>
            <pre>{jsonReport}</pre>
          </details>
        </section>
      )}

      <p className="footer-note">
        AdoptCheck does not clone or execute repository code in this MVP. Treat legal and security signals as adoption-risk evidence,
        not legal or security advice.
      </p>

      {showPaywall && <UpgradePrompt user={usage?.user ?? null} onClose={() => setShowPaywall(false)} />}
    </main>
  );
}

function analysisLabel(status: RepoReport["llmAnalysis"]["status"]) {
  if (status === "generated") return "Generated";
  if (status === "failed") return "Fallback";
  return "Not configured";
}

function DownloadLink({ report }: { report: RepoReport }) {
  const href = useMemo(() => {
    const blob = new Blob([report.markdown], { type: "text/markdown" });
    return URL.createObjectURL(blob);
  }, [report.markdown]);

  return (
    <a className="secondary-button" href={href} download={`${report.repo.owner}-${report.repo.name}-adoptcheck.md`}>
      <Download size={16} /> Download
    </a>
  );
}
