import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { addCredits } from "@/lib/usage";

export const runtime = "nodejs";

interface WebhookPayload {
  type: string;
  data: {
    metadata?: {
      adoptcheck_session_id?: string;
      tier?: string;
      credits?: string;
    };
    [key: string]: unknown;
  };
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const webhookSecret = process.env.DODO_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }

    const webhook = new Webhook(webhookSecret);
    let payload: WebhookPayload;

    try {
      payload = webhook.verify(rawBody, {
        "webhook-id": req.headers.get("webhook-id") ?? "",
        "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
        "webhook-signature": req.headers.get("webhook-signature") ?? "",
      }) as WebhookPayload;
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (payload.type === "payment.succeeded") {
      const sessionId = payload.data.metadata?.adoptcheck_session_id;
      const credits = parseInt(payload.data.metadata?.credits ?? "1", 10);

      if (sessionId && Number.isFinite(credits) && credits > 0) {
        await addCredits(sessionId, credits);
        console.log(`Added ${credits} AdoptCheck credits to session ${sessionId}`);
      } else {
        console.warn("payment.succeeded without a usable adoptcheck_session_id in metadata");
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
