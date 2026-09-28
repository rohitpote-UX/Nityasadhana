import { dbStore } from "../lib/db/store";
import { DbUser } from "../lib/db/schema";
import {
  calculateSleepDuration,
  calculateTotalRounds,
  calculateTotalStudy,
  formatDuration,
  getLocalDateString,
  generateWhatsAppSummary,
} from "../lib/reports/calculations";
import { reportService } from "../lib/reports/service";
import { canEditReport } from "../lib/reports/validation";

async function runPhase8Tests() {
  console.log("================================================================");
  console.log("=== RUNNING PHASE 8 DAILY SĀDHANĀ REPORT SYSTEM TESTS ===");
  console.log("================================================================\n");

  // -------------------------------------------------------------------------
  // TEST 1: Cross-Midnight Sleep Calculation
  // -------------------------------------------------------------------------
  console.log("[TEST 1] Testing Cross-Midnight Sleep Duration Calculations...");

  // WhatsApp case: Slept 8:45 PM, Woke up 3:20 AM
  const sleep1 = calculateSleepDuration("20:45", "03:20");
  const sleep1Formatted = formatDuration(sleep1);
  console.log(`-> 8:45 PM to 3:20 AM: ${sleep1} mins (${sleep1Formatted})`);
  if (sleep1 !== 395 || sleep1Formatted !== "6h 35m") {
    throw new Error(`TEST 1 FAILED: Expected 395 mins (6h 35m), got ${sleep1} mins (${sleep1Formatted})`);
  }

  // Cross-midnight: Slept 10:30 PM, Woke up 4:30 AM
  const sleep2 = calculateSleepDuration("22:30", "04:30");
  const sleep2Formatted = formatDuration(sleep2);
  console.log(`-> 10:30 PM to 4:30 AM: ${sleep2} mins (${sleep2Formatted})`);
  if (sleep2 !== 360 || sleep2Formatted !== "6h") {
    throw new Error(`TEST 1 FAILED: Expected 360 mins (6h), got ${sleep2} mins (${sleep2Formatted})`);
  }

  // Same day sleep/rest: Slept 1:00 AM, Woke up 6:00 AM
  const sleep3 = calculateSleepDuration("01:00", "06:00");
  const sleep3Formatted = formatDuration(sleep3);
  console.log(`-> 1:00 AM to 6:00 AM: ${sleep3} mins (${sleep3Formatted})`);
  if (sleep3 !== 300 || sleep3Formatted !== "5h") {
    throw new Error(`TEST 1 FAILED: Expected 300 mins (5h), got ${sleep3} mins (${sleep3Formatted})`);
  }

  console.log("✓ TEST 1 PASSED: Cross-midnight and same-day sleep calculations are accurate.\n");

  // -------------------------------------------------------------------------
  // TEST 2: Japa and Study Automatic Calculations
  // -------------------------------------------------------------------------
  console.log("[TEST 2] Testing Japa and Study Automatic Calculations...");

  const totalRounds = calculateTotalRounds(16, 2);
  console.log(`-> 16 standard + 2 extra rounds = ${totalRounds} rounds`);
  if (totalRounds !== 18) {
    throw new Error(`TEST 2 FAILED: Expected 18 rounds, got ${totalRounds}`);
  }

  const totalStudyMinutes = calculateTotalStudy(360, 120);
  const totalStudyFormatted = formatDuration(totalStudyMinutes);
  console.log(`-> 6h (360m) college + 2h (120m) self-study = ${totalStudyMinutes} mins (${totalStudyFormatted})`);
  if (totalStudyMinutes !== 480 || totalStudyFormatted !== "8h") {
    throw new Error(`TEST 2 FAILED: Expected 480 mins (8h), got ${totalStudyMinutes} mins (${totalStudyFormatted})`);
  }

  console.log("✓ TEST 2 PASSED: Automatic calculations for rounds and study work accurately.\n");

  // -------------------------------------------------------------------------
  // SETUP TEST USERS
  // -------------------------------------------------------------------------
  const shishyaA: DbUser = {
    id: "shishya_report_user_a",
    authProviderId: "auth_shishya_rep_a",
    role: "shishya",
    name: "Arjuna Das",
    spiritualName: "Arjuna Das",
    email: "arjuna@example.com",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await dbStore.upsertUser(shishyaA);

  const shishyaB: DbUser = {
    id: "shishya_report_user_b",
    authProviderId: "auth_shishya_rep_b",
    role: "shishya",
    name: "Bhima Das",
    spiritualName: "Bhima Das",
    email: "bhima@example.com",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await dbStore.upsertUser(shishyaB);

  const testStudentIds = [shishyaA.id, shishyaB.id];
  for (const [key, report] of Array.from(((dbStore as any).reports as Map<string, any>).entries())) {
    if (testStudentIds.includes(report.studentId)) {
      ((dbStore as any).reports as Map<string, any>).delete(key);
    }
  }

  const todayStr = getLocalDateString(new Date(), "Asia/Kolkata");

  // -------------------------------------------------------------------------
  // TEST 3: Incomplete Draft Creation & Retrieval
  // -------------------------------------------------------------------------
  console.log("[TEST 3] Testing Draft Report Creation and Recovery...");

  const draftResult = await reportService.saveOrSubmitReport({
    studentId: shishyaA.id,
    input: {
      practiceDate: todayStr,
      sleepTime: "20:45",
      wakeUpTime: "03:20",
      japaRounds: 16,
      // Leaving reading, hearing, study blank to test partial draft support
    },
    status: "draft",
  });

  if (!draftResult.success || !draftResult.report) {
    throw new Error(`TEST 3 FAILED: Could not save draft: ${draftResult.error}`);
  }

  if (draftResult.report.status !== "draft" || draftResult.report.submittedAt !== undefined) {
    throw new Error("TEST 3 FAILED: Draft report must have status='draft' and no submittedAt timestamp");
  }

  const loadedDraft = await reportService.getReport(shishyaA.id, todayStr);
  if (!loadedDraft || loadedDraft.status !== "draft" || loadedDraft.sleepDurationMinutes !== 395) {
    throw new Error("TEST 3 FAILED: Loaded draft did not match saved state");
  }

  console.log(`-> Saved draft for ${todayStr}: Status=${loadedDraft.status}, Sleep=${loadedDraft.sleepDurationMinutes}m, Rounds=${loadedDraft.totalRounds}`);
  console.log("✓ TEST 3 PASSED: Incomplete drafts are supported and successfully recovered.\n");

  // -------------------------------------------------------------------------
  // TEST 4: Full Report Submission & Server-Authoritative Timestamps
  // -------------------------------------------------------------------------
  console.log("[TEST 4] Testing Full Report Submission and Server Timestamps...");

  const submitResult = await reportService.saveOrSubmitReport({
    studentId: shishyaA.id,
    input: {
      practiceDate: todayStr,
      sleepTime: "20:45",
      wakeUpTime: "03:20",
      japaRounds: 16,
      extraRounds: 2,
      japaCompletedAt: "07:01",
      readingDurationMinutes: 30,
      readingNote: "Coming Back",
      hearingDurationMinutes: 102,
      hearingNote: "SB (36 min) + 66 min",
      collegeStudyDurationMinutes: 360,
      selfStudyDurationMinutes: 120,
      dayRestDurationMinutes: 0,
      timeWastedDurationMinutes: 0,
      notes: "Felt peaceful during morning Japa.",
    },
    status: "submitted",
  });

  if (!submitResult.success || !submitResult.report) {
    throw new Error(`TEST 4 FAILED: Report submission failed: ${submitResult.error}`);
  }

  const report = submitResult.report;
  if (report.status !== "submitted") {
    throw new Error("TEST 4 FAILED: Expected status='submitted'");
  }
  if (!report.submittedAt) {
    throw new Error("TEST 4 FAILED: Expected server-generated submittedAt timestamp");
  }
  if (report.totalRounds !== 18 || report.totalStudyDurationMinutes !== 480) {
    throw new Error(`TEST 4 FAILED: Expected totalRounds=18 & totalStudy=480, got ${report.totalRounds}, ${report.totalStudyDurationMinutes}`);
  }

  const originalSubmittedAt = report.submittedAt;
  console.log(`-> Successfully submitted report. submittedAt: ${originalSubmittedAt}`);
  console.log(`-> Derived values: sleepDuration=${report.sleepDurationMinutes}m, totalRounds=${report.totalRounds}, totalStudy=${report.totalStudyDurationMinutes}m`);
  console.log("✓ TEST 4 PASSED: Full report submission and server-side calculations verified.\n");

  // -------------------------------------------------------------------------
  // TEST 5: Database Uniqueness Constraint (Duplicate Prevention)
  // -------------------------------------------------------------------------
  console.log("[TEST 5] Testing Database Unique Constraint on (studentId, practiceDate)...");

  try {
    await dbStore.saveDailyReport({
      id: "rep_duplicate_attempt_001",
      studentId: shishyaA.id,
      practiceDate: todayStr,
      sleepTime: "21:00",
      wakeUpTime: "04:00",
      sleepDurationMinutes: 420,
      japaRounds: 16,
      extraRounds: 0,
      totalRounds: 16,
      readingDurationMinutes: 0,
      hearingDurationMinutes: 0,
      collegeStudyDurationMinutes: 0,
      selfStudyDurationMinutes: 0,
      totalStudyDurationMinutes: 0,
      dayRestDurationMinutes: 0,
      timeWastedDurationMinutes: 0,
      status: "submitted",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timezone: "Asia/Kolkata",
    });
    throw new Error("TEST 5 FAILED: Duplicate report was not rejected by database constraint!");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("DATABASE CONSTRAINT VIOLATION")) {
      throw new Error(`TEST 5 FAILED: Unexpected error: ${msg}`);
    }
    console.log(`-> Database correctly rejected duplicate report: "${msg}"`);
  }

  console.log("✓ TEST 5 PASSED: Unique constraint enforced at database level.\n");

  // -------------------------------------------------------------------------
  // TEST 6: Editing Submitted Report within Edit Window
  // -------------------------------------------------------------------------
  console.log("[TEST 6] Testing Editing Submitted Report within Edit Window...");

  const editResult = await reportService.saveOrSubmitReport({
    studentId: shishyaA.id,
    input: {
      practiceDate: todayStr,
      sleepTime: "20:45",
      wakeUpTime: "03:20",
      japaRounds: 16,
      extraRounds: 3, // Changed from 2 -> 3
      japaCompletedAt: "07:01",
      readingDurationMinutes: 30,
      hearingDurationMinutes: 102,
      collegeStudyDurationMinutes: 360,
      selfStudyDurationMinutes: 120,
      dayRestDurationMinutes: 0,
      timeWastedDurationMinutes: 0,
    },
    status: "submitted",
  });

  if (!editResult.success || !editResult.report) {
    throw new Error(`TEST 6 FAILED: Edit report failed: ${editResult.error}`);
  }

  if (editResult.report.totalRounds !== 19) {
    throw new Error(`TEST 6 FAILED: Expected totalRounds=19 after edit, got ${editResult.report.totalRounds}`);
  }
  if (editResult.report.submittedAt !== originalSubmittedAt) {
    throw new Error("TEST 6 FAILED: Original submittedAt timestamp must be preserved across edits!");
  }

  console.log(`-> Edited extra rounds 2 -> 3. New totalRounds: ${editResult.report.totalRounds}`);
  console.log(`-> submittedAt preserved: ${editResult.report.submittedAt}`);
  console.log("✓ TEST 6 PASSED: Report edited cleanly within edit window with timestamp preservation.\n");

  // -------------------------------------------------------------------------
  // TEST 7: Future Date Rejection
  // -------------------------------------------------------------------------
  console.log("[TEST 7] Testing Rejection of Future Practice Dates...");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrow, "Asia/Kolkata");

  const futureResult = await reportService.saveOrSubmitReport({
    studentId: shishyaA.id,
    input: {
      practiceDate: tomorrowStr,
      sleepTime: "21:00",
      wakeUpTime: "04:00",
      japaRounds: 16,
    },
    status: "submitted",
  });

  if (futureResult.success) {
    throw new Error("TEST 7 FAILED: Future practice date report was unexpectedly accepted!");
  }
  console.log(`-> Future report for ${tomorrowStr} rejected with: "${futureResult.error}"`);
  console.log("✓ TEST 7 PASSED: Future dates are strictly prevented.\n");

  // -------------------------------------------------------------------------
  // TEST 8: Edit Window Expiration (Outside Configured Window)
  // -------------------------------------------------------------------------
  console.log("[TEST 8] Testing Edit Window Expiration (Reports older than 1 day)...");

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 3);
  const pastDateStr = getLocalDateString(pastDate, "Asia/Kolkata");

  const isEditable = canEditReport(pastDateStr, "Asia/Kolkata", 1);
  if (isEditable) {
    throw new Error(`TEST 8 FAILED: Expected date ${pastDateStr} (3 days ago) to be uneditable`);
  }

  const pastEditResult = await reportService.saveOrSubmitReport({
    studentId: shishyaA.id,
    input: {
      practiceDate: pastDateStr,
      sleepTime: "21:00",
      wakeUpTime: "04:00",
      japaRounds: 16,
    },
    status: "submitted",
  });

  if (pastEditResult.success) {
    throw new Error("TEST 8 FAILED: Report outside edit window was unexpectedly accepted!");
  }
  console.log(`-> Report for ${pastDateStr} (3 days ago) rejected with: "${pastEditResult.error}"`);
  console.log("✓ TEST 8 PASSED: Configurable edit window strictly enforced.\n");

  // -------------------------------------------------------------------------
  // TEST 9: Cross-Shishya Isolation
  // -------------------------------------------------------------------------
  console.log("[TEST 9] Testing Cross-Shishya Report Isolation...");

  // Shishya B attempts to read Shishya A's report
  const crossAccess = await reportService.getReportByIdForStudent(report.id, shishyaB.id);
  if (crossAccess !== null) {
    throw new Error("TEST 9 FAILED: Shishya B was able to access Shishya A's report!");
  }

  console.log(`-> Shishya B query for Shishya A report (${report.id}): REJECTED (returned null)`);
  console.log("✓ TEST 9 PASSED: Zero cross-Shishya data leakage.\n");

  // -------------------------------------------------------------------------
  // TEST 10: WhatsApp Summary Generation Presentation Layer
  // -------------------------------------------------------------------------
  console.log("[TEST 10] Testing WhatsApp Summary Generator...");

  const waSummary = generateWhatsAppSummary(editResult.report);
  console.log("-> Generated WhatsApp Summary:\n" + waSummary + "\n");

  if (!waSummary.includes("Date: " + todayStr) || !waSummary.includes("Rounds: 16 + 3 · 19 rounds") || !waSummary.includes("Sleep: 8:45 PM → 3:20 AM · 6h 35m")) {
    throw new Error("TEST 10 FAILED: WhatsApp summary missing expected structured information");
  }

  console.log("✓ TEST 10 PASSED: Structured data converts seamlessly to traditional summary format.\n");

  console.log("================================================================");
  console.log("ALL 10 PHASE 8 DAILY SĀDHANĀ REPORT TESTS PASSED PERFECTLY!");
  console.log("================================================================");
}

runPhase8Tests().catch((err) => {
  console.error("\nTEST SUITE FAILED WITH ERROR:", err);
  process.exit(1);
});
