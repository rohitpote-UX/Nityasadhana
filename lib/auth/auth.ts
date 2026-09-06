import { UserRole, AuthenticatedUser } from "@/types/auth";
import { isValidRole } from "./roles";
import { dbStore } from "@/lib/db/store";
import { DbUser, DbSession } from "@/lib/db/schema";
import {
  getSessionTokenFromCookies,
  hashToken,
  createSessionForUser,
  destroyCurrentSession,
} from "./session";

export function normalizeRoleValue(value: unknown): UserRole | null {
  if (!value || typeof value !== "string") return null;

  const role = value.trim().toLowerCase();
  if (role === "guru") return "guru";
  if (role === "shishya" || role === "student") return "shishya";
  return null;
}

/**
 * Resolves the active server session and the corresponding user record.
 * Fails closed if the cookie is absent, expired, or invalid.
 */
export async function getCurrentSession(): Promise<{
  session: DbSession;
  user: DbUser;
} | null> {
  try {
    const rawToken = await getSessionTokenFromCookies();
    if (!rawToken) return null;

    const tokenHash = hashToken(rawToken);
    const session = await dbStore.getSessionByTokenHash(tokenHash);
    if (!session) return null;

    const user = await dbStore.getUserById(session.userId);
    if (!user || user.status !== "active") return null;

    return { session, user };
  } catch (err) {
    console.error("[Auth] Error resolving current session:", err);
    return null;
  }
}

/**
 * Extracts the authenticated user's server-authoritative role from the active database session.
 * Fails closed (returns null) if unauthenticated.
 */
export async function getCurrentRole(): Promise<UserRole | null> {
  try {
    const sessionData = await getCurrentSession();
    if (!sessionData) return null;
    return isValidRole(sessionData.user.role) ? sessionData.user.role : null;
  } catch (error) {
    console.error("[Auth] Error reading user role:", error);
    return null;
  }
}

/**
 * Returns the normalized Nityasādhanā application user from the server session.
 * CRITICAL SECURITY: Excludes passwordHash and never sends secrets to caller.
 */
export async function getCurrentAuthUser(): Promise<AuthenticatedUser | null> {
  try {
    const sessionData = await getCurrentSession();
    if (!sessionData) return null;

    const { user } = sessionData;

    return {
      id: user.id,
      authProviderId: user.authProviderId || user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      spiritualName: user.spiritualName,
      ashramId: user.ashramId,
      linkedGuruId: user.linkedGuruId,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch (error) {
    console.error("[Auth] Error fetching current user:", error);
    return null;
  }
}

/**
 * Helper to check if a user is currently authenticated on the server.
 */
export async function isUserAuthenticated(): Promise<boolean> {
  try {
    const user = await getCurrentAuthUser();
    return Boolean(user);
  } catch {
    return false;
  }
}

export { createSessionForUser, destroyCurrentSession };
