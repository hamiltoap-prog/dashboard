"use client";

import * as React from "react";
import { ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";

// Escolher uma imagem de capa (print, foto). Mostra a prévia antes de salvar.
export function CoverImagePicker({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const preview = React.useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  React.useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Escolher imagem de capa"
        onChange={(e) => {
          onChange(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      {preview ? (
        <div className="relative w-full max-w-[220px] overflow-hidden rounded-xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Prévia da imagem de capa" className="max-h-56 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Tirar imagem"
            className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/75"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="w-fit" onClick={() => inputRef.current?.click()}>
          <ImagePlus />
          Enviar imagem
        </Button>
      )}
    </div>
  );
}
