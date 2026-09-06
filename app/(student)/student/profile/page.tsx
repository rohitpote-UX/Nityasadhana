import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/layout/container";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireShishya, getActiveRelationshipForShishya } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";
import { formatPracticeDate } from "@/lib/utils/greeting";
import {
  HeartHandshake,
  ShieldCheck,
  LogOut,
  Sparkles,
  Calendar,
  Mail,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage() {
  // Server-authoritative role guard (enforces role === 'shishya')
  const user = await requireShishya();

  // Fetch connected Guru relationship
  const guruConnection = await getActiveRelationshipForShishya(user.id);
  const connectedGuru = guruConnection?.guru;

  const joinDate = user.createdAt
    ? formatPracticeDate(new Date(user.createdAt))
    : "Recently joined";

  return (
    <main className="py-6 sm:py-10">
      <Container size="reading">
        {/* Profile Page Header */}
        <div className="mb-6 space-y-1 sm:mb-8">
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#A9824D]">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="font-serif">साधकपरिचयः</span>
          </div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#193B3B] sm:text-[28px]">
            Profile
          </h1>
          <p className="text-[14px] text-[#547070]">
            Devotee identity and mentorship connection.
          </p>
        </div>

        {/* Devotee Identity Card */}
        <Card className="mb-6 border-[rgba(63,148,149,0.16)] bg-white p-5 shadow-level1 sm:p-7">
          <div className="flex items-center gap-4">
            <Avatar name={user.name} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[18px] font-bold text-[#193B3B] sm:text-[20px]">
                  {user.spiritualName || user.name}
                </h2>
                <Badge variant="krishna" size="sm">
                  <span className="font-serif text-[10px]">शिष्यः</span>
                </Badge>
              </div>

              {user.spiritualName && (
                <div className="text-[13px] text-[#547070]">{user.name}</div>
              )}

              {user.email && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#547070]">
                  <Mail className="h-3.5 w-3.5 text-[#547070]" />
                  <span>{user.email}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Connected Guru Card */}
        <div className="mb-6 space-y-2">
          <h3 className="text-[14px] font-bold text-[#193B3B]">Your Guru</h3>
          {connectedGuru ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[rgba(63,148,149,0.16)] bg-white p-4 shadow-level1 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#A9824D]/10 text-[#A9824D]">
                  <HeartHandshake className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-[15px] font-bold text-[#193B3B]">
                    {connectedGuru.spiritualName || connectedGuru.name}
                  </div>
                  <div className="text-[12px] font-medium text-[#328A7A]">
                    Active Spiritual Guidance
                  </div>
                </div>
              </div>
              <Badge variant="saffron" size="sm">
                <span className="font-serif text-[11px]">गुरुसंरक्षणम्</span>
              </Badge>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[rgba(63,148,149,0.16)] bg-white p-4 shadow-level1 sm:p-5">
              <div>
                <div className="text-[14px] font-bold text-[#193B3B]">No Guru Connected Yet</div>
                <div className="text-[12px] text-[#547070]">
                  Have an invitation link or code from your Guru?
                </div>
              </div>
              <Link href="/invite">
                <Button variant="secondary" size="sm">
                  Accept Invite
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Account Details Card */}
        <div className="mb-8 space-y-2">
          <h3 className="text-[14px] font-bold text-[#193B3B]">Account Details</h3>
          <Card className="divide-y divide-[rgba(63,148,149,0.12)] border-[rgba(63,148,149,0.16)] bg-white p-0 shadow-level1">
            <div className="flex items-center justify-between p-4 text-[13px]">
              <span className="text-[#547070]">Account Status</span>
              <span className="flex items-center gap-1.5 font-medium text-[#328A7A]">
                <ShieldCheck className="h-4 w-4" />
                <span>Active</span>
              </span>
            </div>
            <div className="flex items-center justify-between p-4 text-[13px]">
              <span className="text-[#547070]">Member Since</span>
              <span className="flex items-center gap-1.5 text-[#193B3B]">
                <Calendar className="h-4 w-4 text-[#547070]" />
                <span>{joinDate}</span>
              </span>
            </div>
          </Card>
        </div>

        {/* Sign Out Action */}
        <div className="flex justify-center pt-2">
          <form
            action={async () => {
              "use server";
              await logoutAction();
              redirect("/login");
            }}
          >
            <Button
              type="submit"
              variant="secondary"
              size="default"
              className="w-full text-[#B33927] hover:bg-[#B33927]/10 hover:text-[#992E1E] sm:w-auto"
              leftIcon={<LogOut className="h-4 w-4" />}
            >
              Sign Out of Nityasādhanā
            </Button>
          </form>
        </div>
      </Container>
    </main>
  );
}
