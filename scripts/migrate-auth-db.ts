import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";

// ============================================================
// NITYASĀDHANĀ — DATABASE AUTHENTICATION MIGRATION SCRIPT
// ============================================================
// Non-destructively migrates .nityasadhana-db.json to support first-party auth.
// Preserves:
// - All existing User records
// - All Guru-Shishya relationships
// - All DailySadhanaReports
// - All WeeklySankalpas
// - All WeeklyReflections
// - All Guru Follow-ups and Private Notes
// Adds:
// - sessions map
// - resetTokens map
// - passwordHash for default dev accounts (e.g. radheshyam.das@iskconpune.org)
// ============================================================

async function migrate() {
  const dbPath = path.join(process.cwd(), ".nityasadhana-db.json");
  if (!fs.existsSync(dbPath)) {
    console.log("No .nityasadhana-db.json found, skipping migration.");
    return;
  }

  const raw = fs.readFileSync(dbPath, "utf8");
  const data = JSON.parse(raw);

  let modified = false;

  if (!data.sessions) {
    data.sessions = {};
    modified = true;
  }

  if (!data.resetTokens) {
    data.resetTokens = {};
    modified = true;
  }

  // Generate a standard secure development password hash: "HareKrishna@108"
  const devPassword = "HareKrishna@108";
  const devPasswordHash = await bcrypt.hash(devPassword, 12);

  // Set password hash for existing users that don't have one
  let migratedUsersCount = 0;
  if (data.users) {
    for (const [userId, user] of Object.entries(data.users as Record<string, any>)) {
      if (!user.passwordHash) {
        user.passwordHash = devPasswordHash;
        migratedUsersCount++;
        modified = true;
      }
    }
  }

  if (modified) {
    // Write backup before saving
    const backupPath = path.join(process.cwd(), `.nityasadhana-db.backup.${Date.now()}.json`);
    fs.writeFileSync(backupPath, raw, "utf8");
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf8");
    console.log(`✓ Migration complete.`);
    console.log(`✓ Preserved backup at: ${backupPath}`);
    console.log(`✓ Migrated ${migratedUsersCount} user accounts with initial dev password: "${devPassword}".`);
    console.log(`✓ Initialized sessions and resetTokens stores.`);
  } else {
    console.log(`Database already up to date. No changes needed.`);
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
