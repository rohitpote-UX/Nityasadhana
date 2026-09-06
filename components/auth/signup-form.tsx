"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Mail,
  Lock,
  KeyRound,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { signupAction } from "@/lib/actions/auth";
import { normalizeEmail, isValidEmail, validatePassword } from "@/lib/validations";

export function SignupForm() {
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get("invitation_token");
  const roleParam = searchParams.get("role"); // "guru" | "student" | "shishya"

  const isGuru = roleParam === "guru";

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [invitationCode, setInvitationCode] = React.useState(invitationToken || "");

  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const normalizedEmail = normalizeEmail(email);
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const fullName = `${trimmedFirstName} ${trimmedLastName}`.trim();

    if (!trimmedFirstName) {
      setErrorMessage("Please enter your first name.");
      return;
    }

    if (!normalizedEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setErrorMessage(
        passwordValidation.message || "Please choose a password with at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords don't match.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signupAction({
        name: fullName,
        email: normalizedEmail,
        password,
        confirmPassword,
        role: isGuru ? "guru" : "shishya",
        invitationSecret: isGuru ? undefined : invitationToken || invitationCode.trim() || undefined,
      });

      if (result.success && result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else {
        setErrorMessage(result.error || "Unable to create account. Please check your details.");
      }
    } catch {
      setErrorMessage("A network connection error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-[rgba(63,148,149,0.16)] bg-white p-6 shadow-level2 sm:p-8">
      {/* Role Intent Banner */}
      <div className="mb-5 flex items-center justify-between rounded-xl border border-[rgba(63,148,149,0.14)] bg-[#F7F5EF] p-3">
        <div className="flex items-center gap-2 text-[13px] font-medium text-[#193B3B]">
          <Sparkles className="h-4 w-4 text-[#A9824D]" />
          <span>Signing up as {isGuru ? "Guru" : "Shishya"}</span>
        </div>
        <Badge variant={isGuru ? "saffron" : "krishna"} size="sm">
          <span className="font-serif">{isGuru ? "गुरुमार्गः" : "शिष्यमार्गः"}</span>
        </Badge>
      </div>

      {/* Error Feedback */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#B33927]/20 bg-[#B33927]/10 p-3.5 text-[13px] text-[#B33927]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <span>{errorMessage}</span>
            {errorMessage.toLowerCase().includes("already registered") && (
              <div className="mt-1.5">
                <Link
                  href={
                    invitationToken
                      ? `/login?redirect_url=/invite/${encodeURIComponent(invitationToken)}`
                      : "/login"
                  }
                  className="font-semibold underline hover:text-[#8E2819]"
                >
                  Sign in to your account →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="firstName" required sanskritHint="नाम">
              First Name
            </Label>
            <Input
              id="firstName"
              placeholder="e.g. Radhanath"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              leftIcon={<User className="h-4 w-4" />}
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="lastName" sanskritHint="उपनाम">
              Last Name
            </Label>
            <Input
              id="lastName"
              placeholder="e.g. Das"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

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

        {/* Invitation Code (Shishya flow only) */}
        {!isGuru && (
          <div>
            <Label htmlFor="invitationCode" sanskritHint="निमन्त्रणसङ्केतः">
              Invitation / Credential Code (Optional)
            </Label>
            <Input
              id="invitationCode"
              placeholder="e.g. NITYA-7K4P-X9QM"
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value)}
              leftIcon={<KeyRound className="h-4 w-4" />}
              disabled={Boolean(invitationToken) || isLoading}
            />
            {invitationToken ? (
              <p className="mt-1 text-[12px] font-medium text-[#328A7A]">
                ✓ Linked automatically from your invitation link
              </p>
            ) : (
              <p className="mt-1 text-[12px] text-[#547070]">
                If your Guru gave you an invite code, enter it here to connect automatically.
              </p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="password" required sanskritHint="कूटशब्दः">
            Password
          </Label>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
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
          <Label htmlFor="confirmPassword" required sanskritHint="पुनः कूटशब्दः">
            Confirm Password
          </Label>
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Re-enter your password"
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
          {isGuru ? "Create Guru Account" : "Create Shishya Account"}
        </Button>
      </form>

      {/* Footer link to sign in */}
      <div className="mt-6 border-t border-[rgba(63,148,149,0.12)] pt-5 text-center text-[13px] text-[#547070]">
        Already have an account?{" "}
        <Link
          href={isGuru ? "/login?role=guru" : "/login?role=student"}
          className="font-semibold text-[#3F9495] hover:underline"
        >
          Sign In
        </Link>
      </div>
    </Card>
  );
}
