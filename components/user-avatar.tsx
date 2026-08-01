import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function UserAvatar({
  profile,
  className,
}: {
  profile: Pick<Profile, "name" | "avatarUrl" | "colorHex">;
  className?: string;
}) {
  return (
    <Avatar className={cn("ring-2 ring-card", className)}>
      {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt={profile.name} /> : null}
      <AvatarFallback
        style={{ backgroundColor: `${profile.colorHex}26`, color: profile.colorHex }}
        className="font-semibold"
      >
        {initials(profile.name)}
      </AvatarFallback>
    </Avatar>
  );
}
