import { NextRequest, NextResponse } from "next/server";
import DodoPayments from "dodopayments";
import { getSessionId } from "@/lib/session";

export const runtime = "nodejs";

// Instantiated lazily inside the handler so the app builds/runs without
// Dodo configured (the DodoPayments client throws if no bearer token).
function getDodo(): DodoPayments {
  return new DodoPayments({
    bearerToken: process.env.DODO_SECRET_KEY!,
    environment: process.env.DODO_ENVIRONMENT === "test_mode" ? "test_mode" : "live_mode",
  });
}

const PRODUCTS = {
  single: {
    product_id: process.env.DODO_PRODUCT_ID_SINGLE!,
    credits: 1,
  },
  pack: {
    product_id: process.env.DODO_PRODUCT_ID_PACK!,
    credits: 20,
  },
} as const;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://adoptcheck.nullhype.tech";

function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.DODO_SECRET_KEY) {
      return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const tier = body.tier === "pack" ? "pack" : "single";
    const product = PRODUCTS[tier];

    if (!product.product_id) {
      return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
    }
    if (!isValidEmail(body.email)) {
      return NextResponse.json({ error: "A valid email is required for your receipt." }, { status: 400 });
    }

    // Credits are attached to the anonymous device session, not an account.
    const sessionId = await getSessionId();

    const session = await getDodo().payments.create({
      billing: { city: "", country: "US", state: "", street: "", zipcode: "" },
      customer: { email: body.email, name: body.email },
      product_cart: [{ product_id: product.product_id, quantity: 1 }],
      payment_link: true,
      return_url: `${APP_URL}/?purchased=true`,
      metadata: {
        adoptcheck_session_id: sessionId,
        tier,
        credits: String(product.credits),
      },
    });

    return NextResponse.json({ url: session.payment_link });
  } catch (error) {
    console.error("Dodo checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
