import * as React from "react";
import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/auth";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Logo } from "@/components/branding/logo";
import { AcceptInviteCard } from "@/components/invitations/accept-invite-card";

export const dynamic = "force-dynamic";

export default async function InviteTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const decodedToken = decodeURIComponent(token);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const validationResponse = await fetch(`${apiUrl}/api/invitations/validate/${encodeURIComponent(decodedToken)}`, { cache: "no-store" });
  const validation = await validationResponse.json() as { id?: number; guru_name?: string; expires_at?: string; is_valid: boolean; error_reason?: string };
  const details = { id: String(validation.id || ""), guruName: validation.guru_name || "", expiresAt: validation.expires_at || "", isValid: validation.is_valid, errorReason: validation.error_reason };
  const authUser = await getCurrentAuthUser();

  if (details.isValid && !authUser) {
    redirect(`/signup?invitation_token=${encodeURIComponent(decodedToken)}`);
  }

  if (details.isValid && authUser && authUser.role !== "shishya") {
    redirect(`/signup?invitation_token=${encodeURIComponent(decodedToken)}`);
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#EAF7F4]">
      <Section spacing="default" className="flex flex-1 items-center py-10 sm:py-16">
        <Container size="form">
          <div className="mb-6 flex flex-col items-center text-center">
            <Logo size="lg" variant="vertical" className="mb-4" />
          </div>

          <AcceptInviteCard
            token={decodedToken}
            details={details}
            isAuthenticated={Boolean(authUser)}
          />
        </Container>
      </Section>
    </div>
  );
}
