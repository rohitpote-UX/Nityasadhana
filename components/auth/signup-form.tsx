"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useClerk, useSignUp, useUser } from "@clerk/nextjs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Lock, KeyRound, ArrowRight, AlertCircle, CheckCircle2, Sparkles, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { resolvePostLoginRedirectAction, syncAuthenticatedRoleAction } from "@/lib/actions/auth";
import { acceptInvitationAction } from "@/lib/actions/invitations";
import { normalizeEmail, isValidEmail, validatePassword, formatAuthErrorMessage } from "@/lib/validations";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get("invitation_token");
  const roleParam = searchParams.get("role"); // "guru" | "student" | "shishya"

  const { isLoaded, signUp, setActive } = useSignUp();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const currentSessionRole = React.useMemo(() => {
    const roleFromMetadata = (user?.publicMetadata?.role as string | undefined) || undefined;
    const roleFromIntent = (user?.unsafeMetadata?.roleIntent as string | undefined) || undefined;
    const value = roleFromMetadata || roleFromIntent || null;
    return value && value.toLowerCase() === "shishya" ? "shishya" : value || null;
  }, [user]);

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [code, setCode] = React.useState("");

  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!authLoaded || !isSignedIn || !invitationToken) {
      return;
    }

    if (currentSessionRole === "shishya") {
      return;
    }

    const redirectUrl = `/signup?invitation_token=${encodeURIComponent(invitationToken)}`;
    void signOut({ redirectUrl });
  }, [authLoaded, isSignedIn, invitationToken, currentSessionRole, signOut]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isSignedIn && currentSessionRole !== "shishya") {
      setErrorMessage(
        "A different active session was detected. We are signing you out so you can continue with this invitation."
      );
      void signOut({ redirectUrl: `/signup?invitation_token=${encodeURIComponent(invitationToken || "")}` });
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

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
      setErrorMessage(passwordValidation.message || "Please choose a password with at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords don't match.");
      return;
    }

    if (!isLoaded) return;

    setIsLoading(true);

    try {
      const roleIntent = roleParam === "guru" ? "guru" : "shishya";
      await signUp.create({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        emailAddress: normalizedEmail,
        password,
        unsafeMetadata: {
          roleIntent,
          invitationToken: invitationToken || undefined,
        },
      });

      // Trigger email verification code from Clerk
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: unknown) {
      console.error("[Auth] Signup error:", err);
      setErrorMessage(formatAuthErrorMessage(err, "signup"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setErrorMessage("Please enter the verification code sent to your email.");
      return;
    }

    if (!isLoaded) return;

    setIsLoading(true);

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: trimmedCode,
      });

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        const selectedRole = roleParam === "guru" ? "guru" : "shishya";
        await syncAuthenticatedRoleAction(invitationToken ? "shishya" : selectedRole);

        if (invitationToken) {
          const acceptance = await acceptInvitationAction(invitationToken);
          if (acceptance.success) {
            router.replace("/student");
          } else {
            setErrorMessage(
              acceptance.error ||
                "Your account was created, but the Guru connection could not be completed. Please retry from the invitation link."
            );
            router.replace(`/invite/${encodeURIComponent(invitationToken)}`);
          }
        } else {
          const res = await resolvePostLoginRedirectAction(undefined, selectedRole);
          router.replace(res.redirectUrl);
        }
      } else {
        console.log("[Auth] Additional step needed:", completeSignUp.status);
        if (invitationToken) {
          router.replace(`/invite/${encodeURIComponent(invitationToken)}`);
        } else {
          const res = await resolvePostLoginRedirectAction(undefined, roleParam === "guru" ? "guru" : "shishya");
          router.replace(res.redirectUrl);
        }
      }
    } catch (err: unknown) {
      console.error("[Auth] Verification error:", err);
      setErrorMessage(formatAuthErrorMessage(err, "signup"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-[rgba(63,148,149,0.16)] bg-white p-6 shadow-level2 sm:p-8">
      {/* Role Intent Banner */}
      {roleParam && (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-[rgba(63,148,149,0.14)] bg-[#F7F5EF] p-3">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#193B3B]">
            <Sparkles className="h-4 w-4 text-[#A9824D]" />
            <span>Signing up as {roleParam === "guru" ? "Guru" : "Shishya"}</span>
          </div>
          <Badge variant={roleParam === "guru" ? "saffron" : "krishna"} size="sm">
            <span className="font-serif">{roleParam === "guru" ? "गुरुमार्गः" : "शिष्यमार्गः"}</span>
          </Badge>
        </div>
      )}

      {/* Error Feedback */}
      {errorMessage && (
        <div
          role="alert"
          className="bg-[#B33927]/8 mb-5 flex items-start gap-2.5 rounded-xl border border-[#B33927]/20 p-3.5 text-[13px] text-[#B33927]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <span>{errorMessage}</span>
            {errorMessage.toLowerCase().includes("already registered") && (
              <div className="mt-1.5">
                <Link
                  href={invitationToken ? `/login?redirect_url=/invite/${encodeURIComponent(invitationToken)}` : "/login"}
                  className="font-semibold underline hover:text-[#8E2819]"
                >
                  Sign in to your account →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {!pendingVerification ? (
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
            Create Sādhanā Account
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="mb-4 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#328A7A]/10 text-[#328A7A]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-[17px] font-bold text-[#193B3B]">Verify your email</h3>
            <p className="mt-1 text-[13px] text-[#547070]">
              We have sent a verification code to{" "}
              <span className="font-semibold text-[#193B3B]">{email}</span>.
            </p>
          </div>

          <div>
            <Label htmlFor="code" required sanskritHint="सत्यापनसङ्केतः">
              Verification Code
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

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isLoading}
            rightIcon={!isLoading ? <ArrowRight className="h-4 w-4" /> : undefined}
          >
            Verify & Activate Account
          </Button>
        </form>
      )}

      {/* Footer link to sign in */}
      <div className="mt-6 border-t border-[rgba(63,148,149,0.12)] pt-5 text-center text-[13px] text-[#547070]">
        {isSignedIn ? (
          <button
            type="button"
            onClick={() => signOut({ redirectUrl: invitationToken ? `/login?redirect_url=/invite/${encodeURIComponent(invitationToken)}` : "/login" })}
            className="font-semibold text-[#3F9495] hover:underline"
          >
            Sign out and continue
          </button>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#3F9495] hover:underline">
              Sign In
            </Link>
          </>
        )}
      </div>
    </Card>
  );
}
