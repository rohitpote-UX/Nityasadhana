"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, KeyRound, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { normalizeEmail, isValidEmail, validatePassword, formatAuthErrorMessage } from "@/lib/validations";

export function ForgotPasswordForm() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [code, setCode] = React.useState("");

  const [isCodeSent, setIsCodeSent] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      setErrorMessage("Please enter your registered email address.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (!isLoaded) return;

    setIsLoading(true);

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: normalizedEmail,
      });

      setIsCodeSent(true);
      setSuccessMessage(
        "If an account exists with this email, a password reset code has been sent."
      );
    } catch (err: unknown) {
      console.error("[Auth] Password reset error:", err);
      // To prevent account enumeration, show generic guidance
      setIsCodeSent(true);
      setSuccessMessage(
        "If an account exists with this email, a password reset code has been sent."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setErrorMessage("Please enter the reset code sent to your email.");
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setErrorMessage(passwordValidation.message || "Please choose a password with at least 8 characters.");
      return;
    }

    if (!isLoaded) return;

    setIsLoading(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: trimmedCode,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/student");
      } else {
        router.replace("/login?message=password_reset_success");
      }
    } catch (err: unknown) {
      console.error("[Auth] Reset confirmation error:", err);
      setErrorMessage(formatAuthErrorMessage(err, "reset"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-[rgba(63,148,149,0.16)] bg-white p-6 shadow-level2 sm:p-8">
      {/* Error Feedback */}
      {errorMessage && (
        <div
          role="alert"
          className="bg-[#B33927]/8 mb-5 flex items-start gap-2.5 rounded-xl border border-[#B33927]/20 p-3.5 text-[13px] text-[#B33927]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success Feedback */}
      {successMessage && (
        <div
          role="status"
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#328A7A]/20 bg-[#328A7A]/10 p-3.5 text-[13px] text-[#328A7A]"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {!isCodeSent ? (
        <form onSubmit={handleSendCode} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="email" required sanskritHint="विद्युत्पत्रम्">
              Registered Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="devotee@iskconpune.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="h-4 w-4" />}
              autoComplete="email"
              required
              disabled={isLoading}
            />
          </div>

          {/* Clerk Smart CAPTCHA Container */}
          <div id="clerk-captcha" className="my-1 empty:hidden" />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="mt-2 w-full"
            isLoading={isLoading}
            rightIcon={!isLoading ? <ArrowRight className="h-4 w-4" /> : undefined}
          >
            Send Password Reset Code
          </Button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="code" required sanskritHint="सत्यापनसङ्केतः">
              Reset Code
            </Label>
            <Input
              id="code"
              placeholder="e.g. 123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              leftIcon={<KeyRound className="h-4 w-4" />}
              className="text-center font-mono text-[18px] tracking-widest"
              autoComplete="one-time-code"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="password" required sanskritHint="नवीनकूटशब्दः">
              New Password
            </Label>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter new strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[#547070] transition-colors hover:bg-[#F7F5EF] hover:text-[#193B3B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3F9495]"
                  tabIndex={0}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
                  )}
                </button>
              }
              autoComplete="new-password"
              required
              disabled={isLoading}
            />
            <p className="mt-1 text-[12px] text-[#547070]">Must be at least 8 characters long.</p>
          </div>

          {/* Clerk Smart CAPTCHA Container */}
          <div id="clerk-captcha" className="my-1 empty:hidden" />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="mt-2 w-full"
            isLoading={isLoading}
            rightIcon={!isLoading ? <ArrowRight className="h-4 w-4" /> : undefined}
          >
            Set New Password & Sign In
          </Button>
        </form>
      )}

      {/* Footer Return Link */}
      <div className="mt-6 border-t border-[rgba(63,148,149,0.12)] pt-5 text-center text-[13px] text-[#547070]">
        Remembered your password?{" "}
        <Link href="/login" className="font-semibold text-[#3F9495] hover:underline">
          Return to Sign In
        </Link>
      </div>
    </Card>
  );
}
