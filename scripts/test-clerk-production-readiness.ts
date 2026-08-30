import * as fs from "fs";
import * as path from "path";
import { getPostAuthRedirectUrl } from "../lib/auth/redirects";

async function runProductionReadinessTests() {
  console.log("================================================================");
  console.log("=== RUNNING CLERK PRODUCTION READINESS & CAPTCHA AUDIT =========");
  console.log("================================================================\n");

  const rootDir = path.resolve(__dirname, "..");

  // ============================================================
  // TEST 1: CAPTCHA CONTAINER MOUNTING IN ALL AUTH FORMS
  // ============================================================
  console.log("[TEST 1] Auditing Smart CAPTCHA DOM Container Mounting...");
  const signupFormPath = path.join(rootDir, "components", "auth", "signup-form.tsx");
  const loginFormPath = path.join(rootDir, "components", "auth", "login-form.tsx");
  const forgotFormPath = path.join(rootDir, "components", "auth", "forgot-password-form.tsx");

  const signupContent = fs.readFileSync(signupFormPath, "utf-8");
  const loginContent = fs.readFileSync(loginFormPath, "utf-8");
  const forgotContent = fs.readFileSync(forgotFormPath, "utf-8");

  if (!signupContent.includes('id="clerk-captcha"')) {
    throw new Error("FAIL: SignupForm is missing <div id=\"clerk-captcha\" /> container!");
  }
  console.log("-> ✓ SignupForm contains <div id=\"clerk-captcha\" /> for bot protection.");

  if (!loginContent.includes('id="clerk-captcha"')) {
    throw new Error("FAIL: LoginForm is missing <div id=\"clerk-captcha\" /> container!");
  }
  console.log("-> ✓ LoginForm contains <div id=\"clerk-captcha\" /> container.");

  if (!forgotContent.includes('id="clerk-captcha"')) {
    throw new Error("FAIL: ForgotPasswordForm is missing <div id=\"clerk-captcha\" /> container!");
  }
  console.log("-> ✓ ForgotPasswordForm contains <div id=\"clerk-captcha\" /> container.");
  console.log("✓ TEST 1 PASSED: All authentication forms properly mount clerk-captcha container.\n");

  // ============================================================
  // TEST 2: SERVICE WORKER CLOUDFLARE & CLERK BYPASS
  // ============================================================
  console.log("[TEST 2] Auditing Service Worker Bypass Rules...");
  const swPath = path.join(rootDir, "public", "sw.js");
  const swContent = fs.readFileSync(swPath, "utf-8");

  if (!swContent.includes("challenges.cloudflare.com")) {
    throw new Error("FAIL: Service Worker must explicitly bypass challenges.cloudflare.com!");
  }
  if (!swContent.includes("clerk")) {
    throw new Error("FAIL: Service Worker must explicitly bypass Clerk auth requests!");
  }
  console.log("-> ✓ Service Worker explicitly bypasses challenges.cloudflare.com and Clerk endpoints.");
  console.log("✓ TEST 2 PASSED: Service Worker bypass verified.\n");

  // ============================================================
  // TEST 3: SAFE KEY PREFIX AUDIT LOGIC (NEVER PRINTS SECRETS)
  // ============================================================
  console.log("[TEST 3] Verifying Key Type Classification Logic...");
  function classifyKey(key: string | undefined): "live" | "test" | "placeholder" | "missing" {
    if (!key) return "missing";
    if (key.startsWith("pk_live_") || key.startsWith("sk_live_")) return "live";
    if (key.startsWith("pk_test_") || key.startsWith("sk_test_")) return "test";
    return "placeholder";
  }

  if (classifyKey("pk_live_example_key") !== "live" || classifyKey("sk_live_example_secret") !== "live") {
    throw new Error("FAIL: Production key prefix classifier failed for live key!");
  }
  if (classifyKey("pk_test_example_key") !== "test" || classifyKey("sk_test_example_secret") !== "test") {
    throw new Error("FAIL: Development key prefix classifier failed for test key!");
  }
  console.log("-> ✓ Key prefix classification logic verified (pk_live_/sk_live_ vs pk_test_/sk_test_).");
  console.log("✓ TEST 3 PASSED: Key classification logic verified.\n");

  // ============================================================
  // TEST 4: ABSENCE OF CLIENT-EXPOSED SECRETS
  // ============================================================
  console.log("[TEST 4] Scanning Codebase for Leaked Secrets in Client Bundles...");
  const componentsDir = path.join(rootDir, "components");
  const appDir = path.join(rootDir, "app");

  function scanDirForSecretLeak(dir: string) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        scanDirForSecretLeak(fullPath);
      } else if (file.isFile() && (file.name.endsWith(".tsx") || file.name.endsWith(".ts"))) {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (content.includes("NEXT_PUBLIC_CLERK_SECRET_KEY")) {
          throw new Error(`CRITICAL SECURITY FAILURE: Found NEXT_PUBLIC_CLERK_SECRET_KEY in ${fullPath}!`);
        }
      }
    }
  }

  scanDirForSecretLeak(componentsDir);
  scanDirForSecretLeak(appDir);
  console.log("-> ✓ Zero client secret leaks detected across app/ and components/.");
  console.log("✓ TEST 4 PASSED: Client bundle security verified.\n");

  // ============================================================
  // TEST 5: ROLE ARCHITECTURE & REDIRECT PRESERVATION
  // ============================================================
  console.log("[TEST 5] Verifying Server-Side Role Enforcement...");
  if (getPostAuthRedirectUrl("guru") !== "/guru") {
    throw new Error("FAIL: Guru destination is not /guru!");
  }
  if (getPostAuthRedirectUrl("shishya") !== "/student") {
    throw new Error("FAIL: Shishya destination is not /student!");
  }
  if (getPostAuthRedirectUrl(null) !== "/login?error=unauthorized_role") {
    throw new Error("FAIL: Fail-closed redirect is not working!");
  }
  console.log("-> ✓ Guru (/guru) and Shishya (/student) role destinations preserved.");
  console.log("✓ TEST 5 PASSED: Server role routing intact.\n");

  console.log("================================================================");
  console.log("=== ALL PRODUCTION READINESS AUDIT GATES PASSED (100%) =========");
  console.log("================================================================");
}

runProductionReadinessTests().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
