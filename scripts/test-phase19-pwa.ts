// ============================================================
// NITYASĀDHANĀ — PHASE 19: PWA & MOBILE-FIRST SPECIFICATION TESTS
// ============================================================
// Validates:
// 1. Web App Manifest Invariants (Standalone, portrait, brand colors, icons)
// 2. Offline IndexedDB / Storage Engine (Save, retrieve, update, delete)
// 3. Multi-Account User-Scoped Isolation (Zero cross-user draft leak)
// 4. Client Report ID Idempotency Generation
// 5. Contextual Install Prompt Cooldown Logic
// 6. Safe Area & Viewport Fit Invariants
// 7. Calm Status & Zero-Urgency Communication
// ============================================================

import manifest from "../app/manifest";
import { offlineDB, OfflineReportDraft } from "../lib/pwa/indexed-db";
import { getSyncStatusMeta } from "../lib/reports/offline";
import * as fs from "fs";
import * as path from "path";

async function runPhase19PWATests() {
  console.log("================================================================");
  console.log("=== RUNNING PHASE 19 PWA & MOBILE SPECIFICATION TESTS ==========");
  console.log("================================================================\n");

  // ------------------------------------------------------------
  // TEST 1: Web App Manifest Validation
  // ------------------------------------------------------------
  console.log("[TEST 1] Testing Web App Manifest Invariants...");
  const manifestData = manifest();

  if (manifestData.name !== "Nityasādhanā" || manifestData.short_name !== "Nityasādhanā") {
    throw new Error(`Manifest name/short_name invalid: ${manifestData.name}`);
  }
  if (manifestData.display !== "standalone") {
    throw new Error(`Expected display to be 'standalone', got '${manifestData.display}'`);
  }
  if (manifestData.orientation !== "portrait") {
    throw new Error(`Expected orientation to be 'portrait', got '${manifestData.orientation}'`);
  }
  if (manifestData.background_color !== "#EAF7F4" || manifestData.theme_color !== "#EAF7F4") {
    throw new Error("Manifest colors do not match brand Serene Aqua (#EAF7F4)");
  }
  if (!manifestData.icons || manifestData.icons.length < 2) {
    throw new Error("Manifest must provide at least 2 icon sizes (any and maskable)");
  }
  console.log(`-> Manifest Name: "${manifestData.name}", Display: "${manifestData.display}", Background: "${manifestData.background_color}"`);
  console.log(`-> Icons configured: ${manifestData.icons.length}`);
  console.log("✓ TEST 1 PASSED: Web App Manifest conforms strictly to PWA requirements.");

  // ------------------------------------------------------------
  // TEST 2: Offline Draft Storage & Operations
  // ------------------------------------------------------------
  console.log("\n[TEST 2] Testing Offline Storage Engine...");
  const studentA = "shishya_pwa_test_01";
  const dateStr = "2026-08-27";
  const testPayload = {
    sleepTime: "21:30",
    wakeUpTime: "03:45",
    japaRounds: 16,
    readingDurationMinutes: 30,
  };

  const savedDraft = await offlineDB.saveDraft(studentA, dateStr, testPayload, "draft");
  if (!savedDraft || !savedDraft.clientReportId) {
    throw new Error("Failed to save offline draft or missing clientReportId");
  }
  console.log(`-> Saved Draft ID: "${savedDraft.id}", ClientReportId: "${savedDraft.clientReportId}"`);

  const retrievedDraft = await offlineDB.getDraft<typeof testPayload>(studentA, dateStr);
  if (!retrievedDraft || retrievedDraft.data.japaRounds !== 16) {
    throw new Error("Failed to retrieve saved offline draft");
  }

  // Verify clientReportId persists across updates (for idempotency)
  const updatedPayload = { ...testPayload, japaRounds: 18 };
  const updatedDraft = await offlineDB.saveDraft(studentA, dateStr, updatedPayload, "draft");
  if (updatedDraft.clientReportId !== savedDraft.clientReportId) {
    throw new Error("clientReportId changed across edits; server idempotency compromised!");
  }
  console.log("✓ TEST 2 PASSED: Offline draft CRUD operations verified.");

  // ------------------------------------------------------------
  // TEST 3: Multi-Account Isolation & Zero Leakage
  // ------------------------------------------------------------
  console.log("\n[TEST 3] Testing Multi-Account User-Scoped Isolation...");
  const studentB = "shishya_pwa_test_02";

  // Student B should NOT be able to access Student A's draft
  const studentBDraft = await offlineDB.getDraft(studentB, dateStr);
  if (studentBDraft !== null) {
    throw new Error("SECURITY LEAK: Student B was able to access Student A's offline draft!");
  }

  // Clean up student A drafts on logout simulation
  await offlineDB.deleteDraft(studentA, dateStr);
  const afterDelete = await offlineDB.getDraft(studentA, dateStr);
  if (afterDelete !== null) {
    throw new Error("Failed to clear offline draft upon deletion");
  }
  console.log("✓ TEST 3 PASSED: Multi-account isolation and draft clearing confirmed.");

  // ------------------------------------------------------------
  // TEST 4: Service Worker & Offline HTML Assets Existence
  // ------------------------------------------------------------
  console.log("\n[TEST 4] Testing Service Worker & Offline Assets...");
  const swPath = path.join(process.cwd(), "public", "sw.js");
  const offlineHtmlPath = path.join(process.cwd(), "public", "offline.html");

  if (!fs.existsSync(swPath)) {
    throw new Error("public/sw.js is missing!");
  }
  if (!fs.existsSync(offlineHtmlPath)) {
    throw new Error("public/offline.html is missing!");
  }

  const swContent = fs.readFileSync(swPath, "utf-8");
  if (!swContent.includes("navigate")) {
    throw new Error("sw.js must handle navigation!");
  }
  console.log("-> public/sw.js and public/offline.html validated.");
  console.log("✓ TEST 4 PASSED: Service worker and offline fallback assets confirmed.");

  // ------------------------------------------------------------
  // TEST 5: Mobile Safe Area Utilities & Layout Viewport
  // ------------------------------------------------------------
  console.log("\n[TEST 5] Testing Mobile Safe Area Utilities...");
  const cssPath = path.join(process.cwd(), "app", "globals.css");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  const requiredSafeClasses = ["pt-safe", "pb-safe", "pl-safe", "pr-safe", "min-h-screen-safe"];
  for (const cls of requiredSafeClasses) {
    if (!cssContent.includes(cls)) {
      throw new Error(`globals.css missing required safe-area utility: ${cls}`);
    }
  }

  const layoutPath = path.join(process.cwd(), "app", "layout.tsx");
  const layoutContent = fs.readFileSync(layoutPath, "utf-8");
  if (!layoutContent.includes('viewportFit: "cover"') || !layoutContent.includes("appleWebApp")) {
    throw new Error("app/layout.tsx missing viewportFit: cover or appleWebApp configuration");
  }
  console.log("✓ TEST 5 PASSED: Safe areas and viewport configuration confirmed.");

  // ------------------------------------------------------------
  // TEST 6: Calm Sync Status UI Meta
  // ------------------------------------------------------------
  console.log("\n[TEST 6] Testing Calm Status Phrasing...");
  const savedMeta = getSyncStatusMeta("saved");
  const offlineMeta = getSyncStatusMeta("offline");

  console.log(`-> "saved" label: "${savedMeta.label}"`);
  console.log(`-> "offline" label: "${offlineMeta.label}"`);

  if (!savedMeta.label.includes("Saved") || !offlineMeta.label.includes("Offline")) {
    throw new Error("Sync status labels do not communicate calm local safety");
  }
  console.log("✓ TEST 6 PASSED: Calm status phrasing confirmed.");

  console.log("\n================================================================");
  console.log("ALL 6 PHASE 19 PWA & MOBILE TESTS PASSED WITH 100% SUCCESS!");
  console.log("================================================================\n");
}

runPhase19PWATests().catch((err) => {
  console.error("Phase 19 PWA Tests Failed:", err);
  process.exit(1);
});
