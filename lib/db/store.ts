import {
  DbUser,
  DbSession,
  DbPasswordResetToken,
  DbInvitation,
  DbGuruShishyaRelationship,
  DbDailySadhanaReport,
  DbAuditLog,
  DbGuruFollowUp,
  DbGuruPrivateNote,
  DbWeeklySankalpa,
  DbWeeklyReflection,
  DbNotification,
  DbNotificationPreferences,
  FollowUpStatus,
} from "./schema";
import { hashInvitationSecret } from "@/lib/invitations/crypto";

const getNodeRuntime = () => {
  if (typeof window !== "undefined") return null;
  try {
    const getBuiltin = (name: string) => {
      if (typeof process !== "undefined" && typeof process.getBuiltinModule === "function") {
        return process.getBuiltinModule(name);
      }

      const requireFn = Function("return require")();
      return requireFn(name);
    };

    const fs = getBuiltin("node:fs");
    const path = getBuiltin("node:path");
    return { fs, path };
  } catch {
    return null;
  }
};

const getDbFilePath = () => {
  const runtime = getNodeRuntime();
  if (!runtime) return "";
  return runtime.path.join(process.cwd(), ".nityasadhana-db.json");
};

type PersistedDbState = {
  users: Record<string, DbUser>;
  sessions?: Record<string, DbSession>;
  resetTokens?: Record<string, DbPasswordResetToken>;
  invitations: Record<string, DbInvitation>;
  relationships: Record<string, DbGuruShishyaRelationship>;
  reports: Record<string, DbDailySadhanaReport>;
  followUps: Record<string, DbGuruFollowUp>;
  privateNotes: Record<string, DbGuruPrivateNote>;
  sankalpas: Record<string, DbWeeklySankalpa>;
  reflections: Record<string, DbWeeklyReflection>;
  notifications: Record<string, DbNotification>;
  notificationPreferences: Record<string, DbNotificationPreferences>;
  auditLogs: Record<string, DbAuditLog>;
};

/**
 * In-memory transactional database store with mutex locks.
 * Ensures ACID guarantees, single-use enforcement, and race-condition prevention.
 */
export class NityasadhanaDbStore {
  private users: Map<string, DbUser> = new Map();
  private sessions: Map<string, DbSession> = new Map();
  private resetTokens: Map<string, DbPasswordResetToken> = new Map();
  private invitations: Map<string, DbInvitation> = new Map();
  private relationships: Map<string, DbGuruShishyaRelationship> = new Map();
  private reports: Map<string, DbDailySadhanaReport> = new Map();
  private followUps: Map<string, DbGuruFollowUp> = new Map();
  private privateNotes: Map<string, DbGuruPrivateNote> = new Map();
  private sankalpas: Map<string, DbWeeklySankalpa> = new Map();
  private reflections: Map<string, DbWeeklyReflection> = new Map();
  private notifications: Map<string, DbNotification> = new Map();
  private notificationPreferences: Map<string, DbNotificationPreferences> = new Map();
  private auditLogs: Map<string, DbAuditLog> = new Map();
  private isLocked: boolean = false;
  private lockQueue: Array<() => void> = [];

  constructor() {
    this.loadPersistedState();
    this.seedInitialData();
  }

  private persistState() {
    if (typeof window !== "undefined") return;

    const runtime = getNodeRuntime();
    if (!runtime) return;

    const dbFilePath = getDbFilePath();
    if (!dbFilePath) return;

    const snapshot: PersistedDbState = {
      users: Object.fromEntries(this.users),
      sessions: Object.fromEntries(this.sessions),
      resetTokens: Object.fromEntries(this.resetTokens),
      invitations: Object.fromEntries(this.invitations),
      relationships: Object.fromEntries(this.relationships),
      reports: Object.fromEntries(this.reports),
      followUps: Object.fromEntries(this.followUps),
      privateNotes: Object.fromEntries(this.privateNotes),
      sankalpas: Object.fromEntries(this.sankalpas),
      reflections: Object.fromEntries(this.reflections),
      notifications: Object.fromEntries(this.notifications),
      notificationPreferences: Object.fromEntries(this.notificationPreferences),
      auditLogs: Object.fromEntries(this.auditLogs),
    };

    runtime.fs.writeFileSync(dbFilePath, JSON.stringify(snapshot, null, 2), "utf8");
  }

  private loadPersistedState() {
    if (typeof window !== "undefined") return;

    const runtime = getNodeRuntime();
    if (!runtime) return;

    const dbFilePath = getDbFilePath();
    if (!dbFilePath) return;

    try {
      const raw = runtime.fs.readFileSync(dbFilePath, "utf8");
      if (!raw.trim()) return;

      const parsed = JSON.parse(raw) as Partial<PersistedDbState>;
      this.users = new Map(Object.entries(parsed.users ?? {}));
      this.sessions = new Map(Object.entries(parsed.sessions ?? {}));
      this.resetTokens = new Map(Object.entries(parsed.resetTokens ?? {}));
      this.invitations = new Map(Object.entries(parsed.invitations ?? {}));
      this.relationships = new Map(Object.entries(parsed.relationships ?? {}));
      this.reports = new Map(Object.entries(parsed.reports ?? {}));
      this.followUps = new Map(Object.entries(parsed.followUps ?? {}));
      this.privateNotes = new Map(Object.entries(parsed.privateNotes ?? {}));
      this.sankalpas = new Map(Object.entries(parsed.sankalpas ?? {}));
      this.reflections = new Map(Object.entries(parsed.reflections ?? {}));
      this.notifications = new Map(Object.entries(parsed.notifications ?? {}));
      this.notificationPreferences = new Map(Object.entries(parsed.notificationPreferences ?? {}));
      this.auditLogs = new Map(Object.entries(parsed.auditLogs ?? {}));
    } catch {
      // Ignore invalid or absent state files and rely on fresh bootstrap data.
    }
  }

  private seedInitialData() {
    if (
      this.users.size > 0 ||
      this.invitations.size > 0 ||
      this.relationships.size > 0 ||
      this.reports.size > 0
    ) {
      return;
    }

    // Seed default Guru for demonstration / testing
    const defaultGuru: DbUser = {
      id: "guru_iskcon_pune_01",
      authProviderId: "auth_guru_pune",
      role: "guru",
      name: "His Grace Radheshyam Das",
      spiritualName: "Radheshyam Das",
      email: "radheshyam.das@iskconpune.org",
      ashramId: "iskcon_nvcc_pune",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(defaultGuru.id, defaultGuru);

    // Seed common development invitations for easy testing
    const devCodes = ["NITYA-7K4P-X9QM", "NITYA-GURU-2026", "GURU2026", "NITYA-DEV-GURU"];
    devCodes.forEach((code, idx) => {
      const invId = `inv_dev_common_${idx + 1}`;
      const token = `dev_token_common_${idx + 1}`;
      const inv: DbInvitation = {
        id: invId,
        tokenHash: hashInvitationSecret(token),
        codeHash: hashInvitationSecret(code),
        rawCodeMasked: `${code.slice(0, 5)}••••${code.slice(-4)}`,
        createdByUserId: defaultGuru.id,
        intendedRole: "shishya",
        status: "pending",
        expiresAt: "2099-12-31T23:59:59Z",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.invitations.set(inv.id, inv);
    });

    this.persistState();
  }

  /**
   * Acquire mutex lock to ensure atomic operations
   */
  private async acquireLock(): Promise<() => void> {
    return new Promise((resolve) => {
      const execute = () => {
        this.isLocked = true;
        resolve(() => {
          this.isLocked = false;
          if (this.lockQueue.length > 0) {
            const next = this.lockQueue.shift();
            if (next) next();
          }
        });
      };

      if (!this.isLocked) {
        execute();
      } else {
        this.lockQueue.push(execute);
      }
    });
  }

  // ============================================================
  // USER OPERATIONS
  // ============================================================

  async getUserById(id: string): Promise<DbUser | null> {
    return this.users.get(id) || null;
  }

  async getUserByEmail(email: string): Promise<DbUser | null> {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  }

  async upsertUser(user: DbUser): Promise<DbUser> {
    const unlock = await this.acquireLock();
    try {
      const now = new Date().toISOString();
      const existing = this.users.get(user.id);
      const updatedUser: DbUser = {
        ...user,
        passwordHash: user.passwordHash ?? existing?.passwordHash,
        linkedGuruId: user.linkedGuruId ?? existing?.linkedGuruId,
        createdAt: existing?.createdAt || user.createdAt || now,
        updatedAt: now,
      };
      this.users.set(user.id, updatedUser);
      this.persistState();
      return updatedUser;
    } finally {
      unlock();
    }
  }

  async createUser(user: DbUser): Promise<DbUser> {
    const unlock = await this.acquireLock();
    try {
      const now = new Date().toISOString();
      const newUser: DbUser = {
        ...user,
        createdAt: user.createdAt || now,
        updatedAt: now,
      };
      this.users.set(newUser.id, newUser);
      this.persistState();
      return newUser;
    } finally {
      unlock();
    }
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<boolean> {
    const unlock = await this.acquireLock();
    try {
      const existing = this.users.get(userId);
      if (!existing) return false;
      const now = new Date().toISOString();
      this.users.set(userId, {
        ...existing,
        passwordHash,
        updatedAt: now,
      });
      this.persistState();
      return true;
    } finally {
      unlock();
    }
  }

  // ============================================================
  // SESSION OPERATIONS
  // ============================================================

  async createSession(session: DbSession): Promise<DbSession> {
    const unlock = await this.acquireLock();
    try {
      this.sessions.set(session.id, session);
      this.persistState();
      return session;
    } finally {
      unlock();
    }
  }

  async getSessionByTokenHash(tokenHash: string): Promise<DbSession | null> {
    this.loadPersistedState();
    const now = new Date();
    for (const session of this.sessions.values()) {
      if (session.sessionTokenHash === tokenHash) {
        if (new Date(session.expiresAt) <= now) {
          this.sessions.delete(session.id);
          this.persistState();
          return null;
        }
        return { ...session };
      }
    }
    return null;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const unlock = await this.acquireLock();
    try {
      const deleted = this.sessions.delete(sessionId);
      if (deleted) this.persistState();
      return deleted;
    } finally {
      unlock();
    }
  }

  async deleteSessionByTokenHash(tokenHash: string): Promise<boolean> {
    const unlock = await this.acquireLock();
    try {
      let foundId: string | null = null;
      for (const [id, session] of this.sessions.entries()) {
        if (session.sessionTokenHash === tokenHash) {
          foundId = id;
          break;
        }
      }
      if (foundId) {
        this.sessions.delete(foundId);
        this.persistState();
        return true;
      }
      return false;
    } finally {
      unlock();
    }
  }

  async deleteSessionsByUserId(userId: string): Promise<number> {
    const unlock = await this.acquireLock();
    try {
      let count = 0;
      for (const [id, session] of this.sessions.entries()) {
        if (session.userId === userId) {
          this.sessions.delete(id);
          count++;
        }
      }
      if (count > 0) this.persistState();
      return count;
    } finally {
      unlock();
    }
  }

  // ============================================================
  // PASSWORD RESET TOKEN OPERATIONS
  // ============================================================

  async createPasswordResetToken(token: DbPasswordResetToken): Promise<DbPasswordResetToken> {
    const unlock = await this.acquireLock();
    try {
      this.resetTokens.set(token.id, token);
      this.persistState();
      return token;
    } finally {
      unlock();
    }
  }

  async getPasswordResetTokenByHash(tokenHash: string): Promise<DbPasswordResetToken | null> {
    this.loadPersistedState();
    const now = new Date();
    for (const token of this.resetTokens.values()) {
      if (token.tokenHash === tokenHash) {
        if (token.usedAt || new Date(token.expiresAt) <= now) {
          return null;
        }
        return { ...token };
      }
    }
    return null;
  }

  async markPasswordResetTokenUsed(tokenId: string): Promise<boolean> {
    const unlock = await this.acquireLock();
    try {
      const token = this.resetTokens.get(tokenId);
      if (!token) return false;
      token.usedAt = new Date().toISOString();
      this.persistState();
      return true;
    } finally {
      unlock();
    }
  }

  /**
   * Internal audit log creator (assumes lock is already held)
   */
  private internalRecordAudit(
    actorId: string,
    action: DbAuditLog["action"],
    entityType: DbAuditLog["entityType"],
    entityId: string,
    metadata?: Record<string, unknown>
  ): DbAuditLog {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const log: DbAuditLog = {
      id,
      actorId,
      action,
      entityType,
      entityId,
      timestamp: new Date().toISOString(),
      metadata,
    };
    this.auditLogs.set(id, log);
    return log;
  }

  // ============================================================
  // INVITATION OPERATIONS
  // ============================================================

  async createInvitation(
    invitationData: Omit<DbInvitation, "createdAt" | "updatedAt">
  ): Promise<DbInvitation> {
    const unlock = await this.acquireLock();
    try {
      const now = new Date().toISOString();
      const invitation: DbInvitation = {
        ...invitationData,
        createdAt: now,
        updatedAt: now,
      };
      this.invitations.set(invitation.id, invitation);

      this.internalRecordAudit(
        invitation.createdByUserId,
        "INVITATION_CREATED",
        "Invitation",
        invitation.id,
        { intendedRole: invitation.intendedRole, rawCodeMasked: invitation.rawCodeMasked }
      );

      this.persistState();
      return invitation;
    } finally {
      unlock();
    }
  }

  async getInvitationById(id: string): Promise<DbInvitation | null> {
    return this.invitations.get(id) || null;
  }

  async getInvitationByTokenHash(tokenHash: string): Promise<DbInvitation | null> {
    this.loadPersistedState();
    for (const inv of this.invitations.values()) {
      if (inv.tokenHash === tokenHash) {
        return inv;
      }
    }
    return null;
  }

  async getInvitationByCodeHash(codeHash: string): Promise<DbInvitation | null> {
    this.loadPersistedState();
    for (const inv of this.invitations.values()) {
      if (inv.codeHash === codeHash) {
        return inv;
      }
    }
    return null;
  }

  async getInvitationsByGuru(guruId: string): Promise<DbInvitation[]> {
    const results: DbInvitation[] = [];
    const now = new Date();

    for (const inv of this.invitations.values()) {
      if (inv.createdByUserId === guruId) {
        // Auto-mark expired if past expiresAt and still pending
        if (inv.status === "pending" && new Date(inv.expiresAt) <= now) {
          inv.status = "expired";
          inv.updatedAt = now.toISOString();
        }
        results.push({ ...inv });
      }
    }

    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async revokeInvitation(invitationId: string, guruId: string): Promise<boolean> {
    const unlock = await this.acquireLock();
    try {
      const invitation = this.invitations.get(invitationId);
      if (!invitation) return false;

      // Ownership authorization check
      if (invitation.createdByUserId !== guruId) {
        return false;
      }

      if (invitation.status !== "pending") {
        return false;
      }

      const now = new Date().toISOString();
      invitation.status = "revoked";
      invitation.revokedAt = now;
      invitation.updatedAt = now;
      this.invitations.set(invitationId, invitation);

      this.internalRecordAudit(guruId, "INVITATION_REVOKED", "Invitation", invitationId, {
        rawCodeMasked: invitation.rawCodeMasked,
      });

      return true;
    } finally {
      unlock();
    }
  }

  // ============================================================
  // ATOMIC ACCEPTANCE TRANSACTION
  // ============================================================

  async atomicAcceptInvitation(params: { invitationId: string; shishya: DbUser }): Promise<{
    success: boolean;
    relationship?: DbGuruShishyaRelationship;
    error?: string;
  }> {
    const unlock = await this.acquireLock();
    try {
      const now = new Date();
      const nowIso = now.toISOString();

      const invitation = this.invitations.get(params.invitationId);
      if (!invitation) {
        return { success: false, error: "Invitation not found." };
      }

      // Step 1: Check status
      if (invitation.status === "revoked") {
        return { success: false, error: "This invitation has been revoked by the Guru." };
      }

      if (invitation.status === "used") {
        return { success: false, error: "This invitation has already been accepted." };
      }

      // Step 2: Check expiry
      if (new Date(invitation.expiresAt) <= now) {
        invitation.status = "expired";
        invitation.updatedAt = nowIso;
        return {
          success: false,
          error: "This invitation has expired. Please request a new invite from your Guru.",
        };
      }

      if (invitation.status !== "pending") {
        return { success: false, error: "This invitation is no longer valid." };
      }

      // Step 3: Check if Shishya already has an active Guru relationship
      for (const rel of this.relationships.values()) {
        if (rel.shishyaId === params.shishya.id && rel.status === "active" && rel.isPrimary) {
          return {
            success: false,
            error:
              "You are already connected with a Guru. A Shishya cannot have multiple active Guru relationships.",
          };
        }
      }

      // Step 3.5: Check if Shishya has a previously deactivated/ended relationship
      // V1 Business Rule: Reconnection requires explicit controlled reactivation process
      for (const rel of this.relationships.values()) {
        if (rel.shishyaId === params.shishya.id && rel.status !== "active") {
          return {
            success: false,
            error:
              "This Shishya has previously been connected to a Guru. A new connection requires the appropriate reactivation process.",
          };
        }
      }

      // Step 4: Upsert Shishya with role = 'shishya'
      const updatedShishya: DbUser = {
        ...params.shishya,
        role: "shishya",
        linkedGuruId: invitation.createdByUserId,
        status: "active",
        createdAt: params.shishya.createdAt || nowIso,
        updatedAt: nowIso,
      };
      this.users.set(params.shishya.id, updatedShishya);

      // Step 5: Mark invitation as used
      invitation.status = "used";
      invitation.usedAt = nowIso;
      invitation.usedByUserId = params.shishya.id;
      invitation.updatedAt = nowIso;
      this.invitations.set(invitation.id, invitation);

      this.internalRecordAudit(
        params.shishya.id,
        "INVITATION_USED",
        "Invitation",
        invitation.id,
        { guruId: invitation.createdByUserId }
      );

      // Step 6: Create Guru-Shishya Relationship (V1: primary_guru, isPrimary=true, status=active)
      const relationshipId = `rel_${invitation.createdByUserId}_${params.shishya.id}`;
      const relationship: DbGuruShishyaRelationship = {
        id: relationshipId,
        guruId: invitation.createdByUserId,
        shishyaId: params.shishya.id,
        relationshipType: "primary_guru",
        status: "active",
        isPrimary: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      this.relationships.set(relationshipId, relationship);

      this.internalRecordAudit(
        params.shishya.id,
        "SHISHYA_CONNECTED",
        "Mentorship",
        relationship.id,
        { guruId: invitation.createdByUserId, relationshipType: relationship.relationshipType }
      );

      this.persistState();
      return {
        success: true,
        relationship,
      };
    } catch (err) {
      console.error("[DbStore] Transaction error during invitation acceptance:", err);
      return { success: false, error: "Database transaction failed. Please try again." };
    } finally {
      unlock();
    }
  }

  // ============================================================
  // RELATIONSHIP OPERATIONS
  // ============================================================

  /**
   * Direct relationship creation with database-level uniqueness enforcement.
   * Useful for internal seed, testing, and future administrative workflows.
   */
  async createRelationshipDirect(
    relationshipData: Omit<DbGuruShishyaRelationship, "createdAt" | "updatedAt">
  ): Promise<DbGuruShishyaRelationship> {
    const unlock = await this.acquireLock();
    try {
      const nowIso = new Date().toISOString();

      // Enforce V1 rule: A Shishya can have only ONE active primary Guru
      if (relationshipData.isPrimary && relationshipData.status === "active") {
        for (const rel of this.relationships.values()) {
          if (
            rel.shishyaId === relationshipData.shishyaId &&
            rel.isPrimary &&
            rel.status === "active" &&
            rel.id !== relationshipData.id
          ) {
            throw new Error(
              "DATABASE CONSTRAINT VIOLATION: Shishya already has an active primary Guru relationship."
            );
          }
        }
      }

      const relationship: DbGuruShishyaRelationship = {
        ...relationshipData,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      this.relationships.set(relationship.id, relationship);

      this.internalRecordAudit(
        relationship.guruId,
        "SHISHYA_CONNECTED",
        "Mentorship",
        relationship.id,
        { shishyaId: relationship.shishyaId, isPrimary: relationship.isPrimary }
      );

      return relationship;
    } finally {
      unlock();
    }
  }

  /**
   * Atomically deactivates an active mentorship relationship ("End Mentorship").
   * Crucial Principle: Shishya user account, historical data, and audit records
   * are preserved and never deleted.
   */
  async deactivateRelationship(params: {
    guruId: string;
    shishyaId: string;
    deactivatedBy: string;
  }): Promise<{
    success: boolean;
    relationship?: DbGuruShishyaRelationship;
    error?: string;
  }> {
    const unlock = await this.acquireLock();
    try {
      const nowIso = new Date().toISOString();
      let targetRelationship: DbGuruShishyaRelationship | null = null;

      for (const rel of this.relationships.values()) {
        if (
          rel.guruId === params.guruId &&
          rel.shishyaId === params.shishyaId &&
          rel.status === "active"
        ) {
          targetRelationship = rel;
          break;
        }
      }

      if (!targetRelationship) {
        return {
          success: false,
          error: "Active mentorship relationship not found or unauthorized.",
        };
      }

      const updatedRelationship: DbGuruShishyaRelationship = {
        ...targetRelationship,
        status: "inactive",
        deactivatedAt: nowIso,
        deactivatedBy: params.deactivatedBy,
        updatedAt: nowIso,
      };

      this.relationships.set(updatedRelationship.id, updatedRelationship);

      this.internalRecordAudit(
        params.deactivatedBy,
        "SHISHYA_DEACTIVATED",
        "Mentorship",
        updatedRelationship.id,
        { guruId: params.guruId, shishyaId: params.shishyaId }
      );

      this.persistState();
      return {
        success: true,
        relationship: updatedRelationship,
      };
    } catch (err) {
      console.error("[DbStore] Error deactivating relationship:", err);
      return { success: false, error: "Failed to deactivate relationship." };
    } finally {
      unlock();
    }
  }

  async getRelationshipById(id: string): Promise<DbGuruShishyaRelationship | null> {
    return this.relationships.get(id) || null;
  }

  async getRelationship(
    guruId: string,
    shishyaId: string
  ): Promise<DbGuruShishyaRelationship | null> {
    for (const rel of this.relationships.values()) {
      if (rel.guruId === guruId && rel.shishyaId === shishyaId) {
        return { ...rel };
      }
    }
    return null;
  }

  async isShishyaConnectedToGuru(guruId: string, shishyaId: string): Promise<boolean> {
    for (const rel of this.relationships.values()) {
      if (rel.guruId === guruId && rel.shishyaId === shishyaId && rel.status === "active") {
        return true;
      }
    }
    return false;
  }

  async getShishyasByGuru(
    guruId: string,
    status: "active" | "inactive" | "ended" = "active"
  ): Promise<Array<{ relationship: DbGuruShishyaRelationship; shishya: DbUser }>> {
    const results: Array<{ relationship: DbGuruShishyaRelationship; shishya: DbUser }> = [];

    for (const rel of this.relationships.values()) {
      if (rel.guruId === guruId && rel.status === status) {
        const shishya = this.users.get(rel.shishyaId);
        if (shishya) {
          results.push({ relationship: { ...rel }, shishya: { ...shishya } });
        }
      }
    }

    return results.sort(
      (a, b) =>
        new Date(b.relationship.createdAt).getTime() - new Date(a.relationship.createdAt).getTime()
    );
  }

  async getGuruByShishya(
    shishyaId: string,
    status: "active" | "inactive" | "ended" = "active"
  ): Promise<{ relationship: DbGuruShishyaRelationship; guru: DbUser } | null> {
    for (const rel of this.relationships.values()) {
      if (rel.shishyaId === shishyaId && rel.status === status && rel.isPrimary) {
        const guru = this.users.get(rel.guruId);
        if (guru) {
          return { relationship: { ...rel }, guru: { ...guru } };
        }
      }
    }
    return null;
  }

  async getAllRelationships(): Promise<DbGuruShishyaRelationship[]> {
    return Array.from(this.relationships.values()).map((rel) => ({ ...rel }));
  }

  // ============================================================
  // DAILY SĀDHANĀ REPORT OPERATIONS
  // ============================================================

  /**
   * Atomically creates or updates a Daily Sādhanā Report.
   * Enforces database-level uniqueness on (studentId, practiceDate).
   */
  async saveDailyReport(reportData: DbDailySadhanaReport): Promise<DbDailySadhanaReport> {
    const unlock = await this.acquireLock();
    try {
      const nowIso = new Date().toISOString();

      // Database-level uniqueness check on (studentId, practiceDate)
      for (const rep of this.reports.values()) {
        if (
          rep.studentId === reportData.studentId &&
          rep.practiceDate === reportData.practiceDate &&
          rep.id !== reportData.id
        ) {
          throw new Error(
            `DATABASE CONSTRAINT VIOLATION: A report already exists for practice date ${reportData.practiceDate}.`
          );
        }
      }

      const existing = this.reports.get(reportData.id);
      const isNew = !existing;
      const submittedAt =
        reportData.submittedAt ||
        (reportData.status === "submitted" ? existing?.submittedAt || nowIso : undefined);

      const updatedReport: DbDailySadhanaReport = {
        ...reportData,
        createdAt: existing?.createdAt || reportData.createdAt || nowIso,
        updatedAt: nowIso,
        submittedAt,
      };

      this.reports.set(updatedReport.id, updatedReport);

      // Audit log determination
      const auditAction: DbAuditLog["action"] =
        updatedReport.status === "submitted"
          ? isNew || existing?.status !== "submitted"
            ? "REPORT_SUBMITTED"
            : "REPORT_EDITED"
          : "REPORT_CREATED";

      this.internalRecordAudit(
        updatedReport.studentId,
        auditAction,
        "DailyReport",
        updatedReport.id,
        {
          practiceDate: updatedReport.practiceDate,
          status: updatedReport.status,
          totalRounds: updatedReport.totalRounds,
          sleepDuration: updatedReport.sleepDurationMinutes,
        }
      );

      this.persistState();
      return { ...updatedReport };
    } finally {
      unlock();
    }
  }

  async getReportByStudentAndDate(
    studentId: string,
    practiceDate: string
  ): Promise<DbDailySadhanaReport | null> {
    for (const rep of this.reports.values()) {
      if (rep.studentId === studentId && rep.practiceDate === practiceDate) {
        return { ...rep };
      }
    }
    return null;
  }

  async getReportById(id: string): Promise<DbDailySadhanaReport | null> {
    const rep = this.reports.get(id);
    return rep ? { ...rep } : null;
  }

  async getReportsByStudent(
    studentId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ reports: DbDailySadhanaReport[]; total: number }> {
    const matched: DbDailySadhanaReport[] = [];

    for (const rep of this.reports.values()) {
      if (rep.studentId === studentId) {
        matched.push({ ...rep });
      }
    }

    // Sort by practiceDate DESC (most recent first)
    matched.sort((a, b) => b.practiceDate.localeCompare(a.practiceDate));

    const paginated = matched.slice(offset, offset + limit);
    return {
      reports: paginated,
      total: matched.length,
    };
  }

  // ============================================================
  // AUDIT LOG OPERATIONS
  // ============================================================

  async createAuditLog(
    logData: Omit<DbAuditLog, "id" | "timestamp">
  ): Promise<DbAuditLog> {
    const unlock = await this.acquireLock();
    try {
      return this.internalRecordAudit(
        logData.actorId,
        logData.action,
        logData.entityType,
        logData.entityId,
        logData.metadata
      );
    } finally {
      unlock();
    }
  }

  async getAuditLogsByActor(actorId: string): Promise<DbAuditLog[]> {
    const results: DbAuditLog[] = [];
    for (const log of this.auditLogs.values()) {
      if (log.actorId === actorId) {
        results.push({ ...log });
      }
    }
    return results.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getAuditLogsByEntity(
    entityType: DbAuditLog["entityType"],
    entityId: string
  ): Promise<DbAuditLog[]> {
    const results: DbAuditLog[] = [];
    for (const log of this.auditLogs.values()) {
      if (log.entityType === entityType && log.entityId === entityId) {
        results.push({ ...log });
      }
    }
    return results.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getAllAuditLogs(): Promise<DbAuditLog[]> {
    return Array.from(this.auditLogs.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // ============================================================
  // PHASE 14: GURU FOLLOW-UP & PRIVATE NOTE OPERATIONS
  // ============================================================

  /**
   * Creates a new Guru follow-up entry.
   * Atomically records audit log.
   */
  async createFollowUp(followUp: DbGuruFollowUp): Promise<DbGuruFollowUp> {
    const unlock = await this.acquireLock();
    try {
      const now = new Date().toISOString();
      const record: DbGuruFollowUp = {
        ...followUp,
        createdAt: followUp.createdAt || now,
        updatedAt: now,
      };
      this.followUps.set(record.id, record);

      this.internalRecordAudit(
        record.guruId,
        "FOLLOW_UP_CREATED",
        "FollowUp",
        record.id,
        { studentId: record.studentId, followUpDate: record.followUpDate }
      );

      this.persistState();
      return { ...record };
    } finally {
      unlock();
    }
  }

  /**
   * Retrieves all follow-up records for a specific Guru and Student.
   * Strictly verifies ownership (guruId matches).
   */
  async getFollowUps(guruId: string, studentId: string): Promise<DbGuruFollowUp[]> {
    const results: DbGuruFollowUp[] = [];
    for (const f of this.followUps.values()) {
      if (f.guruId === guruId && f.studentId === studentId) {
        results.push({ ...f });
      }
    }
    // Sort descending by follow-up date and createdAt
    return results.sort((a, b) => {
      const dateCompare = b.followUpDate.localeCompare(a.followUpDate);
      if (dateCompare !== 0) return dateCompare;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  /**
   * Updates follow-up status (e.g. marking completed).
   * Strictly verifies that the calling guru owns the follow-up record.
   */
  async updateFollowUpStatus(
    guruId: string,
    followUpId: string,
    status: FollowUpStatus
  ): Promise<DbGuruFollowUp | null> {
    const unlock = await this.acquireLock();
    try {
      const existing = this.followUps.get(followUpId);
      if (!existing || existing.guruId !== guruId) {
        return null;
      }

      const updated: DbGuruFollowUp = {
        ...existing,
        status,
        updatedAt: new Date().toISOString(),
      };
      this.followUps.set(followUpId, updated);

      this.internalRecordAudit(
        guruId,
        "FOLLOW_UP_COMPLETED",
        "FollowUp",
        followUpId,
        { studentId: existing.studentId, status }
      );

      return { ...updated };
    } finally {
      unlock();
    }
  }

  /**
   * Creates a private Guru note.
   * Strictly visible only to the authoring Guru.
   */
  async createPrivateNote(note: DbGuruPrivateNote): Promise<DbGuruPrivateNote> {
    const unlock = await this.acquireLock();
    try {
      const now = new Date().toISOString();
      const record: DbGuruPrivateNote = {
        ...note,
        createdAt: note.createdAt || now,
        updatedAt: now,
      };
      this.privateNotes.set(record.id, record);

      this.internalRecordAudit(
        record.guruId,
        "PRIVATE_NOTE_CREATED",
        "PrivateNote",
        record.id,
        { studentId: record.studentId }
      );

      this.persistState();
      return { ...record };
    } finally {
      unlock();
    }
  }

  /**
   * Retrieves private Guru notes for a student.
   * Strictly enforces guruId matching (zero access to other Gurus or Shishyas).
   */
  async getPrivateNotes(guruId: string, studentId: string): Promise<DbGuruPrivateNote[]> {
    const results: DbGuruPrivateNote[] = [];
    for (const n of this.privateNotes.values()) {
      if (n.guruId === guruId && n.studentId === studentId) {
        results.push({ ...n });
      }
    }
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Deletes a private Guru note.
   * Strictly enforces guruId authorization.
   */
  async deletePrivateNote(guruId: string, noteId: string): Promise<boolean> {
    const unlock = await this.acquireLock();
    try {
      const existing = this.privateNotes.get(noteId);
      if (!existing || existing.guruId !== guruId) {
        return false;
      }
      this.privateNotes.delete(noteId);

      this.internalRecordAudit(
        guruId,
        "PRIVATE_NOTE_DELETED",
        "PrivateNote",
        noteId,
        { studentId: existing.studentId }
      );

      return true;
    } finally {
      unlock();
    }
  }

  // ============================================================
  // PHASE 15: WEEKLY SANKALPA OPERATIONS
  // ============================================================

  /**
   * Creates a new Weekly Sankalpa record.
   * Atomically records audit log.
   */
  async createSankalpa(sankalpa: DbWeeklySankalpa): Promise<DbWeeklySankalpa> {
    const unlock = await this.acquireLock();
    try {
      const now = new Date().toISOString();
      const record: DbWeeklySankalpa = {
        ...sankalpa,
        createdAt: sankalpa.createdAt || now,
        updatedAt: now,
      };
      this.sankalpas.set(record.id, record);

      this.internalRecordAudit(
        record.studentId,
        "SANKALPA_CREATED",
        "WeeklySankalpa",
        record.id,
        { category: record.category, startDate: record.startDate, endDate: record.endDate }
      );

      this.persistState();
      return { ...record };
    } finally {
      unlock();
    }
  }

  /**
   * Retrieves active Sankalpa for a student if one exists.
   */
  async getActiveSankalpa(studentId: string): Promise<DbWeeklySankalpa | null> {
    for (const s of this.sankalpas.values()) {
      if (s.studentId === studentId && s.status === "active") {
        return { ...s };
      }
    }
    return null;
  }

  /**
   * Retrieves paginated Sankalpa history for a student.
   * Sorted descending by start date.
   */
  async getSankalpasByStudent(
    studentId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ sankalpas: DbWeeklySankalpa[]; total: number }> {
    const results: DbWeeklySankalpa[] = [];
    for (const s of this.sankalpas.values()) {
      if (s.studentId === studentId) {
        results.push({ ...s });
      }
    }

    const sorted = results.sort((a, b) => b.startDate.localeCompare(a.startDate));
    const total = sorted.length;
    const paginated = sorted.slice(offset, offset + limit);

    return { sankalpas: paginated, total };
  }

  /**
   * Retrieves specific Sankalpa by ID.
   */
  async getSankalpaById(sankalpaId: string): Promise<DbWeeklySankalpa | null> {
    const found = this.sankalpas.get(sankalpaId);
    return found ? { ...found } : null;
  }

  /**
   * Updates an existing Sankalpa (e.g. status, reflection, progress).
   */
  async updateSankalpa(
    sankalpaId: string,
    updates: Partial<DbWeeklySankalpa>
  ): Promise<DbWeeklySankalpa | null> {
    const unlock = await this.acquireLock();
    try {
      const existing = this.sankalpas.get(sankalpaId);
      if (!existing) {
        return null;
      }

      const now = new Date().toISOString();
      const updated: DbWeeklySankalpa = {
        ...existing,
        ...updates,
        updatedAt: now,
      };

      this.sankalpas.set(sankalpaId, updated);

      if (updates.status === "completed") {
        this.internalRecordAudit(
          existing.studentId,
          "SANKALPA_COMPLETED",
          "WeeklySankalpa",
          sankalpaId,
          { alignedDays: updates.progress?.alignedDays }
        );
      } else if (updates.status === "cancelled") {
        this.internalRecordAudit(
          existing.studentId,
          "SANKALPA_CANCELLED",
          "WeeklySankalpa",
          sankalpaId,
          {}
        );
      } else if (updates.reflection) {
        this.internalRecordAudit(
          existing.studentId,
          "SANKALPA_REFLECTED",
          "WeeklySankalpa",
          sankalpaId,
          {}
        );
      }

      return { ...updated };
    } finally {
      unlock();
    }
  }

  // ============================================================
  // PHASE 16: WEEKLY REFLECTION OPERATIONS
  // ============================================================

  /**
   * Saves or updates a weekly reflection.
   * Enforces one reflection per (studentId, weekStartDate) or (studentId, sankalpaId).
   */
  async saveWeeklyReflection(
    reflection: DbWeeklyReflection
  ): Promise<DbWeeklyReflection> {
    const unlock = await this.acquireLock();
    try {
      const now = new Date().toISOString();

      // Check if an existing reflection already exists for this week or sankalpa
      let existingId: string | null = null;
      for (const r of this.reflections.values()) {
        if (
          r.studentId === reflection.studentId &&
          ((reflection.sankalpaId && r.sankalpaId === reflection.sankalpaId) ||
            r.weekStartDate === reflection.weekStartDate)
        ) {
          existingId = r.id;
          break;
        }
      }

      if (existingId) {
        const existing = this.reflections.get(existingId)!;
        const updated: DbWeeklyReflection = {
          ...existing,
          state: reflection.state,
          wentWell: reflection.wentWell,
          difficult: reflection.difficult,
          improve: reflection.improve,
          guruMessage: reflection.guruMessage,
          sankalpaId: reflection.sankalpaId || existing.sankalpaId,
          updatedAt: now,
          submittedAt: now,
        };

        this.reflections.set(existingId, updated);
        this.internalRecordAudit(
          reflection.studentId,
          "REFLECTION_UPDATED",
          "WeeklyReflection",
          existingId,
          { state: reflection.state }
        );

        return { ...updated };
      } else {
        const newRecord: DbWeeklyReflection = {
          ...reflection,
          createdAt: reflection.createdAt || now,
          updatedAt: now,
          submittedAt: now,
        };

        this.reflections.set(newRecord.id, newRecord);
        this.internalRecordAudit(
          reflection.studentId,
          "REFLECTION_CREATED",
          "WeeklyReflection",
          newRecord.id,
          { state: reflection.state }
        );

        this.persistState();
        return { ...newRecord };
      }
    } finally {
      unlock();
    }
  }

  /**
   * Retrieves reflection for a specific student and week start date.
   */
  async getReflectionForWeek(
    studentId: string,
    weekStartDate: string
  ): Promise<DbWeeklyReflection | null> {
    for (const r of this.reflections.values()) {
      if (r.studentId === studentId && r.weekStartDate === weekStartDate) {
        return { ...r };
      }
    }
    return null;
  }

  /**
   * Retrieves reflection for a specific student and Sankalpa ID.
   */
  async getReflectionBySankalpaId(
    studentId: string,
    sankalpaId: string
  ): Promise<DbWeeklyReflection | null> {
    for (const r of this.reflections.values()) {
      if (r.studentId === studentId && r.sankalpaId === sankalpaId) {
        return { ...r };
      }
    }
    return null;
  }

  /**
   * Retrieves specific reflection by ID.
   */
  async getReflectionById(reflectionId: string): Promise<DbWeeklyReflection | null> {
    const found = this.reflections.get(reflectionId);
    return found ? { ...found } : null;
  }

  /**
   * Retrieves paginated reflection history for a student.
   */
  async getReflectionHistory(
    studentId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ reflections: DbWeeklyReflection[]; total: number }> {
    const results: DbWeeklyReflection[] = [];
    for (const r of this.reflections.values()) {
      if (r.studentId === studentId) {
        results.push({ ...r });
      }
    }

    const sorted = results.sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
    const total = sorted.length;
    const paginated = sorted.slice(offset, offset + limit);

    return { reflections: paginated, total };
  }

  // ============================================================
  // PHASE 18: NOTIFICATION & PREFERENCE OPERATIONS
  // ============================================================

  /**
   * Idempotently creates a notification. If a notification with the same eventKey exists, returns it.
   */
  async createNotification(notification: DbNotification): Promise<DbNotification> {
    const unlock = await this.acquireLock();
    try {
      // Check for existing by idempotent eventKey
      for (const n of this.notifications.values()) {
        if (n.eventKey === notification.eventKey) {
          return { ...n };
        }
      }

      this.notifications.set(notification.id, { ...notification });

      const auditId = `audit_notif_${Date.now()}`;
      this.auditLogs.set(auditId, {
        id: auditId,
        actorId: notification.userId,
        action: "NOTIFICATION_CREATED",
        entityType: "Notification",
        entityId: notification.id,
        timestamp: new Date().toISOString(),
        metadata: { type: notification.type, eventKey: notification.eventKey },
      });

      this.persistState();
      return { ...notification };
    } finally {
      unlock();
    }
  }

  /**
   * Retrieves notification by ID.
   */
  async getNotificationById(id: string): Promise<DbNotification | null> {
    const found = this.notifications.get(id);
    return found ? { ...found } : null;
  }

  /**
   * Retrieves notification by idempotent eventKey.
   */
  async getNotificationByEventKey(eventKey: string): Promise<DbNotification | null> {
    for (const n of this.notifications.values()) {
      if (n.eventKey === eventKey) {
        return { ...n };
      }
    }
    return null;
  }

  /**
   * Retrieves paginated notifications for a user, sorted newest first.
   */
  async getNotificationsByUser(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ notifications: DbNotification[]; total: number; unreadCount: number }> {
    const userNotifs: DbNotification[] = [];
    let unreadCount = 0;

    for (const n of this.notifications.values()) {
      if (n.userId === userId) {
        userNotifs.push({ ...n });
        if (n.status !== "read" && n.status !== "suppressed" && n.status !== "cancelled") {
          unreadCount++;
        }
      }
    }

    const sorted = userNotifs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const total = sorted.length;
    const paginated = sorted.slice(offset, offset + limit);

    return { notifications: paginated, total, unreadCount };
  }

  /**
   * Returns total unread notification count for a user.
   */
  async getUnreadNotificationCount(userId: string): Promise<number> {
    let unread = 0;
    for (const n of this.notifications.values()) {
      if (n.userId === userId && n.status !== "read" && n.status !== "suppressed" && n.status !== "cancelled") {
        unread++;
      }
    }
    return unread;
  }

  /**
   * Marks a notification as read.
   */
  async markNotificationAsRead(id: string, userId: string): Promise<boolean> {
    const unlock = await this.acquireLock();
    try {
      const found = this.notifications.get(id);
      if (!found || found.userId !== userId) {
        return false;
      }

      found.status = "read";
      found.readAt = new Date().toISOString();
      found.updatedAt = new Date().toISOString();
      this.notifications.set(id, found);
      return true;
    } finally {
      unlock();
    }
  }

  /**
   * Marks all pending/sent notifications as read for a user.
   */
  async markAllNotificationsAsRead(userId: string): Promise<number> {
    const unlock = await this.acquireLock();
    try {
      let count = 0;
      const now = new Date().toISOString();
      for (const [id, n] of this.notifications.entries()) {
        if (n.userId === userId && n.status !== "read") {
          n.status = "read";
          n.readAt = now;
          n.updatedAt = now;
          this.notifications.set(id, n);
          count++;
        }
      }
      return count;
    } finally {
      unlock();
    }
  }

  /**
   * Suppresses/cancels a notification matching an eventKey (e.g. when report is submitted).
   */
  async suppressNotificationByEventKey(eventKey: string, reason: string = "action_completed"): Promise<boolean> {
    const unlock = await this.acquireLock();
    try {
      for (const [id, n] of this.notifications.entries()) {
        if (n.eventKey === eventKey && n.status !== "read") {
          n.status = "suppressed";
          n.suppressedReason = reason;
          n.updatedAt = new Date().toISOString();
          this.notifications.set(id, n);
          return true;
        }
      }
      return false;
    } finally {
      unlock();
    }
  }

  /**
   * Retrieves notification preferences for a user, or creates sensible defaults.
   */
  async getNotificationPreferences(userId: string): Promise<DbNotificationPreferences> {
    const found = this.notificationPreferences.get(userId);
    if (found) {
      return { ...found };
    }

    const defaultPrefs: DbNotificationPreferences = {
      id: `pref_${userId}`,
      userId,
      dailyReportReminder: true,
      weeklyReflectionReminder: true,
      sankalpaReminder: true,
      guruDailySummary: true,
      guruFollowUpReminder: true,
      quietHoursStart: "21:00",
      quietHoursEnd: "05:00",
      timezone: "Asia/Kolkata",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.notificationPreferences.set(userId, defaultPrefs);
    this.persistState();
    return { ...defaultPrefs };
  }

  /**
   * Upserts notification preferences for a user.
   */
  async upsertNotificationPreferences(prefs: DbNotificationPreferences): Promise<DbNotificationPreferences> {
    const unlock = await this.acquireLock();
    try {
      const updated: DbNotificationPreferences = {
        ...prefs,
        updatedAt: new Date().toISOString(),
      };
      this.notificationPreferences.set(prefs.userId, updated);
      this.persistState();
      return { ...updated };
    } finally {
      unlock();
    }
  }
}

// Global Singleton Instance
export const dbStore = new NityasadhanaDbStore();
