"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignIn, useAuth, useClerk, useUser } from "@clerk/nextjs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, Lock, ArrowRight, AlertCircle, Sparkles, Loader2, Eye, EyeOff } from "lucide-react";
import { resolvePostLoginRedirectAction, syncAuthenticatedRoleAction } from "@/lib/actions/auth";
import { normalizeEmail, formatAuthErrorMessage } from "@/lib/validations";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleHint = searchParams.get("role"); // "guru" | "student" (for UI hint / intent only)
  const redirectParam = searchParams.get("redirect_url");
  const errorParam = searchParams.get("error");

  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const roleHintValue = React.useMemo(
    () => (roleHint === "guru" ? "guru" : roleHint === "student" ? "shishya" : null),
    [roleHint]
  );
  const currentSessionRole = React.useMemo(() => {
    const roleFromMetadata = (user?.publicMetadata?.role as string | undefined) || undefined;
    const roleFromIntent = (user?.unsafeMetadata?.roleIntent as string | undefined) || undefined;
    const roleValue = roleFromMetadata || roleFromIntent || null;
    if (!roleValue) return null;
    return roleValue.toLowerCase() === "student" || roleValue.toLowerCase() === "shishya"
      ? "shishya"
      : roleValue.toLowerCase() === "guru"
        ? "guru"
        : null;
  }, [user]);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isResolvingRole, setIsResolvingRole] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Surface URL error parameters to devotee cleanly
  React.useEffect(() => {
    if (errorParam === "unauthorized_role") {
      setErrorMessage("Your account role could not be authorized for that section.");
    } else if (errorParam === "account_suspended") {
      setErrorMessage("Your account is currently inactive. Please contact your coordinator.");
    }
  }, [errorParam]);

  const hasRoleMismatch = Boolean(isSignedIn && roleHintValue && currentSessionRole && currentSessionRole !== roleHintValue);

  // If already signed in and no active error, resolve server-authoritative role and redirect.
  // Guard against repeated redirect attempts during a valid active session.
  React.useEffect(() => {
    if (!isSignedIn || errorParam || hasRoleMismatch) {
      return;
    }

    let isMounted = true;
    setIsResolvingRole(true);

    resolvePostLoginRedirectAction(redirectParam, roleHintValue)
      .then((res) => {
        if (isMounted && res.redirectUrl) {
          router.replace(res.redirectUrl);
        }
      })
      .finally(() => {
        if (isMounted) setIsResolvingRole(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isSignedIn, redirectParam, router, errorParam, roleHintValue, hasRoleMismatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    if (isSignedIn) {
      setIsResolvingRole(true);
      const res = await resolvePostLoginRedirectAction(redirectParam, roleHintValue);
      router.replace(res.redirectUrl);
      return;
    }

    if (!isLoaded) return;

    setIsLoading(true);

    try {
      const result = await signIn.create({
        identifier: normalizedEmail,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setIsResolvingRole(true);

        const [syncResult, redirectResult] = await Promise.all([
          syncAuthenticatedRoleAction(roleHintValue),
          resolvePostLoginRedirectAction(redirectParam, roleHintValue),
        ]);

        if (!syncResult.success) {
          console.warn("[Auth] syncAuthenticatedRoleAction returned unsuccessful result:", syncResult);
        }

        router.replace(redirectResult.redirectUrl);
      } else {
        console.log("[Auth] Additional step required:", result.status);
        const res = await resolvePostLoginRedirectAction(redirectParam, roleHintValue);
        router.replace(res.redirectUrl);
      }
    } catch (err: unknown) {
      console.error("[Auth] Login error:", err);
      setErrorMessage(formatAuthErrorMessage(err, "login"));
    } finally {
      setIsLoading(false);
    }
  };

  if (isResolvingRole) {
    return (
      <Card className="flex min-h-[300px] flex-col items-center justify-center border-[rgba(63,148,149,0.16)] bg-white p-6 text-center shadow-level2 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#A9824D]/10 text-[#A9824D]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <h3 className="mt-4 text-[16px] font-bold text-[#193B3B]">
          Entering Sādhanā Portal...
        </h3>
        <p className="mt-1 text-[13px] text-[#547070]">
          Verifying your account authorization.
        </p>
      </Card>
    );
  }

  if (hasRoleMismatch) {
    return (
      <Card className="border-[rgba(63,148,149,0.16)] bg-white p-6 text-center shadow-level2 sm:p-8">
        <div className="mb-5 flex items-center justify-center gap-3 rounded-xl border border-[#A9824D]/25 bg-[#F7F5EF] p-4 text-[#193B3B]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#A9824D]/10 text-[#A9824D]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="text-left">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-[#547070]">
              Active session
            </div>
            <div className="text-[15px] font-bold">Switch account to continue</div>
          </div>
        </div>

        <p className="mb-5 text-[14px] text-[#547070]">
          You are currently signed in as a {currentSessionRole === "guru" ? "Guru" : "Shishya"}.
          To continue as a {roleHintValue === "guru" ? "Guru" : "Shishya"}, sign out and sign back in.
        </p>

        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => signOut({ redirectUrl: `/login?role=${roleHintValue || "student"}` })}
        >
          Sign out and continue
        </Button>
      </Card>
    );
  }

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

        {/* Clerk Smart CAPTCHA Container */}
        <div id="clerk-captcha" />

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
