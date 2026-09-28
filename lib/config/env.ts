/**
 * Environment configuration and validation.
 *
 * CRITICAL SECURITY PRINCIPLES:
 * 1. Public client variables MUST be prefixed with NEXT_PUBLIC_ and contain NO secrets.
 * 2. Server-only variables MUST NEVER use NEXT_PUBLIC_ and MUST NEVER be sent to the browser.
 * 3. AUTH_SECRET is strictly server-only.
 */

export interface PublicEnvConfig {
  readonly appUrl: string;
  readonly appName: string;
  readonly appEnv: "development" | "staging" | "production";
}

export interface ServerEnvConfig {
  readonly databaseUrl?: string;
  readonly authSecret?: string;
  readonly devGuruEmails?: string[];
}

export function getPublicEnv(): PublicEnvConfig {
  return {
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    appName: process.env.NEXT_PUBLIC_APP_NAME || "Nityasādhanā",
    appEnv: (process.env.NEXT_PUBLIC_APP_ENV as PublicEnvConfig["appEnv"]) || "development",
  };
}

export function getServerEnv(): ServerEnvConfig {
  if (typeof window !== "undefined") {
    throw new Error(
      "CRITICAL SECURITY VIOLATION: Attempted to access server environment variables from the client browser."
    );
  }

  const rawDevEmails = process.env.DEV_GURU_EMAILS || "";
  const devGuruEmails = rawDevEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return {
    databaseUrl: process.env.DATABASE_URL,
    authSecret: process.env.AUTH_SECRET,
    devGuruEmails,
  };
}
