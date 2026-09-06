import * as React from "react";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Logo } from "@/components/branding/logo";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

interface ResetPasswordPageProps {
  searchParams: Promise<{
    token?: string;
  }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#EAF7F4]">
      <Section spacing="default" className="flex flex-1 items-center py-10 sm:py-16">
        <Container size="form">
          <div className="mb-6 flex flex-col items-center text-center">
            <Logo size="lg" variant="vertical" className="mb-4" />
            <h1 className="text-[24px] font-bold tracking-tight text-[#193B3B] sm:text-[28px]">
              Set New Password
            </h1>
            <p className="mt-1 text-[14px] text-[#547070]">
              Choose a strong, secure password for your Nityasādhanā account.
            </p>
          </div>

          {!token ? (
            <Card className="border-[rgba(63,148,149,0.16)] bg-white p-6 text-center shadow-level2 sm:p-8">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#B33927]/10 text-[#B33927]">
                <AlertCircle className="h-7 w-7" />
              </div>
              <h2 className="text-[18px] font-bold text-[#193B3B]">Missing Reset Token</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-[#547070]">
                No password reset token was provided. Please use the link sent to your email or request a new one.
              </p>
              <div className="mt-6">
                <Link href="/forgot-password">
                  <Button variant="primary" size="default" className="w-full">
                    Request Password Reset Link
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <React.Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-white/60" />}>
              <ResetPasswordForm token={token} />
            </React.Suspense>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="text-[13px] text-[#547070] hover:underline">
              ← Return to Sign In
            </Link>
          </div>
        </Container>
      </Section>
    </div>
  );
}
