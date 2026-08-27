"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CATEGORIES, CONDITIONS, ERAS } from "@/lib/constants";
import type { LocationOption } from "@/lib/locations";
import { Loader2Icon, SaveIcon } from "lucide-react";

interface FormState {
  inventoryNumber: string;
  name: string;
  category: string;
  era: string;
  origin: string;
  material: string;
  dimensions: string;
  condition: string;
  description: string;
  acquisitionDate: string;
  acquisitionNote: string;
  locationId: string;
}

function emptyState(): FormState {
  return {
    inventoryNumber: "",
    name: "",
    category: "",
    era: "",
    origin: "",
    material: "",
    dimensions: "",
    condition: "",
    description: "",
    acquisitionDate: "",
    acquisitionNote: "",
    locationId: "",
  };
}

export function ItemForm({
  mode,
  itemId,
  initial,
  locations,
}: {
  mode: "new" | "edit";
  itemId?: string;
  initial?: FormState;
  locations: LocationOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial ?? emptyState());
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error("Bitte einen Namen eingeben");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(mode === "new" ? "/api/items" : `/api/items/${itemId}`, {
        method: mode === "new" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Speichern fehlgeschlagen");
        return;
      }
      toast.success(mode === "new" ? "Objekt angelegt" : "Objekt aktualisiert");
      router.push(mode === "new" ? `/items/${data.id}` : `/items/${itemId}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="z. B. Standuhr"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="inventoryNumber">Inventarnummer</Label>
          <Input
            id="inventoryNumber"
            value={form.inventoryNumber}
            onChange={(e) => set("inventoryNumber", e.target.value)}
            placeholder="z. B. INV-0001"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="category">Kategorie</Label>
          <Select id="category" value={form.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">–</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="era">Epoche</Label>
          <Select id="era" value={form.era} onChange={(e) => set("era", e.target.value)}>
            <option value="">–</option>
            {ERAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="condition">Zustand</Label>
          <Select id="condition" value={form.condition} onChange={(e) => set("condition", e.target.value)}>
            <option value="">–</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="origin">Herkunft</Label>
          <Input
            id="origin"
            value={form.origin}
            onChange={(e) => set("origin", e.target.value)}
            placeholder="z. B. Meißen, ca. 1830"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="material">Material</Label>
          <Input
            id="material"
            value={form.material}
            onChange={(e) => set("material", e.target.value)}
            placeholder="z. B. Porzellan"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dimensions">Maße</Label>
          <Input
            id="dimensions"
            value={form.dimensions}
            onChange={(e) => set("dimensions", e.target.value)}
            placeholder="z. B. H 22 cm, B 12 cm"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="locationId">Standort</Label>
          <Select id="locationId" value={form.locationId} onChange={(e) => set("locationId", e.target.value)}>
            <option value="">–</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {"\u00A0".repeat(l.depth * 2)}
                {l.depth > 0 ? "↳ " : ""}
                {l.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
          placeholder="Detaillierte Beschreibung, Besonderheiten, Signaturen …"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="acquisitionDate">Übernahmedatum</Label>
          <Input
            id="acquisitionDate"
            type="date"
            value={form.acquisitionDate}
            onChange={(e) => set("acquisitionDate", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="acquisitionNote">Übernahme / Erblasser</Label>
          <Input
            id="acquisitionNote"
            value={form.acquisitionNote}
            onChange={(e) => set("acquisitionNote", e.target.value)}
            placeholder="z. B. geerbt von Großmutter"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" onClick={() => router.back()} disabled={saving}>
          Abbrechen
        </Button>
        <Button onClick={save} disabled={saving || !form.name.trim()}>
          {saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
          Speichern
        </Button>
      </div>
    </div>
  );
}
