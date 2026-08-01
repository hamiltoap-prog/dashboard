"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Calendar,
  Columns3,
  FileText,
  Images,
  LayoutDashboard,
} from "lucide-react";

import { cn } from "@/lib/utils";

const tabs = (slug: string) => [
  { href: `/projects/${slug}`, label: "Visão geral", icon: LayoutDashboard, exact: true },
  { href: `/projects/${slug}/kanban`, label: "Kanban", icon: Columns3 },
  { href: `/projects/${slug}/arquivos`, label: "Arquivos", icon: FileText },
  { href: `/projects/${slug}/referencias`, label: "Referências", icon: Images },
  { href: `/projects/${slug}/calendario`, label: "Calendário", icon: Calendar },
  { href: `/projects/${slug}/atividade`, label: "Atividade", icon: Activity },
];

export function ProjectTabsNav({ slug }: { slug: string }) {
  const pathname = usePathname();

  return (
    <nav className="-mx-4 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0">
      <div className="inline-flex w-fit min-w-full items-center gap-1 rounded-full bg-secondary p-1 md:w-fit md:min-w-0">
        {tabs(slug).map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
