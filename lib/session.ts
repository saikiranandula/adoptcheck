import { cookies } from "next/headers";
import { customAlphabet } from "nanoid";

const COOKIE = "ac_sid";
const nano = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 24);
const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Returns the anonymous device session id, creating + persisting one in an
 * httpOnly cookie if absent. AdoptCheck has no accounts; this id is what we
 * meter free scans and attach purchased credits against.
 *
 * Defensive by design: if there is no request/cookie context (e.g. unit
 * tests), it returns an ephemeral id and never throws.
 */
export async function getSessionId(): Promise<string> {
  try {
    const store = await cookies();
    const existing = store.get(COOKIE)?.value;
    if (existing) return existing;

    const id = nano();
    store.set(COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ONE_YEAR,
    });
    return id;
  } catch {
    return nano();
  }
}

/** Read-only peek at the session id; null if none set. Never throws. */
export async function peekSessionId(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}
