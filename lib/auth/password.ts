import bcrypt from "bcryptjs";

const BCRYPT_SALT_ROUNDS = 12;
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Validates password meets production security criteria:
 * - Minimum 8 characters
 * - Non-empty
 */
export function isPasswordValid(password: string): boolean {
  if (!password || typeof password !== "string") return false;
  return password.length >= MIN_PASSWORD_LENGTH;
}

/**
 * Hashes a plaintext password using bcrypt with 12 salt rounds.
 * Passwords are never logged or stored plaintext.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!isPasswordValid(password)) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 * Constant-time comparison to prevent timing attacks.
 */
export async function verifyPassword(password: string, hash?: string | null): Promise<boolean> {
  if (!password || !hash || typeof hash !== "string") {
    return false;
  }
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
