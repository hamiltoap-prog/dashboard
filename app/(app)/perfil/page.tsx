"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarFeedSettings } from "@/components/calendar-feed-settings";
import { PushSettings } from "@/components/push-settings";
import { UserAvatar } from "@/components/user-avatar";
import { AVATAR_COLORS } from "@/lib/firebase/profile";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { currentUser, updateProfile } = useStore();
  const [name, setName] = React.useState(currentUser.name);
  const [color, setColor] = React.useState(currentUser.colorHex);
  const [avatarUrl, setAvatarUrl] = React.useState(currentUser.avatarUrl ?? "");

  const trimmedUrl = avatarUrl.trim();
  const urlValid = !trimmedUrl || /^https?:\/\//i.test(trimmedUrl);
  const dirty =
    name.trim() !== currentUser.name ||
    color !== currentUser.colorHex ||
    trimmedUrl !== (currentUser.avatarUrl ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !urlValid) return;
    updateProfile({ name: name.trim(), colorHex: color, avatarUrl: trimmedUrl || null });
    toast.success("Perfil atualizado");
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Seu perfil</CardTitle>
          <CardDescription>É assim que as outras pessoas veem você nos projetos.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <UserAvatar
                profile={{ name: name.trim() || currentUser.name, colorHex: color, avatarUrl: urlValid ? trimmedUrl || null : null }}
                className="size-16 text-lg"
              />
              <div className="min-w-0">
                <p className="truncate font-medium">{name.trim() || currentUser.name}</p>
                <p className="truncate text-sm text-muted-foreground">{currentUser.email}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-name">Nome</Label>
              <Input
                id="profile-name"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Cor do avatar</Label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Cor ${c}`}
                    aria-pressed={color === c}
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full text-white outline-none",
                      "focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      color === c && "ring-2 ring-foreground ring-offset-2 ring-offset-card"
                    )}
                  >
                    {color === c && <Check className="size-4" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-photo">Foto (link de uma imagem, opcional)</Label>
              <Input
                id="profile-photo"
                type="url"
                inputMode="url"
                placeholder="https://..."
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                aria-invalid={!urlValid}
              />
              {!urlValid && (
                <p className="text-xs text-destructive">O link precisa começar com http:// ou https://</p>
              )}
            </div>

            <Button type="submit" disabled={!dirty || !name.trim() || !urlValid}>
              Salvar
            </Button>
          </form>
        </CardContent>
      </Card>

      <PushSettings />
      <CalendarFeedSettings />
    </div>
  );
}
