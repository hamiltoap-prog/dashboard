"use client";

import { useRouter } from "next/navigation";
import { KeyRound, LogOut, User } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InstallAppMenuItem } from "@/components/pwa";
import { UserAvatar } from "@/components/user-avatar";
import { signOutUser } from "@/lib/firebase/auth-actions";
import type { Profile } from "@/lib/types";

export function UserMenu({ user }: { user: Profile }) {
  const router = useRouter();

  async function handleSignOut() {
    await signOutUser();
    router.replace("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <UserAvatar profile={user} className="size-8" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5 px-2.5 py-1.5">
          <span className="text-sm font-medium text-foreground">{user.name}</span>
          <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/perfil")}>
          <User />
          Perfil
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/alterar-senha")}>
          <KeyRound />
          Alterar senha
        </DropdownMenuItem>
        <InstallAppMenuItem />
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
          <LogOut />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
