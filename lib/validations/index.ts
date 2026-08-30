/**
 * Validation schema stubs for future authentication and Sadhana forms.
 * Kept minimal for foundation initialization.
 */

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function validatePhone(phone: string): boolean {
  // E.164 or Indian standard 10-digit mobile number format
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length === 10 || (cleaned.length === 12 && cleaned.startsWith("91"));
}

export function validateOtp(otp: string): boolean {
  return /^\d{6}$/.test(otp.trim());
}

export * from "./auth";
