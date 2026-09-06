import { UserRole, AccountStatus } from "@/types/auth";
import { AttentionLevel, AttentionSignal } from "@/lib/guru/attention/types";

export type InvitationStatus = "pending" | "used" | "expired" | "revoked";

export type RelationshipStatus = "active" | "inactive" | "ended";

/**
 * Future-ready relationship type.
 * V1: "primary_guru"
 * Future expansions: "mentor" | "co_mentor" | "counselor"
 */
export type RelationshipType = "primary_guru";

export interface DbUser {
  id: string;
  authProviderId: string;
  role: UserRole;
  name: string;
  email: string;
  passwordHash?: string;
  spiritualName?: string;
  ashramId?: string;
  linkedGuruId?: string;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DbSession {
  id: string; // Session ID (cuid or unique string)
  sessionTokenHash: string; // SHA-256 hash of raw cookie token
  userId: string;
  expiresAt: string; // ISO UTC
  createdAt: string; // ISO UTC
  updatedAt: string; // ISO UTC
}

export interface DbPasswordResetToken {
  id: string;
  tokenHash: string; // SHA-256 hash of random reset token
  userId: string;
  expiresAt: string; // ISO UTC
  usedAt?: string; // ISO UTC
  createdAt: string; // ISO UTC
}


export interface DbInvitation {
  id: string;
  tokenHash: string; // SHA-256 hash of 256-bit URL token
  codeHash: string; // SHA-256 hash of readable code (e.g. NITYA-7K4P-X9QM)
  rawCodeMasked: string; // e.g. "NITYA-••••-X9QM" for safe display
  createdByUserId: string; // References Guru ID
  intendedRole: "shishya";
  status: InvitationStatus;
  expiresAt: string; // ISO UTC
  usedAt?: string; // ISO UTC
  usedByUserId?: string; // References Shishya ID
  revokedAt?: string; // ISO UTC
  createdAt: string;
  updatedAt: string;
}

export interface DbGuruShishyaRelationship {
  id: string;
  guruId: string;
  shishyaId: string;
  relationshipType: RelationshipType;
  status: RelationshipStatus;
  isPrimary: boolean;
  createdAt: string; // ISO UTC
  updatedAt: string; // ISO UTC
  deactivatedAt?: string; // ISO UTC
  deactivatedBy?: string; // userId who deactivated the relationship
  endedAt?: string; // ISO UTC
  endedBy?: string; // userId
}

export interface PublicInvitationDetails {
  id: string;
  guruName: string;
  expiresAt: string;
  isValid: boolean;
  errorReason?: string;
}

export type DailySadhanaReportStatus = "draft" | "submitted";

export interface DbDailySadhanaReport {
  id: string;
  studentId: string;
  practiceDate: string; // YYYY-MM-DD (logical calendar practice date)
  sleepTime: string; // HH:MM (24-hour normalized time string)
  wakeUpTime: string; // HH:MM (24-hour normalized time string)
  sleepDurationMinutes: number; // calculated automatically (handles cross-midnight)
  japaRounds: number; // standard completed rounds
  extraRounds: number; // additional completed rounds
  totalRounds: number; // calculated automatically: japaRounds + extraRounds
  japaCompletedAt?: string; // optional time e.g. "07:01"
  readingDurationMinutes: number; // duration in minutes
  readingNote?: string; // optional book/topic title
  hearingDurationMinutes: number; // duration in minutes
  hearingNote?: string; // optional lecture/topic title
  collegeStudyDurationMinutes: number; // duration in minutes
  selfStudyDurationMinutes: number; // duration in minutes
  totalStudyDurationMinutes: number; // calculated automatically: college + self
  dayRestDurationMinutes: number; // duration in minutes
  timeWastedDurationMinutes: number; // duration in minutes
  notes?: string; // optional personal reflection
  status: DailySadhanaReportStatus;
  createdAt: string; // ISO UTC
  updatedAt: string; // ISO UTC
  submittedAt?: string; // ISO UTC (preserved across edits)
  timezone: string; // e.g. "Asia/Kolkata"
}

// ------------------------------------------------------------
// PHASE 14: GURU FOLLOW-UP & PRIVATE NOTES MODELS
// ------------------------------------------------------------

export type FollowUpStatus = "upcoming" | "due_today" | "overdue" | "completed";

export interface DbGuruFollowUp {
  id: string;
  guruId: string;
  studentId: string;
  note: string;
  followUpDate: string; // YYYY-MM-DD (discussion / record date)
  nextFollowUpDate?: string; // YYYY-MM-DD (optional next target date)
  status: FollowUpStatus;
  createdAt: string; // ISO UTC
  updatedAt: string; // ISO UTC
}

export interface DbGuruPrivateNote {
  id: string;
  guruId: string;
  studentId: string;
  content: string;
  createdAt: string; // ISO UTC
  updatedAt: string; // ISO UTC
}

export interface DbAttentionHistoryItem {
  date: string; // YYYY-MM-DD
  level: AttentionLevel;
  headline: string;
  reason: string;
  signals: AttentionSignal[];
}

// ============================================================
// PHASE 15: WEEKLY SANKALPA DATA TYPES & MODELS
// ============================================================

export type SankalpaCategory =
  | "wake_up"
  | "japa"
  | "reading"
  | "hearing"
  | "study"
  | "time_management"
  | "sleep"
  | "routine"
  | "self_discipline"
  | "reflection"
  | "other";

export type SankalpaStatus = "active" | "completed" | "incomplete" | "cancelled";

export type SankalpaTargetType = "metric_based" | "custom";

export interface SankalpaTargetConfig {
  metric?:
    | "wake_up_time"
    | "japa_rounds"
    | "reading_duration"
    | "hearing_duration"
    | "study_duration"
    | "time_wasted";
  targetValue?: number | string; // e.g. "03:30", 16, 30
  comparison?: "at_or_before" | "at_least" | "at_most";
}

export type SankalpaDayStatus = "completed" | "not_completed" | "pending" | "future";

export interface SankalpaDailyProgress {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "Mon", "Tue", etc.
  status: SankalpaDayStatus;
  value?: string | number; // e.g. "03:20 AM", 16
  targetDescription?: string;
}

export interface SankalpaProgress {
  alignedDays: number;
  totalDays: number; // usually 7
  eligibleDays: number; // days elapsed up to today
  dailyProgress: SankalpaDailyProgress[];
  isTargetMet: boolean;
}

export interface SankalpaReflection {
  content: string;
  whatHelped?: string;
  whatDifficult?: string;
  whatContinue?: string;
  submittedAt: string; // ISO UTC
}

export interface DbWeeklySankalpa {
  id: string;
  studentId: string;
  category: SankalpaCategory;
  title: string;
  description?: string;
  targetType: SankalpaTargetType;
  targetConfig?: SankalpaTargetConfig;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: SankalpaStatus;
  progress?: SankalpaProgress;
  reflection?: SankalpaReflection;
  completedAt?: string; // ISO UTC
  cancelledAt?: string; // ISO UTC
  createdAt: string; // ISO UTC
  updatedAt: string; // ISO UTC
}

// ============================================================
// PHASE 16: WEEKLY REFLECTION DATA TYPES & MODELS
// ============================================================

export type ReflectionState =
  | "steady"
  | "good"
  | "mixed"
  | "difficult"
  | "reflective";

export interface DbWeeklyReflection {
  id: string;
  studentId: string;
  sankalpaId?: string;
  weekStartDate: string; // YYYY-MM-DD
  weekEndDate: string; // YYYY-MM-DD
  state: ReflectionState;
  wentWell?: string; // Max 300 chars
  difficult?: string; // Max 300 chars
  improve?: string; // Max 300 chars
  guruMessage?: string; // Max 300 chars (Optional message visible to Guru)
  createdAt: string; // ISO UTC
  updatedAt: string; // ISO UTC
  submittedAt: string; // ISO UTC
}

export type AuditAction =
  | "INVITATION_CREATED"
  | "INVITATION_REVOKED"
  | "INVITATION_USED"
  | "SHISHYA_CONNECTED"
  | "SHISHYA_DEACTIVATED"
  | "REPORT_CREATED"
  | "REPORT_EDITED"
  | "REPORT_SUBMITTED"
  | "CORRECTION_REQUESTED"
  | "FOLLOW_UP_CREATED"
  | "FOLLOW_UP_COMPLETED"
  | "PRIVATE_NOTE_CREATED"
  | "PRIVATE_NOTE_DELETED"
  | "SANKALPA_CREATED"
  | "SANKALPA_COMPLETED"
  | "SANKALPA_CANCELLED"
  | "SANKALPA_REFLECTED"
  | "REFLECTION_CREATED"
  | "REFLECTION_UPDATED"
  | "NOTIFICATION_CREATED";

export interface DbAuditLog {
  id: string;
  actorId: string;
  action: AuditAction;
  entityType:
    | "Invitation"
    | "Mentorship"
    | "DailyReport"
    | "User"
    | "FollowUp"
    | "PrivateNote"
    | "WeeklySankalpa"
    | "WeeklyReflection"
    | "Notification";
  entityId: string;
  timestamp: string; // ISO UTC
  metadata?: Record<string, unknown>;
}

// ============================================================
// PHASE 18: NOTIFICATION DATA TYPES & MODELS
// ============================================================

export type NotificationType =
  | "daily_report_reminder"
  | "weekly_reflection_reminder"
  | "sankalpa_reminder"
  | "guru_daily_summary"
  | "guru_follow_up_reminder"
  | "gentle_reminder";

export type NotificationPriority = "low" | "normal" | "important";

export type NotificationStatus = "pending" | "sent" | "read" | "suppressed" | "cancelled";

export interface DbNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  scheduledForDate: string; // YYYY-MM-DD
  eventKey: string; // Idempotent unique key (e.g. "daily_report:2026-08-27:userId")
  actionUrl?: string; // Optional deep link URL
  readAt?: string; // ISO UTC
  sentAt?: string; // ISO UTC
  suppressedReason?: string;
  createdAt: string; // ISO UTC
  updatedAt: string; // ISO UTC
  expiresAt?: string; // ISO UTC
}

export interface DbNotificationPreferences {
  id: string;
  userId: string;
  dailyReportReminder: boolean;
  weeklyReflectionReminder: boolean;
  sankalpaReminder: boolean;
  guruDailySummary: boolean;
  guruFollowUpReminder: boolean;
  quietHoursStart: string; // HH:MM (24h format, default "21:00")
  quietHoursEnd: string; // HH:MM (24h format, default "05:00")
  timezone: string; // e.g. "Asia/Kolkata"
  pushSubscription?: string; // Optional serialized Web Push subscription
  createdAt: string; // ISO UTC
  updatedAt: string; // ISO UTC
}

