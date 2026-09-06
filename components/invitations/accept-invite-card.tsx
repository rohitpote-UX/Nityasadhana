"use client";

import * as React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicInvitationDetails } from "@/lib/db/schema";
import { acceptInvitationAction } from "@/lib/actions/invitations";
import {
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Calendar,
  LogIn,
  UserPlus,
} from "lucide-react";

export function AcceptInviteCard({
  token,
  details,
  isAuthenticated = false,
}: {
  token: string;
  details: PublicInvitationDetails;
  isAuthenticated?: boolean;
}) {

  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(
    details.isValid ? null : details.errorReason || "Invalid invitation."
  );
  const [connectedGuruName, setConnectedGuruName] = React.useState<string | null>(null);

  const handleAccept = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await acceptInvitationAction(token);
      if (res.success && res.guruName) {
        setConnectedGuruName(res.guruName);
      } else {
        setErrorMessage(res.error || "Failed to accept invitation.");
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // State 1: Invalid / Expired / Revoked
  if (!details.isValid) {
    return (
      <Card className="space-y-4 border-[rgba(63,148,149,0.16)] bg-white p-6 text-center shadow-level2 sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#B33927]/10 text-[#B33927]">
          <AlertCircle className="h-7 w-7 stroke-[1.75]" />
        </div>
        <div className="space-y-1">
          <h2 className="text-[20px] font-bold text-[#193B3B]">Invitation Unavailable</h2>
          <p className="text-[14px] leading-relaxed text-[#547070]">
            {errorMessage || "This invitation link is invalid or has expired."}
          </p>
        </div>
        <div className="flex flex-col justify-center gap-2 pt-2 sm:flex-row">
          <Link href="/invite">
            <Button variant="secondary" size="default">
              Enter Another Code
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="default">
              Return to Home
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  // State 2: Acceptance Success
  if (connectedGuruName) {
    return (
      <Card className="animate-in fade-in zoom-in-95 space-y-5 border-[rgba(63,148,149,0.16)] bg-white p-6 text-center shadow-level2 sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#328A7A]/10 text-[#328A7A]">
          <CheckCircle2 className="h-9 w-9 stroke-[1.75]" />
        </div>

        <div className="space-y-1.5">
          <span className="font-serif text-[14px] font-medium text-[#A9824D]">
            गुरुशिष्यसम्बन्धः • शुभारम्भः
          </span>
          <h2 className="text-[22px] font-bold text-[#193B3B]">Your Journey Begins</h2>
          <p className="text-[14px] text-[#547070]">You are now connected under the guidance of</p>
          <div className="inline-block rounded-xl border border-[rgba(63,148,149,0.14)] bg-[#F7F5EF] px-4 py-2 text-[15px] font-bold text-[#193B3B]">
            {connectedGuruName}
          </div>
        </div>

        <p className="mx-auto max-w-sm text-[13px] text-[#547070]">
          Your Shishya profile has been activated. You can now record your daily Sadhana and seva.
        </p>

        <div className="pt-2">
          <Link href="/student">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Continue to Nityasādhanā
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  // State 3: Valid Invitation Prompt
  return (
    <Card className="space-y-5 border-[rgba(63,148,149,0.16)] bg-white p-6 shadow-level2 sm:p-8">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF7F4] text-[#3F9495]">
          <Sparkles className="h-7 w-7 text-[#A9824D]" />
        </div>
        <Badge variant="saffron" size="sm">
          <span className="font-serif text-[11px]">निमन्त्रणम्</span>
        </Badge>
        <h2 className="text-[22px] font-bold tracking-tight text-[#193B3B]">
          Nityasādhanā Invitation
        </h2>
        <p className="text-[14px] text-[#547070]">
          Your Guru has invited you to begin your daily Sādhanā journey.
        </p>
      </div>

      {/* Guru Summary Box */}
      <div className="space-y-2 rounded-2xl border border-[rgba(63,148,149,0.14)] bg-[#F7F5EF]/70 p-4 text-center">
        <span className="text-[12px] font-semibold uppercase tracking-wider text-[#547070]">
          Invited By
        </span>
        <div className="text-[16px] font-bold text-[#193B3B]">{details.guruName}</div>
        <div className="flex items-center justify-center gap-1.5 text-[12px] text-[#547070]">
          <Calendar className="h-3.5 w-3.5 text-[#A9824D]" />
          <span>
            Valid until{" "}
            {new Date(details.expiresAt).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div
          role="alert"
          className="bg-[#B33927]/8 flex items-start gap-2.5 rounded-xl border border-[#B33927]/20 p-3.5 text-[13px] text-[#B33927]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3 pt-1">
        {isAuthenticated ? (
          <Button
            variant="primary"
            size="lg"
            onClick={handleAccept}
            isLoading={isLoading}
            className="w-full"
            rightIcon={!isLoading ? <ArrowRight className="h-4 w-4" /> : undefined}
          >
            Join this Guru
          </Button>
        ) : (
          <div className="space-y-2.5">
            <Link href={`/signup?invitation_token=${encodeURIComponent(token)}`}>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                leftIcon={<UserPlus className="h-4 w-4" />}
              >
                Create Shishya Account
              </Button>
            </Link>

            <Link href={`/login?redirect_url=/invite/${encodeURIComponent(token)}`}>
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                leftIcon={<LogIn className="h-4 w-4" />}
              >
                Sign In to Existing Account
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="pt-2 text-center">
        <Link href="/" className="text-[13px] text-[#547070] hover:underline">
          ← Return to Home
        </Link>
      </div>
    </Card>
  );
}
