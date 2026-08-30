/**
 * NITYASĀDHANĀ — AUTHENTICATION VALIDATION & ERROR HANDLING
 * 
 * Production-safe client & server validation helpers:
 * - Email normalization & format validation (Email = unique identity)
 * - 8-character minimum password requirement (no arbitrary complexity)
 * - Devotee-friendly error message translation (no technical jargon / codes)
 */

export interface PasswordValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Normalizes email address by trimming whitespace and converting to lowercase.
 * Prevents accidental spaces while preserving legitimate email structure.
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

/**
 * Validates basic email format without overly restrictive rules.
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  // Standard permissive email format regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(normalized);
}

/**
 * Validates password meets the minimum requirement of 8 characters.
 * Does NOT enforce unnecessary complexity rules unless required by provider.
 */
export function validatePassword(password: string): PasswordValidationResult {
  if (!password) {
    return {
      isValid: false,
      message: "Please enter a password.",
    };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      message: "Please choose a password with at least 8 characters.",
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Clerk error structure interface for safe type extraction.
 */
interface ClerkErrorDetail {
  code?: string;
  message?: string;
  longMessage?: string;
  paramName?: string;
  meta?: Record<string, unknown>;
}

interface ClerkErrorLike {
  errors?: ClerkErrorDetail[];
  message?: string;
  status?: number;
  statusCode?: number;
}

/**
 * Maps external/Clerk authentication errors into calm, human-friendly messages
 * designed for Gurus, Shishyas, and devotees.
 * 
 * Never exposes raw error codes (409, 500), stack traces, or internal database errors.
 */
export function formatAuthErrorMessage(
  err: unknown,
  context: "login" | "signup" | "reset" = "login"
): string {
  if (!err) return "Something went wrong. Please try again.";

  // If already a simple user-facing string
  if (typeof err === "string") {
    return err;
  }

  const clerkErr = err as ClerkErrorLike;
  const firstError = clerkErr.errors?.[0];
  const code = firstError?.code?.toLowerCase() || "";
  const rawMessage = (firstError?.message || clerkErr.message || "").toLowerCase();

  // 1. Active Session Conflict
  if (
    code === "session_exists" ||
    code === "session_already_exists" ||
    rawMessage.includes("session already exists") ||
    rawMessage.includes("active session") ||
    rawMessage.includes("session_exists")
  ) {
    return "A session is already active. Please sign out before continuing.";
  }

  // 2. Duplicate / Existing Account (Email is unique identity)
  if (
    code === "form_identifier_exists" ||
    rawMessage.includes("identifier_exists") ||
    rawMessage.includes("email already exists") ||
    rawMessage.includes("user already exists") ||
    rawMessage.includes("account already exists") ||
    rawMessage.includes("already registered") ||
    rawMessage.includes("already in use") ||
    rawMessage.includes("is taken") ||
    rawMessage.includes("email address is taken")
  ) {
    return "This email is already registered. Try signing in instead.";
  }

  // 3. Invalid Credentials (Identifier not found or password incorrect)
  if (
    code === "form_identifier_not_found" ||
    code === "form_password_incorrect" ||
    code === "strategy_for_user_invalid" ||
    rawMessage.includes("identifier not found") ||
    rawMessage.includes("password incorrect") ||
    rawMessage.includes("invalid password") ||
    rawMessage.includes("incorrect email or password")
  ) {
    return "Incorrect email or password. Please check and try again.";
  }

  // 4. Password Length or Complexity
  if (
    code === "form_password_length_too_short" ||
    code === "form_password_size_in_bytes" ||
    code === "form_password_validation_failed" ||
    rawMessage.includes("at least 8 characters") ||
    rawMessage.includes("password length") ||
    rawMessage.includes("too short")
  ) {
    return "Please choose a password with at least 8 characters.";
  }

  // 5. Compromised / Pwned Password (from Clerk security checks)
  if (
    code === "form_password_pwned" ||
    rawMessage.includes("pwned") ||
    rawMessage.includes("breach")
  ) {
    return "This password has appeared in a data breach. Please choose a more secure password with at least 8 characters.";
  }

  // 6. Invalid Email Format
  if (
    code === "form_param_format_invalid" ||
    rawMessage.includes("invalid email") ||
    rawMessage.includes("email address is invalid")
  ) {
    return "Please enter a valid email address.";
  }

  // 7. Verification Code / OTP Errors
  if (
    code === "form_code_incorrect" ||
    code === "verification_failed" ||
    code === "verification_expired" ||
    rawMessage.includes("incorrect code") ||
    rawMessage.includes("invalid code") ||
    rawMessage.includes("code expired")
  ) {
    return "Invalid or expired verification code. Please check your email and try again.";
  }

  // 8. Rate Limiting
  if (
    code === "too_many_requests" ||
    clerkErr.status === 429 ||
    rawMessage.includes("too many requests") ||
    rawMessage.includes("rate limit")
  ) {
    return "Too many attempts. Please wait a few moments and try again.";
  }

  // 9. Network / Connection Errors
  if (
    rawMessage.includes("network") ||
    rawMessage.includes("failed to fetch") ||
    rawMessage.includes("timeout") ||
    rawMessage.includes("connection")
  ) {
    return "We couldn't connect right now. Please check your internet connection and try again.";
  }

  // 10. Bot Protection / CAPTCHA Errors
  if (
    code.includes("captcha") ||
    rawMessage.includes("captcha") ||
    rawMessage.includes("bot protection") ||
    rawMessage.includes("challenge")
  ) {
    return "Security verification failed to load. Please disable ad-blockers or refresh the page to try again.";
  }

  // Context-specific fallback
  if (context === "signup") {
    return "Unable to create account. Please check your details and try again.";
  }
  if (context === "reset") {
    return "Unable to reset password. Please verify the code and try again.";
  }

  return "Unable to sign in. Please verify your connection or try again.";
}
