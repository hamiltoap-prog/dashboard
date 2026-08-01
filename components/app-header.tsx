"use client";

import Link from "next/link";
import { Drama } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";

export function AppHeader() {
  const { currentUser } = useStore();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full font-semibold tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Drama className="size-4" />
          </span>
          <span className="text-[15px]">Palco</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Separator orientation="vertical" className="mx-1 h-6" />
          <UserMenu user={currentUser} />
        </div>
      </div>
    </header>
  );
}
