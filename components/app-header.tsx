"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Drama, FolderKanban, ListChecks } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Projetos", icon: FolderKanban },
  { href: "/tarefas", label: "Minhas tarefas", icon: ListChecks },
];

export function AppHeader() {
  const { currentUser } = useStore();
  const pathname = usePathname();

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

        <nav aria-label="Principal" className="flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" || pathname.startsWith("/projects") : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm outline-none transition-colors",
                  "focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Separator orientation="vertical" className="mx-1 h-6" />
          <UserMenu user={currentUser} />
        </div>
      </div>
    </header>
  );
}
