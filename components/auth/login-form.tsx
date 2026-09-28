"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import { loginAction } from "@/lib/actions/auth";
import { normalizeEmail } from "@/lib/validations";
import { UserRole } from "@/types/auth";

export function LoginForm() {
  const searchParams = useSearchParams();
  const roleHint = searchParams.get("role"); // "guru" | "student"
  const redirectParam = searchParams.get("redirect_url");
  const errorParam = searchParams.get("error");
  const messageParam = searchParams.get("message");

  const roleHintValue: UserRole | null = React.useMemo(
    () => (roleHint === "guru" ? "guru" : roleHint === "student" ? "shishya" : null),
    [roleHint]
  );

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (errorParam === "unauthorized_role") {
      setErrorMessage("Your account role is not authorized for that section.");
    } else if (errorParam === "account_suspended") {
      setErrorMessage("Your account is currently inactive. Please contact your coordinator.");
    } else if (messageParam === "password_reset_success") {
      setSuccessMessage("Your password has been reset successfully. Please sign in.");
    }
  }, [errorParam, messageParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginAction({
        email: normalizedEmail,
        password,
        redirectUrl: redirectParam,
        preferredRole: roleHintValue,
      });

      if (result.success && result.redirectUrl) {
        // Full navigation ensures fresh cookie and layout synchronization
        window.location.href = result.redirectUrl;
      } else {
        setErrorMessage(result.error || "Incorrect email or password. Please check and try again.");
      }
    } catch {
      setErrorMessage("An unexpected connection issue occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-[rgba(63,148,149,0.16)] bg-white p-6 shadow-level2 sm:p-8">
      {/* Role Intent Banner */}
      {roleHint && (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-[rgba(63,148,149,0.14)] bg-[#F7F5EF] p-3">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#193B3B]">
            <Sparkles className="h-4 w-4 text-[#A9824D]" />
            <span>Signing in as {roleHint === "guru" ? "Guru" : "Shishya"}</span>
          </div>
          <Badge variant={roleHint === "guru" ? "saffron" : "krishna"} size="sm">
            <span className="font-serif">{roleHint === "guru" ? "गुरुमार्गः" : "शिष्यमार्गः"}</span>
          </Badge>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div
          role="status"
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#328A7A]/20 bg-[#328A7A]/10 p-3.5 text-[13px] text-[#328A7A]"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Feedback */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#B33927]/20 bg-[#B33927]/10 p-3.5 text-[13px] text-[#B33927]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <span>{errorMessage}</span>
            {errorMessage.includes("Forgot password") && (
              <div className="mt-1.5">
                <Link
                  href="/forgot-password"
                  className="font-semibold underline hover:text-[#8E2819]"
                >
                  Go to Forgot Password →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="email" required sanskritHint="विद्युत्पत्रम्">
            Email Address
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

        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label htmlFor="password" required sanskritHint="कूटशब्दः">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-[12px] font-medium text-[#3F9495] hover:underline"
              tabIndex={-1}
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••••••"
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
            autoComplete="current-password"
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
          Continue to Sādhanā
        </Button>
      </form>

      {/* Footer link to invitation or signup */}
      <div className="mt-6 space-y-2 border-t border-[rgba(63,148,149,0.12)] pt-5 text-center text-[13px] text-[#547070]">
        <div>
          Don&apos;t have an account yet?{" "}
          <Link
            href={roleHint === "guru" ? "/signup?role=guru" : "/signup?role=student"}
            className="font-semibold text-[#3F9495] hover:underline"
          >
            Register
          </Link>
        </div>
        <div>
          Received an invitation from your Guru?{" "}
          <Link href="/invite" className="font-semibold text-[#A9824D] hover:underline">
            Accept Invite
          </Link>
        </div>
      </div>
    </Card>
  );
}
