"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { track } from "@vercel/analytics";

interface UpgradePromptProps {
  user: { email: string | null } | null;
  onClose?: () => void;
}

const TIERS = [
  {
    id: "single" as const,
    price: "$2.99",
    name: "1 repo check",
    note: "one-time",
    perks: ["One full AdoptCheck report", "Evidence-backed verdict", "AI analyst layer", "Markdown + JSON export"],
    best: false,
  },
  {
    id: "pack" as const,
    price: "$4.99",
    name: "20 repo checks",
    note: "one-time · ~$0.25 each",
    perks: ["20 full reports", "Everything in single", "No expiry", "Credits stay on your account"],
    best: true,
  },
];

export function UpgradePrompt({ user, onClose }: UpgradePromptProps) {
  const [loading, setLoading] = useState<"single" | "pack" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePurchase(tier: "single" | "pack") {
    setLoading(tier);
    setError(null);
    track("checkout_started", { product: "adoptcheck", tier });
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      if (res.status === 401) {
        window.location.href = "/login?next=/";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      window.location.href = data.url;
    } catch (err) {
      console.error("Checkout error:", err);
      setError(err instanceof Error ? err.message : "Could not start checkout. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="paywall-overlay" role="dialog" aria-modal="true" aria-label="Upgrade AdoptCheck">
      <div className="paywall-card">
        {onClose && (
          <button className="paywall-close" type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        )}

        <p className="eyebrow">You&apos;ve used your free repo checks</p>
        <h2 className="paywall-title">Keep checking repos</h2>
        <p className="paywall-sub">
          AdoptCheck is open source and free for your first 3 checks. One-time payments, no subscription.
        </p>

        {!user ? (
          <div className="paywall-auth">
            <p className="paywall-sub" style={{ marginTop: 4 }}>
              Sign in to buy credits — they stay on your account, across devices.
            </p>
            <a className="paywall-auth-btn" href="/auth/sign-in?provider=github&next=/">
              Continue with GitHub
            </a>
            <a className="paywall-auth-btn" href="/auth/sign-in?provider=google&next=/">
              Continue with Google
            </a>
          </div>
        ) : (
          <>
            <p className="paywall-signedin">
              Signed in as <strong>{user.email}</strong>
            </p>
            <div className="paywall-tiers">
              {TIERS.map((tier) => (
                <div key={tier.id} className={`paywall-tier${tier.best ? " paywall-tier-best" : ""}`}>
                  {tier.best && <span className="paywall-badge">Best value</span>}
                  <div className="paywall-price">{tier.price}</div>
                  <div className="paywall-tier-name">{tier.name}</div>
                  <div className="paywall-tier-note">{tier.note}</div>
                  <ul className="paywall-perks">
                    {tier.perks.map((perk) => (
                      <li key={perk}>✓ {perk}</li>
                    ))}
                  </ul>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => handlePurchase(tier.id)}
                    disabled={loading !== null}
                  >
                    {loading === tier.id ? <Loader2 size={16} className="spin" /> : null}
                    {loading === tier.id ? "Redirecting" : `Buy ${tier.name}`}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {error && (
          <p className="paywall-error" role="alert">
            {error}
          </p>
        )}

        <p className="paywall-foot">Secure checkout via Dodo Payments.</p>
      </div>
    </div>
  );
}
