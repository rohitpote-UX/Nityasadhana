"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import { resetPasswordAction } from "@/lib/actions/auth";
import { validatePassword } from "@/lib/validations";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = validatePassword(password);
    if (!validation.isValid) {
      setErrorMessage(validation.message || "Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPasswordAction({
        token,
        password,
        confirmPassword,
      });

      if (result.success && result.redirectUrl) {
        router.replace(result.redirectUrl);
      } else {
        setErrorMessage(
          result.error || "Unable to reset password. The link may have expired or been used already."
        );
      }
    } catch {
      setErrorMessage("A network connection error occurred. Please try again.");
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
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#B33927]/20 bg-[#B33927]/10 p-3.5 text-[13px] text-[#B33927]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <span>{errorMessage}</span>
            {errorMessage.includes("expired") && (
              <div className="mt-1.5">
                <Link
                  href="/forgot-password"
                  className="font-semibold underline hover:text-[#8E2819]"
                >
                  Request a new password reset link →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="password" required sanskritHint="नवीनकूटशब्दः">
            New Password
          </Label>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a new strong password"
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

        <div>
          <Label htmlFor="confirmPassword" required sanskritHint="पुनः नवीनकूटशब्दः">
            Confirm New Password
          </Label>
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#547070] transition-colors hover:bg-[#F7F5EF] hover:text-[#193B3B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3F9495]"
                tabIndex={0}
              >
                {showConfirmPassword ? (
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
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="mt-2 w-full"
          isLoading={isLoading}
          rightIcon={!isLoading ? <ArrowRight className="h-4 w-4" /> : undefined}
        >
          Update Password & Sign In
        </Button>
      </form>

      <div className="mt-6 border-t border-[rgba(63,148,149,0.12)] pt-5 text-center text-[13px] text-[#547070]">
        Remembered your password?{" "}
        <Link href="/login" className="font-semibold text-[#3F9495] hover:underline">
          Return to Sign In
        </Link>
      </div>
    </Card>
  );
}
