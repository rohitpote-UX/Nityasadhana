import { dbStore } from "../lib/db/store";
import { hashPassword, verifyPassword } from "../lib/auth/password";
import { hashToken, generateRandomToken, SESSION_DURATION_MS } from "../lib/auth/session";
import { InvitationService } from "../lib/invitations/service";
import { requireGuruOwnsShishya, requireCurrentShishya } from "../lib/auth/authorization";
import { rateLimiter, RATE_LIMITS } from "../lib/security/rate-limit";
import { DbUser, DbSession } from "../lib/db/schema";
import { UserRole } from "../types/auth";

// ============================================================
// NITYASĀDHANĀ — COMPREHENSIVE FIRST-PARTY AUTH TEST SUITE
// ============================================================

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` - ${detail}` : ""}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log("\n========================================================");
  console.log("NITYASĀDHANĀ FIRST-PARTY AUTHENTICATION TEST SUITE");
  console.log("========================================================\n");

  const timestamp = Date.now();

  // ------------------------------------------------------------
  // TEST SUITE 1: PASSWORD SECURITY & HASHING
  // ------------------------------------------------------------
  console.log("--- Test Suite 1: Password Security & Hashing ---");

  const pwdA = "DevoteeSecret@2026";
  const hashA = await hashPassword(pwdA);

  assert(hashA !== pwdA, "Password is not stored plaintext");
  assert(hashA.startsWith("$2"), "Password is hashed using bcrypt");
  assert(await verifyPassword(pwdA, hashA), "Correct password verifies successfully");
  assert(!(await verifyPassword("WrongPassword123", hashA)), "Wrong password fails verification");

  // Same password across two users must produce different hashes (salt test)
  const pwdSame = "CommonSpiritualPass@108";
  const hashUser1 = await hashPassword(pwdSame);
  const hashUser2 = await hashPassword(pwdSame);
  assert(hashUser1 !== hashUser2, "Identical password produces distinct salted hashes");
  assert(await verifyPassword(pwdSame, hashUser1), "User 1 verifies identical password");
  assert(await verifyPassword(pwdSame, hashUser2), "User 2 verifies identical password");

  // ------------------------------------------------------------
  // TEST SUITE 2: GURU SIGNUP & CLEAN DASHBOARD
  // ------------------------------------------------------------
  console.log("\n--- Test Suite 2: Guru Signup & Dashboard Isolation ---");

  const guruEmail = `guru.test.${timestamp}@iskconpune.org`;
  const guruId = `guru_test_${timestamp}`;
  const guruPassword = "GuruMasterPassword@2026";
  const guruHash = await hashPassword(guruPassword);

  const newGuru: DbUser = {
    id: guruId,
    authProviderId: guruId,
    role: "guru",
    name: "His Grace Tested Guru",
    spiritualName: "Tested Das",
    email: guruEmail,
    passwordHash: guruHash,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await dbStore.createUser(newGuru);

  const fetchedGuru = await dbStore.getUserById(guruId);
  assert(fetchedGuru !== null, "Guru account created in store");
  assert(fetchedGuru?.role === "guru", "Guru role assigned server-side as 'guru'");

  // Clean dashboard check: brand new Guru must have 0 shishyas
  const initialShishyas = await dbStore.getShishyasByGuru(guruId);
  assert(initialShishyas.length === 0, "Brand new Guru has strictly 0 Shishyas (no dummy data)");

  // ------------------------------------------------------------
  // TEST SUITE 3: INVITATION & SHISHYA ONBOARDING
  // ------------------------------------------------------------
  console.log("\n--- Test Suite 3: Invitation & Shishya Onboarding ---");

  // Guru creates an invitation
  const inviteResult = await InvitationService.createGuruInvitation(newGuru);
  assert(Boolean(inviteResult.rawCode), "Guru generated readable invite code");
  assert(Boolean(inviteResult.rawToken), "Guru generated secure URL token");

  // Validate the secret
  const validation = await InvitationService.validateInvitationSecret(inviteResult.rawCode);
  assert(validation.isValid, "Invitation code validates successfully");
  assert(validation.guruName.includes("Tested"), "Derived Guru name matches inviting Guru");

  // Shishya signs up with this invitation
  const shishyaEmail = `shishya.test.${timestamp}@iskconpune.org`;
  const shishyaId = `shishya_test_${timestamp}`;
  const shishyaPassword = "ShishyaPassword@2026";
  const shishyaHash = await hashPassword(shishyaPassword);

  const newShishya: DbUser = {
    id: shishyaId,
    authProviderId: shishyaId,
    role: "shishya",
    name: "Shishya Candidate",
    spiritualName: "Bhakta Shishya",
    email: shishyaEmail,
    passwordHash: shishyaHash,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await dbStore.createUser(newShishya);

  // Atomically accept invitation
  const acceptResult = await InvitationService.acceptInvitation({
    secret: inviteResult.rawCode,
    shishya: newShishya,
  });
  assert(acceptResult.success, "Invitation accepted atomically");
  assert(acceptResult.guruId === guruId, "Shishya linked to correct Guru");

  // Invitation is single-use: replay must fail
  const replayValidation = await InvitationService.validateInvitationSecret(inviteResult.rawCode);
  assert(!replayValidation.isValid, "Used invitation is marked invalid (single-use enforcement)");

  // Verify Guru now sees 1 Shishya
  const updatedShishyas = await dbStore.getShishyasByGuru(guruId);
  assert(updatedShishyas.length === 1, "Guru dashboard now shows exactly 1 connected Shishya");
  assert(updatedShishyas[0].shishya.id === shishyaId, "Connected Shishya matches new user");

  // ------------------------------------------------------------
  // TEST SUITE 4: CROSS-GURU & CROSS-SHISHYA ISOLATION
  // ------------------------------------------------------------
  console.log("\n--- Test Suite 4: Multi-Tenant Boundary Isolation ---");

  // Create Guru B and Shishya B
  const guruBId = `guru_b_${timestamp}`;
  const guruB: DbUser = {
    id: guruBId,
    authProviderId: guruBId,
    role: "guru",
    name: "Guru B",
    email: `guruB.${timestamp}@iskconpune.org`,
    passwordHash: guruHash,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await dbStore.createUser(guruB);

  const inviteB = await InvitationService.createGuruInvitation(guruB);
  const shishyaBId = `shishya_b_${timestamp}`;
  const shishyaB: DbUser = {
    id: shishyaBId,
    authProviderId: shishyaBId,
    role: "shishya",
    name: "Shishya B",
    email: `shishyaB.${timestamp}@iskconpune.org`,
    passwordHash: shishyaHash,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await dbStore.createUser(shishyaB);
  await InvitationService.acceptInvitation({
    secret: inviteB.rawCode,
    shishya: shishyaB,
  });

  // Verify Guru A only sees Shishya A, Guru B only sees Shishya B
  const guruAShishyas = await dbStore.getShishyasByGuru(guruId);
  const guruBShishyas = await dbStore.getShishyasByGuru(guruBId);

  assert(
    guruAShishyas.every((s) => s.shishya.id !== shishyaBId),
    "Guru A CANNOT view or access Shishya B"
  );
  assert(
    guruBShishyas.every((s) => s.shishya.id !== shishyaId),
    "Guru B CANNOT view or access Shishya A"
  );

  // Check relationship ownership check function
  const guruARelToB = await dbStore.getRelationship(guruId, shishyaBId);
  assert(!guruARelToB, "Guru A has no relationship record for Shishya B");

  // ------------------------------------------------------------
  // TEST SUITE 5: SESSION CREATION, VERIFICATION & EXPIRATION
  // ------------------------------------------------------------
  console.log("\n--- Test Suite 5: Session Management ---");

  const rawSessionToken = generateRandomToken();
  const tokenHash = hashToken(rawSessionToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS).toISOString();

  const sessionObj: DbSession = {
    id: `sess_${timestamp}`,
    sessionTokenHash: tokenHash,
    userId: guruId,
    expiresAt,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  await dbStore.createSession(sessionObj);

  const retrievedSession = await dbStore.getSessionByTokenHash(tokenHash);
  assert(retrievedSession !== null, "Active session retrieved by token hash");
  assert(retrievedSession?.userId === guruId, "Session references correct user");

  // Expired session check
  const expiredRawToken = generateRandomToken();
  const expiredHash = hashToken(expiredRawToken);
  const pastDate = new Date(now.getTime() - 10000).toISOString();
  await dbStore.createSession({
    id: `sess_exp_${timestamp}`,
    sessionTokenHash: expiredHash,
    userId: guruId,
    expiresAt: pastDate,
    createdAt: pastDate,
    updatedAt: pastDate,
  });

  const expiredCheck = await dbStore.getSessionByTokenHash(expiredHash);
  assert(expiredCheck === null, "Expired session fails closed (returns null)");

  // Session teardown / logout
  await dbStore.deleteSessionByTokenHash(tokenHash);
  const deletedCheck = await dbStore.getSessionByTokenHash(tokenHash);
  assert(deletedCheck === null, "Logged out session is completely invalidated");

  // ------------------------------------------------------------
  // TEST SUITE 6: PASSWORD RESET TOKEN SECURITY
  // ------------------------------------------------------------
  console.log("\n--- Test Suite 6: Password Reset Token Security ---");

  const rawResetToken = generateRandomToken();
  const resetHash = hashToken(rawResetToken);
  const resetExpiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const resetTokenId = `prt_${timestamp}`;

  await dbStore.createPasswordResetToken({
    id: resetTokenId,
    tokenHash: resetHash,
    userId: shishyaId,
    expiresAt: resetExpiresAt,
    createdAt: now.toISOString(),
  });

  const validTokenRecord = await dbStore.getPasswordResetTokenByHash(resetHash);
  assert(validTokenRecord !== null, "Reset token retrieved successfully before use");

  // Update password & mark used
  const newShishyaPassword = "NewUpdatedPassword@2026";
  const newHash = await hashPassword(newShishyaPassword);
  await dbStore.updateUserPassword(shishyaId, newHash);
  await dbStore.markPasswordResetTokenUsed(resetTokenId);

  // Single-use check: reused token must fail
  const usedTokenCheck = await dbStore.getPasswordResetTokenByHash(resetHash);
  assert(usedTokenCheck === null, "Used reset token cannot be reused (single-use enforced)");

  // Verify new password works and old password fails
  const updatedShishyaUser = await dbStore.getUserById(shishyaId);
  assert(
    await verifyPassword(newShishyaPassword, updatedShishyaUser?.passwordHash),
    "Updated password verifies successfully"
  );
  assert(
    !(await verifyPassword(shishyaPassword, updatedShishyaUser?.passwordHash)),
    "Old password fails after reset"
  );

  // ------------------------------------------------------------
  // TEST SUITE 7: RATE LIMITING ENFORCEMENT
  // ------------------------------------------------------------
  console.log("\n--- Test Suite 7: Rate Limiting Enforcement ---");

  const testIp = `192.168.1.100_${timestamp}`;
  const rateLimitKey = `auth_test_login:${testIp}`;

  // Exhaust attempts
  for (let i = 0; i < RATE_LIMITS.AUTH_LOGIN.limit; i++) {
    rateLimiter.check(rateLimitKey, RATE_LIMITS.AUTH_LOGIN.limit, RATE_LIMITS.AUTH_LOGIN.windowMs);
  }

  const blockedAttempt = rateLimiter.check(
    rateLimitKey,
    RATE_LIMITS.AUTH_LOGIN.limit,
    RATE_LIMITS.AUTH_LOGIN.windowMs
  );
  assert(!blockedAttempt.allowed, "Rate limiter blocks attempts exceeding threshold");

  rateLimiter.reset(rateLimitKey);
  const unblockedAttempt = rateLimiter.check(
    rateLimitKey,
    RATE_LIMITS.AUTH_LOGIN.limit,
    RATE_LIMITS.AUTH_LOGIN.windowMs
  );
  assert(unblockedAttempt.allowed, "Rate limiter reset permits authorized attempts");

  // ------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------
  console.log("\n========================================================");
  console.log(`TEST RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
  console.log("========================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
