"use server";

// ============================================================
// NITYASĀDHANĀ — FIRST-PARTY AUTHENTICATION SERVER ACTIONS
// ============================================================

import { headers } from "next/headers";
import { dbStore } from "@/lib/db/store";
import { DbUser } from "@/lib/db/schema";
import { UserRole } from "@/types/auth";
import { hashPassword, verifyPassword, isPasswordValid } from "@/lib/auth/password";
import {
  createSessionForUser,
  destroyCurrentSession,
  destroyAllSessionsForUser,
  generateRandomToken,
  hashToken,
} from "@/lib/auth/session";
import { getCurrentRole } from "@/lib/auth/auth";
import { getPostAuthRedirectUrl, sanitizeRedirectUrl } from "@/lib/auth/redirects";
import { normalizeEmail, isValidEmail } from "@/lib/validations";
import { rateLimiter, RATE_LIMITS, getClientIp } from "@/lib/security/rate-limit";
import { InvitationService } from "@/lib/invitations/service";
import { EmailService } from "@/lib/email/service";

export interface AuthActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  redirectUrl?: string;
  message?: string;
}

/**
 * Server Action: Authenticates a user with email & password.
 * Establishes a server session with an HttpOnly cookie and returns the role dashboard.
 */
export async function loginAction(params: {
  email: string;
  password: string;
  redirectUrl?: string | null;
  preferredRole?: UserRole | null;
}): Promise<AuthActionResult> {
  try {
    const headersList = await headers();
    const clientIp = getClientIp(headersList);
    const normalizedEmail = normalizeEmail(params.email);

    // Rate Limiting (per IP and per targeted email)
    const rateKey = `auth_login:${clientIp}:${normalizedEmail}`;
    const rateCheck = rateLimiter.check(
      rateKey,
      RATE_LIMITS.AUTH_LOGIN.limit,
      RATE_LIMITS.AUTH_LOGIN.windowMs
    );

    if (!rateCheck.allowed) {
      return {
        success: false,
        error: "Too many login attempts. Please wait a few minutes before trying again.",
      };
    }

    if (!normalizedEmail || !params.password) {
      return {
        success: false,
        error: "Please enter both email and password.",
      };
    }

    const user = await dbStore.getUserByEmail(normalizedEmail);

    if (!user) {
      return {
        success: false,
        error: "Incorrect email or password. Please check and try again.",
      };
    }

    if (user.status !== "active") {
      return {
        success: false,
        error: "This account is currently inactive. Please contact your coordinator.",
      };
    }

    // Existing legacy Clerk account migration check:
    // If account exists from before first-party auth and has no passwordHash yet:
    if (!user.passwordHash) {
      return {
        success: false,
        error:
          "This account requires setting a password. Please click 'Forgot password?' below to set your password.",
      };
    }

    const passwordsMatch = await verifyPassword(params.password, user.passwordHash);
    if (!passwordsMatch) {
      return {
        success: false,
        error: "Incorrect email or password. Please check and try again.",
      };
    }

    // Reset rate limiter on successful authentication
    rateLimiter.reset(rateKey);

    // Create server-side session & set HttpOnly cookie
    await createSessionForUser(user.id);

    // Resolve post-login destination safely
    const targetRedirect = await resolvePostLoginDestination(user.role, params.redirectUrl);

    return {
      success: true,
      redirectUrl: targetRedirect,
    };
  } catch (err) {
    console.error("[Auth] loginAction error:", err);
    return {
      success: false,
      error: "An unexpected error occurred during login. Please try again.",
    };
  }
}

/**
 * Server Action: Registers a new user account.
 * Automatically hashes passwords, derives roles server-side, binds invitations,
 * and sets the active session.
 */
export async function signupAction(params: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: "guru" | "shishya";
  invitationSecret?: string | null;
}): Promise<AuthActionResult> {
  try {
    const headersList = await headers();
    const clientIp = getClientIp(headersList);

    // Rate Limiting
    const rateKey = `auth_signup:${clientIp}`;
    const rateCheck = rateLimiter.check(
      rateKey,
      RATE_LIMITS.AUTH_SIGNUP.limit,
      RATE_LIMITS.AUTH_SIGNUP.windowMs
    );

    if (!rateCheck.allowed) {
      return {
        success: false,
        error: "Too many accounts created from this network. Please try again later.",
      };
    }

    const trimmedName = (params.name || "").trim();
    const normalizedEmail = normalizeEmail(params.email);

    if (!trimmedName) {
      return { success: false, error: "Please enter your name." };
    }

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return { success: false, error: "Please enter a valid email address." };
    }

    if (!isPasswordValid(params.password)) {
      return {
        success: false,
        error: "Please choose a password with at least 8 characters.",
      };
    }

    if (params.password !== params.confirmPassword) {
      return { success: false, error: "Passwords do not match." };
    }

    // Check email uniqueness
    const existing = await dbStore.getUserByEmail(normalizedEmail);
    if (existing) {
      return {
        success: false,
        error: "This email is already registered. Try signing in instead.",
      };
    }

    // Enforce server-side role determination
    const role: UserRole = params.role === "guru" ? "guru" : "shishya";
    const passwordHash = await hashPassword(params.password);
    const nowIso = new Date().toISOString();

    if (role === "guru") {
      // Guru Signup Flow:
      const guruId = `guru_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const newGuru: DbUser = {
        id: guruId,
        authProviderId: guruId,
        role: "guru",
        name: trimmedName,
        spiritualName: trimmedName,
        email: normalizedEmail,
        passwordHash,
        status: "active",
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await dbStore.createUser(newGuru);
      await createSessionForUser(newGuru.id);

      return {
        success: true,
        redirectUrl: "/guru",
      };
    } else {
      // Shishya Signup Flow:
      const shishyaId = `shishya_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const cleanSecret = (params.invitationSecret || "").trim();

      let invitationId: string | undefined = undefined;

      if (cleanSecret) {
        const validation = await InvitationService.validateInvitationSecret(cleanSecret);
        if (!validation.isValid) {
          return {
            success: false,
            error: validation.errorReason || "The invitation code or link is invalid or expired.",
          };
        }
        invitationId = validation.id;
      }

      const newShishya: DbUser = {
        id: shishyaId,
        authProviderId: shishyaId,
        role: "shishya",
        name: trimmedName,
        spiritualName: trimmedName,
        email: normalizedEmail,
        passwordHash,
        status: "active",
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await dbStore.createUser(newShishya);

      // If invitation was provided, atomically accept it and establish Guru-Shishya bond
      if (cleanSecret && invitationId) {
        const acceptance = await InvitationService.acceptInvitation({
          secret: cleanSecret,
          shishya: newShishya,
        });

        if (!acceptance.success) {
          console.warn("[Auth] Shishya created but invitation acceptance failed:", acceptance.error);
        }
      }

      await createSessionForUser(newShishya.id);

      return {
        success: true,
        redirectUrl: "/student",
      };
    }
  } catch (err) {
    console.error("[Auth] signupAction error:", err);
    return {
      success: false,
      error: "Unable to complete registration. Please check your details and try again.",
    };
  }
}

/**
 * Server Action: Logs out the current user by destroying the server session
 * and clearing the cookie.
 */
export async function logoutAction(): Promise<AuthActionResult> {
  try {
    await destroyCurrentSession();
    return {
      success: true,
      redirectUrl: "/login",
    };
  } catch (err) {
    console.error("[Auth] logoutAction error:", err);
    return {
      success: true,
      redirectUrl: "/login",
    };
  }
}

/**
 * Server Action: Initiates a password reset request.
 * Dispatches a single-use random reset token. Always returns a generic, calm confirmation
 * to prevent account enumeration attacks.
 */
export async function requestPasswordResetAction(email: string): Promise<AuthActionResult> {
  const genericMessage =
    "If an account is associated with this email, a password reset link has been sent.";

  try {
    const headersList = await headers();
    const clientIp = getClientIp(headersList);
    const normalizedEmail = normalizeEmail(email);

    // Rate Limiting
    const rateKey = `auth_forgot:${clientIp}:${normalizedEmail}`;
    const rateCheck = rateLimiter.check(
      rateKey,
      RATE_LIMITS.AUTH_FORGOT_PASSWORD.limit,
      RATE_LIMITS.AUTH_FORGOT_PASSWORD.windowMs
    );

    if (!rateCheck.allowed) {
      return {
        success: true,
        message: genericMessage,
      };
    }

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return {
        success: true,
        message: genericMessage,
      };
    }

    const user = await dbStore.getUserByEmail(normalizedEmail);
    if (!user || user.status !== "active") {
      return {
        success: true,
        message: genericMessage,
      };
    }

    // Generate single-use reset token (1 hour expiration)
    const rawToken = generateRandomToken();
    const tokenHash = hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour
    const tokenId = `prt_${Date.now()}_${generateRandomToken().slice(0, 8)}`;

    await dbStore.createPasswordResetToken({
      id: tokenId,
      tokenHash,
      userId: user.id,
      expiresAt,
      createdAt: now.toISOString(),
    });

    // Send reset link via transactional email service
    await EmailService.sendPasswordResetEmail({
      toEmail: user.email,
      recipientName: user.spiritualName || user.name,
      rawToken,
    });

    return {
      success: true,
      message: genericMessage,
    };
  } catch (err) {
    console.error("[Auth] requestPasswordResetAction error:", err);
    return {
      success: true,
      message: genericMessage,
    };
  }
}

/**
 * Server Action: Finalizes password reset using a verified reset token.
 * Updates passwordHash, marks token as used, and invalidates all existing sessions.
 */
export async function resetPasswordAction(params: {
  token: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthActionResult> {
  try {
    const headersList = await headers();
    const clientIp = getClientIp(headersList);

    const rateKey = `auth_reset:${clientIp}`;
    const rateCheck = rateLimiter.check(
      rateKey,
      RATE_LIMITS.AUTH_RESET_PASSWORD.limit,
      RATE_LIMITS.AUTH_RESET_PASSWORD.windowMs
    );

    if (!rateCheck.allowed) {
      return {
        success: false,
        error: "Too many attempts. Please try again later.",
      };
    }

    const cleanToken = (params.token || "").trim();
    if (!cleanToken) {
      return {
        success: false,
        error: "Invalid or missing password reset token.",
      };
    }

    if (!isPasswordValid(params.password)) {
      return {
        success: false,
        error: "Password must be at least 8 characters long.",
      };
    }

    if (params.password !== params.confirmPassword) {
      return {
        success: false,
        error: "Passwords do not match.",
      };
    }

    const tokenHash = hashToken(cleanToken);
    const resetRecord = await dbStore.getPasswordResetTokenByHash(tokenHash);

    if (!resetRecord) {
      return {
        success: false,
        error: "This reset link is invalid, expired, or has already been used.",
      };
    }

    const newHash = await hashPassword(params.password);

    // Update password in database
    await dbStore.updateUserPassword(resetRecord.userId, newHash);

    // Mark token as used to prevent replay attacks
    await dbStore.markPasswordResetTokenUsed(resetRecord.id);

    // Invalidate all existing sessions for this user for security
    await destroyAllSessionsForUser(resetRecord.userId);

    return {
      success: true,
      message: "Your password has been updated. Please sign in with your new password.",
      redirectUrl: "/login?message=password_reset_success",
    };
  } catch (err) {
    console.error("[Auth] resetPasswordAction error:", err);
    return {
      success: false,
      error: "Unable to reset password. Please request a new reset link.",
    };
  }
}

/**
 * Resolves post-login destinations based strictly on server-verified role.
 */
async function resolvePostLoginDestination(
  role: UserRole,
  intendedUrl?: string | null
): Promise<string> {
  if (intendedUrl) {
    const sanitized = sanitizeRedirectUrl(intendedUrl);
    // Boundary checks: Gurus cannot be redirected into /student, Shishyas cannot be redirected into /guru
    if (role === "guru" && !sanitized.startsWith("/student")) {
      if (sanitized !== "/" && sanitized !== "/login" && sanitized !== "/signup") {
        return sanitized;
      }
    }
    if (role === "shishya" && !sanitized.startsWith("/guru")) {
      if (sanitized !== "/" && sanitized !== "/login" && sanitized !== "/signup") {
        return sanitized;
      }
    }
  }

  return getPostAuthRedirectUrl(role);
}

/**
 * Kept for backward compatibility with existing client components during transition.
 */
export async function resolvePostLoginRedirectAction(
  intendedUrl?: string | null,
  preferredRole?: UserRole | null
): Promise<{ success: boolean; redirectUrl: string }> {
  const role = preferredRole || (await getCurrentRole());
  if (!role) {
    return { success: false, redirectUrl: "/login?error=unauthorized_role" };
  }
  const url = await resolvePostLoginDestination(role, intendedUrl);
  return { success: true, redirectUrl: url };
}
