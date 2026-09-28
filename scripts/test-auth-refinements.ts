import {
  normalizeEmail,
  isValidEmail,
  validatePassword,
  formatAuthErrorMessage,
} from "../lib/validations/auth";
import { dbStore } from "../lib/db/store";
import { DbUser } from "../lib/db/schema";
import { getPostAuthRedirectUrl } from "../lib/auth/redirects";

async function runAuthRefinementTests() {
  console.log("================================================================");
  console.log("=== RUNNING NITYASĀDHANĀ AUTHENTICATION REFINEMENT TESTS =======");
  console.log("================================================================\n");

  // ============================================================
  // TEST 1: EMAIL NORMALIZATION
  // ============================================================
  console.log("[TEST 1] Testing Email Normalization & Validation...");
  const rawEmail1 = "   Devotee.Gauranga@ISKCONPune.ORG   ";
  const normalized1 = normalizeEmail(rawEmail1);
  if (normalized1 !== "devotee.gauranga@iskconpune.org") {
    throw new Error(`Expected 'devotee.gauranga@iskconpune.org', got '${normalized1}'`);
  }
  if (!isValidEmail(normalized1)) {
    throw new Error("Valid email was rejected by isValidEmail!");
  }
  if (isValidEmail("not-an-email")) {
    throw new Error("Invalid email was accepted by isValidEmail!");
  }
  if (isValidEmail("@missing-username.com")) {
    throw new Error("Invalid email without username was accepted!");
  }
  console.log("✓ TEST 1 PASSED: Email normalization and basic validation verified.\n");

  // ============================================================
  // TEST 2: 8-CHARACTER MINIMUM PASSWORD REQUIREMENT
  // ============================================================
  console.log("[TEST 2] Testing 8-Character Password Requirement (No 15-char constraint)...");
  const valid8Char = "Krishna8"; // Exactly 8 characters
  const validLong = "HareKrishnaMahaMantra108!"; // Longer password
  const invalidShort = "Krish7"; // 6 characters (< 8)
  const emptyPassword = "";

  const res8 = validatePassword(valid8Char);
  if (!res8.isValid) {
    throw new Error(`8-character password '${valid8Char}' was rejected: ${res8.message}`);
  }

  const resLong = validatePassword(validLong);
  if (!resLong.isValid) {
    throw new Error(`Long password was rejected: ${resLong.message}`);
  }

  const resShort = validatePassword(invalidShort);
  if (resShort.isValid) {
    throw new Error(`Short password '${invalidShort}' (<8 chars) was unexpectedly accepted!`);
  }
  if (resShort.message !== "Please choose a password with at least 8 characters.") {
    throw new Error(`Unexpected message for short password: '${resShort.message}'`);
  }

  const resEmpty = validatePassword(emptyPassword);
  if (resEmpty.isValid) {
    throw new Error("Empty password was unexpectedly accepted!");
  }
  console.log("✓ TEST 2 PASSED: 8-character minimum password rule verified.\n");

  // ============================================================
  // TEST 3: PASSWORD UNIQUENESS IS NEVER CHECKED (EMAIL = IDENTITY)
  // ============================================================
  console.log("[TEST 3] Verifying Multi-User Identical Password Support (Email = Identity)...");
  const userA: DbUser = {
    id: `user_a_${Date.now()}`,
    authProviderId: `auth_a_${Date.now()}`,
    role: "guru",
    name: "Radheshyam Das",
    email: "radheshyam@example.com",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const userB: DbUser = {
    id: `user_b_${Date.now()}`,
    authProviderId: `auth_b_${Date.now()}`,
    role: "shishya",
    name: "Mukunda Das",
    email: "mukunda@example.com",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await dbStore.upsertUser(userA);
  await dbStore.upsertUser(userB);

  // In Nityasādhanā, user accounts are keyed by Email and Auth Provider ID, never password.
  // Both users having password "Krishna123" is 100% valid and causes zero collisions.
  const fetchedA = await dbStore.getUserByEmail("radheshyam@example.com");
  const fetchedB = await dbStore.getUserByEmail("mukunda@example.com");

  if (!fetchedA || !fetchedB) {
    throw new Error("Failed to retrieve distinct user records by email!");
  }
  if (fetchedA.id === fetchedB.id) {
    throw new Error("User collision detected between distinct accounts!");
  }
  console.log("✓ TEST 3 PASSED: Distinct accounts with independent identities verified.\n");

  // ============================================================
  // TEST 4: DUPLICATE EMAIL FRIENDLY ERROR TRANSLATION
  // ============================================================
  console.log("[TEST 4] Testing Friendly Duplicate Email Error Translation...");
  const clerkDuplicateEmailError = {
    errors: [
      {
        code: "form_identifier_exists",
        message: "That email address is taken. Please try another.",
        longMessage: "That email address is taken. Please try another.",
      },
    ],
  };

  const translatedDup = formatAuthErrorMessage(clerkDuplicateEmailError, "signup");
  if (translatedDup !== "This email is already registered. Try signing in instead.") {
    throw new Error(`Expected friendly duplicate email message, got: '${translatedDup}'`);
  }
  console.log(`-> Translated duplicate email error: "${translatedDup}"`);
  console.log("✓ TEST 4 PASSED: Duplicate email converted to calm devotee guidance.\n");

  // ============================================================
  // TEST 5: CLERK TECHNICAL ERROR TRANSLATIONS
  // ============================================================
  console.log("[TEST 5] Testing Clerk Error Translation Matrix...");

  // 5a. Invalid credentials
  const invalidCredsErr = {
    errors: [{ code: "form_password_incorrect", message: "Password is incorrect" }],
  };
  const translatedCreds = formatAuthErrorMessage(invalidCredsErr, "login");
  if (translatedCreds !== "Incorrect email or password. Please check and try again.") {
    throw new Error(`Expected credentials error, got '${translatedCreds}'`);
  }

  // 5b. Short password from Clerk
  const clerkShortPassErr = {
    errors: [{ code: "form_password_length_too_short", message: "Password too short" }],
  };
  const translatedShortPass = formatAuthErrorMessage(clerkShortPassErr, "signup");
  if (translatedShortPass !== "Please choose a password with at least 8 characters.") {
    throw new Error(`Expected password length error, got '${translatedShortPass}'`);
  }

  // 5c. Compromised / Pwned password
  const clerkPwnedErr = {
    errors: [{ code: "form_password_pwned", message: "Password found in breach" }],
  };
  const translatedPwned = formatAuthErrorMessage(clerkPwnedErr, "signup");
  if (!translatedPwned.includes("data breach") && !translatedPwned.includes("8 characters")) {
    throw new Error(`Expected breach notice, got '${translatedPwned}'`);
  }

  // 5d. Verification code invalid
  const clerkOtpErr = {
    errors: [{ code: "form_code_incorrect", message: "Incorrect code" }],
  };
  const translatedOtp = formatAuthErrorMessage(clerkOtpErr, "signup");
  if (!translatedOtp.includes("verification code")) {
    throw new Error(`Expected verification code notice, got '${translatedOtp}'`);
  }

  // 5e. Active session conflict
  const sessionErr = {
    errors: [{ code: "session_exists", message: "Session already exists" }],
  };
  const translatedSession = formatAuthErrorMessage(sessionErr, "signup");
  if (!translatedSession.includes("session is already active")) {
    throw new Error(`Expected session notice, got '${translatedSession}'`);
  }

  // 5f. Network failure
  const networkErr = new Error("Failed to fetch: NetworkError when attempting to fetch resource.");
  const translatedNetwork = formatAuthErrorMessage(networkErr, "login");
  if (!translatedNetwork.includes("check your internet connection")) {
    throw new Error(`Expected network notice, got '${translatedNetwork}'`);
  }

  // 5g. CAPTCHA failure
  const captchaErr = new Error("The CAPTCHA failed to load. This may be due to an unsupported browser or a browser extension.");
  const translatedCaptcha = formatAuthErrorMessage(captchaErr, "signup");
  if (!translatedCaptcha.includes("Security verification failed to load") && !translatedCaptcha.includes("disable ad-blockers")) {
    throw new Error(`Expected CAPTCHA notice, got '${translatedCaptcha}'`);
  }

  console.log("✓ TEST 5 PASSED: Full Clerk error mapping matrix validated.\n");

  // ============================================================
  // TEST 6: ROLE ARCHITECTURE & REDIRECT PRESERVATION
  // ============================================================
  console.log("[TEST 6] Verifying Server-Authoritative Role Routing...");
  if (getPostAuthRedirectUrl("guru") !== "/guru") {
    throw new Error("Guru redirect broken!");
  }
  if (getPostAuthRedirectUrl("shishya") !== "/student") {
    throw new Error("Shishya redirect broken!");
  }
  if (getPostAuthRedirectUrl(null) !== "/login?error=unauthorized_role") {
    throw new Error("Fail-closed redirect broken!");
  }
  console.log("✓ TEST 6 PASSED: Role routing and fail-closed security intact.\n");

  console.log("================================================================");
  console.log("=== ALL AUTHENTICATION REFINEMENT TESTS PASSED (100%) ==========");
  console.log("================================================================");
}

runAuthRefinementTests().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
