import crypto from "node:crypto";
import { cookies } from "next/headers";
import { dbStore } from "@/lib/db/store";
import { DbSession } from "@/lib/db/schema";

export const SESSION_COOKIE_NAME = "nityasadhana_session";
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Computes SHA-256 hash of a raw token string for secure database storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generates a cryptographically secure 256-bit random hex string.
 */
export function generateRandomToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Sets the secure HTTP-only session cookie in the Next.js response headers.
 */
export async function setSessionCookie(rawToken: string, expiresAt: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

/**
 * Reads the session token from the incoming HTTP request cookies.
 */
export async function getSessionTokenFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    return cookie?.value || null;
  } catch {
    return null;
  }
}

/**
 * Clears the session cookie.
 */
export async function clearSessionCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
      maxAge: 0,
    });
  } catch {
    // Ignore cookie store errors in non-request contexts
  }
}

/**
 * Creates a new server-side session for the given user, persists it to the database,
 * and attaches the secure HTTP-only cookie.
 */
export async function createSessionForUser(userId: string): Promise<{
  session: DbSession;
  rawToken: string;
}> {
  const rawToken = generateRandomToken();
  const sessionTokenHash = hashToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS).toISOString();
  const sessionId = `sess_${Date.now()}_${generateRandomToken().slice(0, 8)}`;

  const session: DbSession = {
    id: sessionId,
    sessionTokenHash,
    userId,
    expiresAt,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await dbStore.createSession(session);
  await setSessionCookie(rawToken, expiresAt);

  return { session, rawToken };
}

/**
 * Destroys the current session from the database and removes the authentication cookie.
 */
export async function destroyCurrentSession(): Promise<boolean> {
  const rawToken = await getSessionTokenFromCookies();
  if (!rawToken) {
    await clearSessionCookie();
    return false;
  }

  const tokenHash = hashToken(rawToken);
  const deleted = await dbStore.deleteSessionByTokenHash(tokenHash);
  await clearSessionCookie();
  return deleted;
}

/**
 * Destroys all active sessions for a user (e.g. after password reset).
 */
export async function destroyAllSessionsForUser(userId: string): Promise<number> {
  const count = await dbStore.deleteSessionsByUserId(userId);
  await clearSessionCookie();
  return count;
}
