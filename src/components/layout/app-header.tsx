"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/brand/avatar";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AppHeaderProps = {
  userName: string;
  userEmail: string;
};

/** Sticky app chrome for dashboard (and similar surfaces). */
export function AppHeader({ userName, userEmail }: AppHeaderProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[#E5E7EB] bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-[10px] px-1.5 py-1 transition-colors duration-150 hover:bg-[var(--ajaia-canvas)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ajaia-accent)]"
                  aria-label="Account menu"
                />
              }
            >
              <Avatar name={userName} size="sm" />
              <span className="hidden max-w-[10rem] truncate text-sm font-medium text-[var(--ajaia-ink)] sm:inline">
                {userName}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <div className="border-b border-border px-2 py-2">
                <p className="truncate text-sm font-medium text-[var(--ajaia-ink)]">
                  {userName}
                </p>
                <p className="truncate text-xs text-[var(--ajaia-muted)]">
                  {userEmail}
                </p>
              </div>
              <DropdownMenuItem
                disabled={pending}
                onClick={() => void signOut()}
              >
                {pending ? "Signing out…" : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            disabled={pending}
            aria-label="Sign out"
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
