"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAuthUser, requireGuru, requireShishya } from "@/lib/auth";
import { dbStore } from "@/lib/db/store";
import { DbUser } from "@/lib/db/schema";
import { InvitationService, GeneratedInvitationResult } from "@/lib/invitations/service";
import { PublicInvitationDetails } from "@/lib/db/schema";
import { rateLimiter, RATE_LIMITS } from "@/lib/security/rate-limit";

/**
 * Server Action: Guru generates a new secure Shishya invitation.
 */
export async function createInvitationAction(): Promise<{
  success: boolean;
  data?: GeneratedInvitationResult;
  error?: string;
}> {
  try {
    const authUser = await requireGuru();

    // Rate Limit Check
    const rateCheck = rateLimiter.check(
      `invite_create:${authUser.id}`,
      RATE_LIMITS.INVITATION_CREATE.limit,
      RATE_LIMITS.INVITATION_CREATE.windowMs
    );
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: "Too many invitations created recently. Please try again later.",
      };
    }

    // Ensure database user record exists
    let dbUser = await dbStore.getUserById(authUser.id);
    if (!dbUser) {
      dbUser = await dbStore.upsertUser({
        id: authUser.id,
        authProviderId: authUser.authProviderId,
        role: "guru",
        name: authUser.name,
        spiritualName: authUser.spiritualName || authUser.name,
        email: authUser.email,
        status: "active",
        createdAt: authUser.createdAt,
        updatedAt: authUser.updatedAt,
      });
    }

    const invitation = await InvitationService.createGuruInvitation(dbUser);
    revalidatePath("/guru/shishyas");
    return { success: true, data: invitation };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create invitation.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Guru revokes a pending invitation.
 */
export async function revokeInvitationAction(invitationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const authUser = await requireGuru();
    const success = await InvitationService.revokeGuruInvitation(invitationId, authUser.id);
    if (!success) {
      return { success: false, error: "Unable to revoke invitation or unauthorized." };
    }
    revalidatePath("/guru/shishyas");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to revoke invitation.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Validates an invitation token or readable code for public viewing.
 */
export async function validateInvitationSecretAction(
  secret: string
): Promise<PublicInvitationDetails> {
  const cleanSecret = secret.trim();
  const rateCheck = rateLimiter.check(
    `invite_val:${cleanSecret.slice(0, 16)}`,
    RATE_LIMITS.INVITATION_VALIDATE.limit,
    RATE_LIMITS.INVITATION_VALIDATE.windowMs
  );
  if (!rateCheck.allowed) {
    return {
      id: "",
      guruName: "",
      expiresAt: "",
      isValid: false,
      errorReason: "Too many validation attempts. Please wait a moment and try again.",
    };
  }

  return InvitationService.validateInvitationSecret(cleanSecret);
}

/**
 * Server Action: Authenticated Shishya accepts an invitation.
 */
export async function acceptInvitationAction(secret: string): Promise<{
  success: boolean;
  guruName?: string;
  error?: string;
}> {
  try {
    const authUser = await getCurrentAuthUser();
    if (!authUser) {
      return {
        success: false,
        error: "Please sign in or create an account to accept this invitation.",
      };
    }

    if (authUser.role !== "shishya") {
      return {
        success: false,
        error: "Only a Shishya account can accept this invitation.",
      };
    }

    const rateCheck = rateLimiter.check(
      `invite_accept:${authUser.id}`,
      RATE_LIMITS.INVITATION_ACCEPT.limit,
      RATE_LIMITS.INVITATION_ACCEPT.windowMs
    );
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: "Too many acceptance attempts. Please try again later.",
      };
    }

    const shishyaDbUser: DbUser = {
      id: authUser.id,
      authProviderId: authUser.authProviderId,
      role: "shishya",
      name: authUser.name,
      spiritualName: authUser.spiritualName || authUser.name,
      email: authUser.email,
      status: "active",
      createdAt: authUser.createdAt,
      updatedAt: authUser.updatedAt,
    };

    const result = await InvitationService.acceptInvitation({
      secret,
      shishya: shishyaDbUser,
    });

    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to accept invitation.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Fetch connected Shishyas and active invitations for the current Guru.
 */
export async function getMyShishyasDataAction() {
  const authUser = await requireGuru();

  const [shishyas, invitations] = await Promise.all([
    dbStore.getShishyasByGuru(authUser.id),
    dbStore.getInvitationsByGuru(authUser.id),
  ]);

  return {
    shishyas,
    invitations,
  };
}

/**
 * Server Action: Fetch connected Guru details for the current Shishya.
 */
export async function getMyGuruDataAction() {
  const authUser = await requireShishya();
  return dbStore.getGuruByShishya(authUser.id);
}
