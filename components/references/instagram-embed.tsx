"use client";

import * as React from "react";

import { instagramEmbedUrl, type InstagramPost } from "@/lib/instagram";
import { cn } from "@/lib/utils";

// O embed do Instagram tem largura mínima (~326px) e máxima (~540px). Para caber em qualquer espaço
// (inclusive um card estreito no celular), ele é desenhado numa largura que o Instagram aceita e
// reduzido/ampliado proporcionalmente com CSS.
const MIN_WIDTH = 326;
const MAX_WIDTH = 540;

export function InstagramEmbed({
  post,
  title,
  interactive = false,
  nativeWidth,
  extraHeight = 240,
  className,
}: {
  post: InstagramPost;
  title: string;
  // false: só mostra (o clique vai para o card). true: dá para passar o carrossel, dar play etc.
  interactive?: boolean;
  // largura em que o embed é desenhado; sem valor, acompanha o espaço disponível (326–540)
  nativeWidth?: number;
  // altura além da imagem (cabeçalho com o perfil + rodapé). Valores menores cortam o rodapé.
  extraHeight?: number;
  className?: string;
}) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const drawWidth = nativeWidth ?? Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH);
  const drawHeight = drawWidth + extraHeight;
  const scale = width > 0 ? width / drawWidth : 0;

  return (
    <div
      ref={boxRef}
      className={cn("relative w-full overflow-hidden bg-white", className)}
      style={{ height: scale ? drawHeight * scale : drawHeight * 0.5 }}
    >
      {scale > 0 && (
        <iframe
          src={instagramEmbedUrl(post)}
          title={title}
          width={drawWidth}
          height={drawHeight}
          loading="lazy"
          scrolling="no"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          tabIndex={interactive ? 0 : -1}
          aria-hidden={interactive ? undefined : true}
          className="absolute left-0 top-0 origin-top-left border-0"
          style={{
            width: drawWidth,
            height: drawHeight,
            transform: `scale(${scale})`,
            pointerEvents: interactive ? "auto" : "none",
          }}
        />
      )}
    </div>
  );
}
