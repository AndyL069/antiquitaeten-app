"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadUrl } from "@/lib/upload-url";
import { ImagePlusIcon, Loader2Icon, RefreshCwIcon, StarIcon, Trash2Icon } from "lucide-react";

interface PhotoItem {
  id: string;
  path: string;
  caption: string | null;
  isPrimary: boolean;
}

export function PhotoManager({ itemId, photos }: { itemId: string; photos: PhotoItem[] }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const form = new FormData();
    for (const f of Array.from(files)) form.append("photo", f);
    setUploading(true);
    try {
      const res = await fetch(`/api/items/${itemId}/photos`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Upload fehlgeschlagen");
        return;
      }
      toast.success("Foto hinzugefügt");
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function onReplace(file: File | undefined) {
    if (!file || !replaceId) return;
    const form = new FormData();
    form.append("photo", file);
    setUploading(true);
    try {
      const res = await fetch(`/api/photos/${replaceId}`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Ersetzen fehlgeschlagen");
        return;
      }
      toast.success("Foto ersetzt");
      router.refresh();
    } finally {
      setUploading(false);
      setReplaceId(null);
    }
  }

  async function setPrimary(id: string) {
    const res = await fetch(`/api/photos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrimary: true }),
    });
    if (!res.ok) {
      toast.error("Fehler beim Festlegen des Titelbilds");
      return;
    }
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Foto wirklich löschen?")) return;
    const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Löschen fehlgeschlagen");
      return;
    }
    toast.success("Foto gelöscht");
    router.refresh();
  }

  function startReplace(id: string) {
    setReplaceId(id);
    replaceRef.current?.click();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((p) => (
          <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border/70">
            <Image src={uploadUrl(p.path)!} alt={p.caption ?? ""} fill sizes="200px" className="object-cover" />
            {p.isPrimary ? (
              <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                <StarIcon className="size-3" />
                Titelbild
              </span>
            ) : null}
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
              {!p.isPrimary ? (
                <Button
                  variant="secondary"
                  size="icon-sm"
                  aria-label="Als Titelbild festlegen"
                  onClick={() => setPrimary(p.id)}
                >
                  <StarIcon className="size-4" />
                </Button>
              ) : null}
              <Button variant="secondary" size="icon-sm" aria-label="Foto ersetzen" onClick={() => startReplace(p.id)}>
                <RefreshCwIcon className="size-4" />
              </Button>
              <Button variant="destructive" size="icon-sm" aria-label="Foto löschen" onClick={() => remove(p.id)}>
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
        >
          {uploading ? <Loader2Icon className="size-6 animate-spin" /> : <ImagePlusIcon className="size-6" />}
          <span className="px-2 text-center text-xs">{uploading ? "Wird hochgeladen…" : "Foto hinzufügen"}</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            void onUpload(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={replaceRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            void onReplace(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
