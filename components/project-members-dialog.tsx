"use client";

import * as React from "react";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/user-avatar";
import { useStore } from "@/lib/store";
import type { Project } from "@/lib/types";

export function ProjectMembersDialog({ project }: { project: Project }) {
  const { getProfile, addMember } = useStore();
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");

  const members = project.memberIds
    .map((id) => getProfile(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    addMember(project.id, email.trim());
    setEmail("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setEmail("");
      }}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 rounded-full border border-dashed border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
        onClick={() => setOpen(true)}
        title="Adicionar pessoa ao projeto"
      >
        <UserPlus className="size-4" />
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pessoas no projeto</DialogTitle>
          <DialogDescription>
            Quem tiver conta no Palco pode ser adicionado pelo e-mail cadastrado.
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-2">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 rounded-xl border border-border p-2.5">
              <UserAvatar profile={member} className="size-9" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{member.name}</span>
                <span className="truncate text-xs text-muted-foreground">{member.email}</span>
              </div>
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 border-t border-border pt-4">
          <Label htmlFor="member-email">Adicionar por e-mail</Label>
          <div className="flex gap-2">
            <Input
              id="member-email"
              type="email"
              placeholder="pessoa@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit">Adicionar</Button>
          </div>
        </form>

        <DialogFooter className="sm:justify-start">
          <p className="text-xs text-muted-foreground">
            A pessoa precisa já ter criado uma conta no Palco (tela de login) para poder ser
            adicionada.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
