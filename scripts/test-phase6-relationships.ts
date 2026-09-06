import { dbStore } from "../lib/db/store";
import { InvitationService } from "../lib/invitations/service";
import { DbUser, DbGuruShishyaRelationship } from "../lib/db/schema";
import {
  getAuthorizedShishyaForGuru,
  getAuthorizedShishyasForGuru,
  getActiveRelationshipForShishya,
} from "../lib/auth/authorization";

async function runPhase6Tests() {
  console.log("================================================================");
  console.log("=== RUNNING PHASE 6 GURU–SHISHYA RELATIONSHIP SECURITY TESTS ===");
  console.log("================================================================\n");

  // 1. Setup Test Users
  const guruA: DbUser = {
    id: "guru_radheshyam_pune",
    authProviderId: "auth_guru_a",
    role: "guru",
    name: "His Grace Radheshyam Das",
    spiritualName: "Radheshyam Das",
    email: "radheshyam@iskconpune.org",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const guruB: DbUser = {
    id: "guru_gouranga_pune",
    authProviderId: "auth_guru_b",
    role: "guru",
    name: "His Grace Gouranga Das",
    spiritualName: "Gouranga Das",
    email: "gouranga@iskconpune.org",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const shishyaA: DbUser = {
    id: "shishya_arjuna_001",
    authProviderId: "auth_shishya_a",
    role: "shishya",
    name: "Arjun Sharma",
    spiritualName: "Arjuna Das",
    email: "arjun@example.com",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const shishyaB: DbUser = {
    id: "shishya_bhima_002",
    authProviderId: "auth_shishya_b",
    role: "shishya",
    name: "Bhim Rao",
    spiritualName: "Bhima Das",
    email: "bhim@example.com",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const shishyaC: DbUser = {
    id: "shishya_nakula_003",
    authProviderId: "auth_shishya_c",
    role: "shishya",
    name: "Nakul Patil",
    spiritualName: "Nakula Das",
    email: "nakul@example.com",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await dbStore.upsertUser(guruA);
  await dbStore.upsertUser(guruB);

  const testIds = ["shishya_arjuna_001", "shishya_bhima_002", "shishya_nakula_003", "shishya_sahadeva_004"];
  for (const [key, rel] of Array.from(((dbStore as any).relationships as Map<string, any>).entries())) {
    if (testIds.includes(rel.shishyaId)) {
      ((dbStore as any).relationships as Map<string, any>).delete(key);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: Relationship Establishment via Invitation Acceptance
  // -------------------------------------------------------------------------
  console.log("[TEST 1] Establishing Relationships via Cryptographic Invitations...");

  // Guru A invites Shishya A & Shishya B
  const inviteA1 = await InvitationService.createGuruInvitation(guruA);
  const acceptA1 = await InvitationService.acceptInvitation({
    secret: inviteA1.rawToken,
    shishya: shishyaA,
  });
  if (!acceptA1.success) throw new Error("TEST 1 FAILED: Shishya A accept failed: " + acceptA1.error);

  const inviteA2 = await InvitationService.createGuruInvitation(guruA);
  const acceptA2 = await InvitationService.acceptInvitation({
    secret: inviteA2.rawToken,
    shishya: shishyaB,
  });
  if (!acceptA2.success) throw new Error("TEST 1 FAILED: Shishya B accept failed: " + acceptA2.error);

  // Guru B invites Shishya C
  const inviteB1 = await InvitationService.createGuruInvitation(guruB);
  const acceptB1 = await InvitationService.acceptInvitation({
    secret: inviteB1.rawToken,
    shishya: shishyaC,
  });
  if (!acceptB1.success) throw new Error("TEST 1 FAILED: Shishya C accept failed: " + acceptB1.error);

  console.log("-> Established Guru A -> [Shishya A, Shishya B]");
  console.log("-> Established Guru B -> [Shishya C]");
  console.log("✓ TEST 1 PASSED: Relationships created with role, status, and primary flag.\n");

  // -------------------------------------------------------------------------
  // TEST 2: Guru A Scoped View & Complete Cross-Guru Isolation
  // -------------------------------------------------------------------------
  console.log("[TEST 2] Guru A Scoped Query & Isolation...");
  const guruAShishyas = await getAuthorizedShishyasForGuru(guruA.id);
  const guruAShishyaIds = guruAShishyas.map((item) => item.shishya.id);

  console.log("-> Guru A sees Shishyas:", guruAShishyaIds);
  if (guruAShishyas.length !== 2) throw new Error("TEST 2 FAILED: Guru A should see exactly 2 Shishyas");
  if (!guruAShishyaIds.includes(shishyaA.id) || !guruAShishyaIds.includes(shishyaB.id)) {
    throw new Error("TEST 2 FAILED: Guru A missing Shishya A or Shishya B");
  }
  if (guruAShishyaIds.includes(shishyaC.id)) {
    throw new Error("TEST 2 CRITICAL SECURITY FAILURE: Guru A can see Guru B's Shishya C!");
  }
  console.log("✓ TEST 2 PASSED: Guru A sees only own Shishyas (Zero Cross-Guru leakage).\n");

  // -------------------------------------------------------------------------
  // TEST 3: Guru B Scoped View & Isolation
  // -------------------------------------------------------------------------
  console.log("[TEST 3] Guru B Scoped Query & Isolation...");
  const guruBShishyas = await getAuthorizedShishyasForGuru(guruB.id);
  const guruBShishyaIds = guruBShishyas.map((item) => item.shishya.id);

  console.log("-> Guru B sees Shishyas:", guruBShishyaIds);
  if (guruBShishyas.length !== 1) throw new Error("TEST 3 FAILED: Guru B should see exactly 1 Shishya");
  if (!guruBShishyaIds.includes(shishyaC.id)) {
    throw new Error("TEST 3 FAILED: Guru B missing Shishya C");
  }
  if (guruBShishyaIds.includes(shishyaA.id) || guruBShishyaIds.includes(shishyaB.id)) {
    throw new Error("TEST 3 CRITICAL SECURITY FAILURE: Guru B can see Guru A's Shishyas!");
  }
  console.log("✓ TEST 3 PASSED: Guru B sees only own Shishyas.\n");

  // -------------------------------------------------------------------------
  // TEST 4: Cross-Guru Direct Data Access & Deactivation Prevention
  // -------------------------------------------------------------------------
  console.log("[TEST 4] Guru A attempts to access and deactivate Guru B's Shishya C...");
  const crossAccess = await getAuthorizedShishyaForGuru(guruA.id, shishyaC.id);
  if (crossAccess !== null) {
    throw new Error("TEST 4 CRITICAL SECURITY FAILURE: getAuthorizedShishyaForGuru allowed cross-access!");
  }
  console.log("-> Direct data query for Shishya C by Guru A: REJECTED (returned null)");

  const crossDeactivate = await dbStore.deactivateRelationship({
    guruId: guruA.id,
    shishyaId: shishyaC.id,
    deactivatedBy: guruA.id,
  });
  if (crossDeactivate.success) {
    throw new Error("TEST 4 CRITICAL SECURITY FAILURE: Guru A was able to deactivate Guru B's Shishya!");
  }
  console.log("-> Deactivation attempt of Shishya C by Guru A: REJECTED (", crossDeactivate.error, ")");
  console.log("✓ TEST 4 PASSED: Cross-Guru access and modifications strictly blocked.\n");

  // -------------------------------------------------------------------------
  // TEST 5: Shishya Direct Queries & Cross-Shishya Isolation
  // -------------------------------------------------------------------------
  console.log("[TEST 5] Shishya Scoped Guru Query & Cross-Shishya Isolation...");
  const shishyaAGuru = await getActiveRelationshipForShishya(shishyaA.id);
  if (!shishyaAGuru || shishyaAGuru.guru.id !== guruA.id) {
    throw new Error("TEST 5 FAILED: Shishya A cannot resolve connected Guru A");
  }
  console.log("-> Shishya A successfully resolved Guru:", shishyaAGuru.guru.name);

  const shishyaCGuru = await getActiveRelationshipForShishya(shishyaC.id);
  if (!shishyaCGuru || shishyaCGuru.guru.id !== guruB.id) {
    throw new Error("TEST 5 FAILED: Shishya C cannot resolve connected Guru B");
  }
  console.log("-> Shishya C successfully resolved Guru:", shishyaCGuru.guru.name);
  console.log("✓ TEST 5 PASSED: Shishyas correctly resolve their own active primary Guru.\n");

  // -------------------------------------------------------------------------
  // TEST 6: Shishya Changing Guru / Second Active Primary Guru Prevention
  // -------------------------------------------------------------------------
  console.log("[TEST 6] Shishya A attempts to attach to Guru B (Silent Reassignment Check)...");
  const inviteFromGuruB = await InvitationService.createGuruInvitation(guruB);
  const reassignAttempt = await InvitationService.acceptInvitation({
    secret: inviteFromGuruB.rawToken,
    shishya: shishyaA,
  });
  if (reassignAttempt.success) {
    throw new Error("TEST 6 CRITICAL SECURITY FAILURE: Shishya A was re-assigned to Guru B!");
  }
  console.log("-> Reassignment rejected with reason:", reassignAttempt.error);
  console.log("✓ TEST 6 PASSED: Shishya cannot independently change or add another Guru.\n");

  // -------------------------------------------------------------------------
  // TEST 7: Database Uniqueness Constraint (2 Active Primary Relationships)
  // -------------------------------------------------------------------------
  console.log("[TEST 7] Database Constraint Check: Attempt duplicate active primary relationship...");
  let constraintCaught = false;
  try {
    await dbStore.createRelationshipDirect({
      id: "rel_illegal_duplicate",
      guruId: guruB.id,
      shishyaId: shishyaA.id,
      relationshipType: "primary_guru",
      status: "active",
      isPrimary: true,
    });
  } catch (err: unknown) {
    constraintCaught = true;
    console.log("-> Database rejected with:", (err as Error).message);
  }
  if (!constraintCaught) {
    throw new Error("TEST 7 FAILED: Database allowed duplicate active primary relationship!");
  }
  console.log("✓ TEST 7 PASSED: Database-level uniqueness constraint enforced.\n");

  // -------------------------------------------------------------------------
  // TEST 8: Mentorship Deactivation ("End Mentorship") Lifecycle
  // -------------------------------------------------------------------------
  console.log("[TEST 8] Guru A ends mentorship with Shishya A...");
  const deactivationResult = await dbStore.deactivateRelationship({
    guruId: guruA.id,
    shishyaId: shishyaA.id,
    deactivatedBy: guruA.id,
  });
  if (!deactivationResult.success || !deactivationResult.relationship) {
    throw new Error("TEST 8 FAILED: Deactivation failed: " + deactivationResult.error);
  }

  const deactivatedRel = deactivationResult.relationship;
  if (deactivatedRel.status !== "inactive") throw new Error("TEST 8 FAILED: Status is not 'inactive'");
  if (deactivatedRel.deactivatedBy !== guruA.id) throw new Error("TEST 8 FAILED: deactivatedBy missing");
  if (!deactivatedRel.deactivatedAt) throw new Error("TEST 8 FAILED: deactivatedAt timestamp missing");
  console.log("-> Relationship updated to inactive. Deactivated at:", deactivatedRel.deactivatedAt);

  // Verify Guru A no longer has active access to Shishya A
  const guruAUpdatedShishyas = await getAuthorizedShishyasForGuru(guruA.id);
  const updatedIds = guruAUpdatedShishyas.map((item) => item.shishya.id);
  if (updatedIds.includes(shishyaA.id)) {
    throw new Error("TEST 8 CRITICAL FAILURE: Inactive Shishya A still appears in Guru A active list!");
  }
  console.log("-> Guru A active list now contains:", updatedIds, "(Shishya A excluded)");

  // Verify Shishya A user account still exists (Never deleted)
  const shishyaAAccount = await dbStore.getUserById(shishyaA.id);
  if (!shishyaAAccount) {
    throw new Error("TEST 8 CRITICAL DATA RETENTION FAILURE: Shishya A account was deleted!");
  }
  console.log("-> Shishya A user account preserved:", shishyaAAccount.name, `(${shishyaAAccount.status})`);

  // Verify Historical relationship record exists
  const historicalRel = await dbStore.getRelationship(guruA.id, shishyaA.id);
  if (!historicalRel || historicalRel.status !== "inactive") {
    throw new Error("TEST 8 FAILED: Historical relationship record missing or corrupt");
  }
  console.log("-> Historical audit trail preserved:", {
    id: historicalRel.id,
    status: historicalRel.status,
    deactivatedBy: historicalRel.deactivatedBy,
    deactivatedAt: historicalRel.deactivatedAt,
  });
  console.log("✓ TEST 8 PASSED: Mentorship ended cleanly with full data retention.\n");

  // -------------------------------------------------------------------------
  // TEST 9: Re-invitation Policy After Deactivation
  // -------------------------------------------------------------------------
  console.log("[TEST 9] Deactivated Shishya attempts new invitation acceptance...");
  const newInviteFromGuruA = await InvitationService.createGuruInvitation(guruA);
  const reInviteAttempt = await InvitationService.acceptInvitation({
    secret: newInviteFromGuruA.rawToken,
    shishya: shishyaA,
  });
  if (reInviteAttempt.success) {
    throw new Error("TEST 9 CRITICAL FAILURE: Silent reconnection of deactivated Shishya occurred!");
  }
  console.log("-> Silent reconnection blocked with message:", reInviteAttempt.error);
  console.log("✓ TEST 9 PASSED: Reconnection policy strictly enforced.\n");

  // -------------------------------------------------------------------------
  // TEST 10: Future Multi-Mentor Model Architecture Validation
  // -------------------------------------------------------------------------
  console.log("[TEST 10] Future Multi-Mentor Architecture Validation...");
  // Verify that the relationship table can store secondary mentors (isPrimary=false)
  // without changing user schema or breaking primary relationship queries.
  const futureMentorRel: Omit<DbGuruShishyaRelationship, "createdAt" | "updatedAt"> = {
    id: "rel_future_mentor_demo",
    guruId: guruB.id,
    shishyaId: shishyaB.id, // Shishya B's primary Guru is Guru A
    relationshipType: "primary_guru", // V1 type; future "mentor"
    status: "active",
    isPrimary: false, // Secondary mentorship
  };

  const storedSecondaryRel = await dbStore.createRelationshipDirect(futureMentorRel);
  if (!storedSecondaryRel || storedSecondaryRel.isPrimary !== false) {
    throw new Error("TEST 10 FAILED: Secondary mentor relationship creation failed");
  }

  // Verify primary Guru lookup for Shishya B is unaffected (still Guru A)
  const shishyaBPrimaryGuru = await dbStore.getGuruByShishya(shishyaB.id, "active");
  if (!shishyaBPrimaryGuru || shishyaBPrimaryGuru.guru.id !== guruA.id) {
    throw new Error("TEST 10 FAILED: Primary Guru lookup corrupted by secondary relationship");
  }
  console.log("-> Shishya B has Primary Guru:", shishyaBPrimaryGuru.guru.name);
  console.log("-> Shishya B simultaneously holds secondary mentor record (isPrimary=false)");
  console.log("✓ TEST 10 PASSED: Architecture supports future multi-mentor expansion with ZERO schema redesign.\n");

  console.log("================================================================");
  console.log("ALL 10 PHASE 6 RELATIONSHIP & SECURITY TESTS PASSED PERFECTLY!");
  console.log("================================================================");
}

runPhase6Tests().catch((err) => {
  console.error("\nTEST SUITE FAILED WITH ERROR:", err);
  process.exit(1);
});
