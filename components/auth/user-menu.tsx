"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { UserRole } from "@/types/auth";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { logoutAction } from "@/lib/actions/auth";

export interface UserMenuProps {
  role?: UserRole;
  userName?: string;
  userEmail?: string;
}

export function UserMenu({ role = "shishya", userName, userEmail }: UserMenuProps) {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const displayName = userName || (role === "guru" ? "Guru" : "Devotee");
  const displayEmail = userEmail || "";
  const displayRole: UserRole = role;

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await logoutAction();
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <div className="flex items-center gap-2.5 sm:gap-3">
      {/* Peaceful Reminders Notification Bell */}
      <NotificationBell role={displayRole} />

      {/* Devotee Info */}
      <div className="flex items-center gap-2.5">
        <Avatar name={displayName} size="sm" />
        <div className="hidden flex-col text-left sm:flex">
          <div className="flex items-center gap-1.5">
            <span className="max-w-[140px] truncate text-[13px] font-semibold text-[#193B3B]">
              {displayName}
            </span>
            <Badge variant={displayRole === "guru" ? "saffron" : "krishna"} size="sm">
              <span className="font-serif text-[10px]">
                {displayRole === "guru" ? "गुरुः" : "शिष्यः"}
              </span>
            </Badge>
          </div>
          {displayEmail && (
            <span className="max-w-[140px] truncate text-[11px] text-[#547070]">
              {displayEmail}
            </span>
          )}
        </div>
      </div>

      {/* Sign Out Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        disabled={isLoggingOut}
        className="px-2.5 text-[#547070] hover:bg-[#B33927]/8 hover:text-[#B33927]"
        aria-label="Sign out of Nityasādhanā"
      >
        {isLoggingOut ? (
          <Loader2 className="h-4 w-4 animate-spin sm:mr-1.5" />
        ) : (
          <LogOut className="h-4 w-4 sm:mr-1.5" />
        )}
        <span className="hidden text-[13px] sm:inline">
          {isLoggingOut ? "Signing out..." : "Sign Out"}
        </span>
      </Button>
    </div>
  );
}
