"use client";

import * as React from "react";
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
  const activeRef = React.useRef<HTMLAnchorElement>(null);

  // No celular as abas não cabem: rola a barra até a aba atual (ex.: Calendário) ficar visível.
  React.useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);

  return (
    <nav
      aria-label="Seções do projeto"
      className="-mx-4 overflow-x-auto px-4 scrollbar-none [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)] md:mx-0 md:px-0 md:[mask-image:none]"
    >
      <div className="inline-flex w-fit min-w-full items-center gap-1 rounded-full bg-secondary p-1 pr-6 md:w-fit md:min-w-0 md:pr-1">
        {tabs(slug).map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              ref={active ? activeRef : undefined}
              aria-current={active ? "page" : undefined}
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
