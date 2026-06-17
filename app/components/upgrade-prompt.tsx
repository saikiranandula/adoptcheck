"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";

interface UpgradePromptProps {
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
    perks: ["20 full reports", "Everything in single", "No expiry", "Best for evaluating a stack"],
    best: true,
  },
];

export function UpgradePrompt({ onClose }: UpgradePromptProps) {
  const [loading, setLoading] = useState<"single" | "pack" | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handlePurchase(tier: "single" | "pack") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email so we can send your receipt.");
      return;
    }
    setLoading(tier);
    setError(null);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, email }),
      });
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

        <label className="paywall-label" htmlFor="paywall-email">
          Email (for your receipt)
        </label>
        <input
          id="paywall-email"
          className="repo-input"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />

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

        {error && <p className="paywall-error" role="alert">{error}</p>}

        <p className="paywall-foot">Secure checkout via Dodo Payments.</p>
      </div>
    </div>
  );
}
