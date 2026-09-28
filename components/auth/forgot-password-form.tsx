"use client";

import * as React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { requestPasswordResetAction } from "@/lib/actions/auth";
import { normalizeEmail, isValidEmail } from "@/lib/validations";

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

    setIsLoading(true);

    try {
      await requestPasswordResetAction(normalizedEmail);
      setIsSubmitted(true);
    } catch {
      // Show calm generic confirmation even if error occurs, preventing user enumeration
      setIsSubmitted(true);
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
          <span>{errorMessage}</span>
        </div>
      )}

      {isSubmitted ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#328A7A]/10 text-[#328A7A]">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-[18px] font-bold text-[#193B3B]">Reset Link Dispatched</h2>
          <p className="text-[14px] leading-relaxed text-[#547070]">
            If an account exists for <span className="font-semibold text-[#193B3B]">{email}</span>,
            instructions to choose a new password have been sent.
          </p>
          <p className="text-[12px] text-[#547070]">
            Please check your inbox (and spam folder). The link will expire in 1 hour.
          </p>
          <div className="pt-2">
            <Link href="/login">
              <Button variant="secondary" size="default" className="w-full">
                Return to Sign In
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
            <p className="mt-1.5 text-[12px] text-[#547070]">
              Enter your registered email address and we&apos;ll send you a password reset link.
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="mt-2 w-full"
            isLoading={isLoading}
            rightIcon={!isLoading ? <ArrowRight className="h-4 w-4" /> : undefined}
          >
            Send Password Reset Link
          </Button>

          <div className="mt-6 border-t border-[rgba(63,148,149,0.12)] pt-5 text-center text-[13px] text-[#547070]">
            Remembered your password?{" "}
            <Link href="/login" className="font-semibold text-[#3F9495] hover:underline">
              Return to Sign In
            </Link>
          </div>
        </form>
      )}
    </Card>
  );
}
