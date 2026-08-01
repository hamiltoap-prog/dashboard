"use client";

import * as React from "react";
import { ImageOff, Link2, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ProjectReference } from "@/lib/types";

export function ReferenceCard({
  reference,
  onClick,
}: {
  reference: ProjectReference;
  onClick: () => void;
}) {
  const [imgError, setImgError] = React.useState(false);
  const hasImage = Boolean(reference.thumbnailUrl) && !imgError;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="relative w-full overflow-hidden bg-secondary">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={reference.thumbnailUrl!}
            alt={reference.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
            {reference.type === "link" ? (
              <Link2 className="size-6" />
            ) : (
              <ImageOff className="size-6" />
            )}
          </div>
        )}
        {reference.type === "video" && hasImage && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <span className="flex size-11 items-center justify-center rounded-full bg-white/90 text-black shadow-md">
              <Play className="ml-0.5 size-5 fill-current" />
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{reference.title}</p>
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-[11px]">
            {reference.sourceLabel}
          </Badge>
        </div>
      </div>
    </button>
  );
}
