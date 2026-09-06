import * as React from "react";
import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/auth";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Logo } from "@/components/branding/logo";
import { AcceptInviteCard } from "@/components/invitations/accept-invite-card";
import { validateInvitationSecretAction } from "@/lib/actions/invitations";

export const dynamic = "force-dynamic";

export default async function InviteTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const decodedToken = decodeURIComponent(token);
  const details = await validateInvitationSecretAction(decodedToken);
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
