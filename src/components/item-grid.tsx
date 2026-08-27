"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LandmarkIcon, SearchIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { uploadUrl } from "@/lib/upload-url";
import { CATEGORIES } from "@/lib/constants";

interface PhotoSummary {
  id: string;
  path: string;
  isPrimary: boolean;
}

interface ItemSummary {
  id: string;
  name: string;
  inventoryNumber: string | null;
  category: string | null;
  era: string | null;
  description: string | null;
  createdAt: string;
  location: { id: string; name: string } | null;
  photos: PhotoSummary[];
}

export function ItemGrid() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [items, setItems] = useState<ItemSummary[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (category) params.set("category", category);
        const res = await fetch(`/api/items?${params.toString()}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setItems(data.items as ItemSummary[]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, category]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Sammlung durchsuchen…"
            className="pl-9"
          />
        </div>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="sm:w-48"
          aria-label="Kategorie filtern"
        >
          <option value="">Alle Kategorien</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <CardContent className="p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-2 h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && items && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <LandmarkIcon className="size-6" />
          </span>
          <p className="text-muted-foreground">
            {q || category ? "Keine Objekte gefunden." : "Noch keine Objekte erfasst."}
          </p>
          {!q && !category && (
            <Link href="/new" className="text-sm font-medium text-primary underline underline-offset-4">
              Erstes Objekt anlegen
            </Link>
          )}
        </div>
      )}

      {!loading && items && items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const primary = item.photos.find((p) => p.isPrimary) ?? item.photos[0];
            return (
              <Link key={item.id} href={`/items/${item.id}`} className="group">
                <Card className="h-full overflow-hidden py-0 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:ring-primary/30">
                  <div className="relative aspect-[4/3] w-full bg-muted">
                    {primary ? (
                      <Image
                        src={uploadUrl(primary.path)!}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <LandmarkIcon className="size-10" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <h3 className="line-clamp-1 font-heading text-base font-semibold">{item.name}</h3>
                      {item.inventoryNumber ? (
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                          {item.inventoryNumber}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.category ? <Badge variant="secondary">{item.category}</Badge> : null}
                      {item.era ? <Badge variant="outline">{item.era}</Badge> : null}
                    </div>
                    {item.location ? (
                      <p className="mt-2 text-xs text-muted-foreground">Standort: {item.location.name}</p>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
