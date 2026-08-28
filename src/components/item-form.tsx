"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, CONDITIONS, ERAS, EBAY_CONDITIONS } from "@/lib/constants";
import type { LocationOption } from "@/lib/locations";
import type { ItemDetails } from "@/lib/items";
import {
  ImagePlusIcon,
  InfoIcon,
  Loader2Icon,
  PlusIcon,
  SaveIcon,
  SparklesIcon,
  TagIcon,
  Trash2Icon,
} from "lucide-react";

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
  context: string;
  author: string;
  publisher: string;
  publicationYear: string;
  edition: string;
  language: string;
  weight: string;
  ebayTitle: string;
  ebayCategory: string;
  ebayCondition: string;
  ebayConditionNote: string;
  startPrice: string;
  buyItNowPrice: string;
  estimatedValue: string;
  valueNote: string;
  acquisitionDate: string;
  locationId: string;
}

type PendingPhoto = { file: File; url: string };

function emptyState(): FormState {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
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
    context: "",
    author: "",
    publisher: "",
    publicationYear: "",
    edition: "",
    language: "",
    weight: "",
    ebayTitle: "",
    ebayCategory: "",
    ebayCondition: "",
    ebayConditionNote: "",
    startPrice: "",
    buyItNowPrice: "",
    estimatedValue: "",
    valueNote: "",
    acquisitionDate: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
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
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    const combined = [...photos, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))];
    if (combined.length > 6) {
      toast.error("Maximal 6 Bilder pro Objekt");
      return;
    }
    for (const f of files) {
      if (!f.type.startsWith("image/")) {
        toast.error("Bitte nur Bilddateien wählen (PNG, JPEG oder WebP)");
        return;
      }
      if (f.size > 15 * 1024 * 1024) {
        toast.error("Jedes Bild darf max. 15 MB groß sein");
        return;
      }
    }
    setPhotos(combined);
    setAnalyzed(false);
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(photos[index].url);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setAnalyzed(false);
  }

  async function analyze() {
    if (photos.length === 0) return;
    setAnalyzing(true);
    try {
      const formData = new FormData();
      for (const p of photos) formData.append("photo", p.file);
      const res = await fetch("/api/items/analyze", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Analyse fehlgeschlagen");
        return;
      }
      const d = data.details as ItemDetails;
      setForm((f) => ({
        ...f,
        name: d.name || f.name,
        category: d.category || f.category,
        era: d.era || f.era,
        origin: d.origin || f.origin,
        material: d.material || f.material,
        dimensions: d.dimensions || f.dimensions,
        condition: d.condition || f.condition,
        description: d.description || f.description,
        context: d.context || f.context,
        author: d.author || f.author,
        publisher: d.publisher || f.publisher,
        publicationYear: d.publicationYear || f.publicationYear,
        edition: d.edition || f.edition,
        language: d.language || f.language,
        weight: d.weight || f.weight,
        ebayTitle: d.ebayTitle || f.ebayTitle,
        ebayCategory: d.ebayCategory || f.ebayCategory,
        ebayCondition: d.ebayCondition || f.ebayCondition,
        ebayConditionNote: d.ebayConditionNote || f.ebayConditionNote,
        startPrice: d.startPrice && d.startPrice > 0 ? String(d.startPrice) : f.startPrice,
        buyItNowPrice: d.buyItNowPrice && d.buyItNowPrice > 0 ? String(d.buyItNowPrice) : f.buyItNowPrice,
        estimatedValue: d.estimatedValue && d.estimatedValue > 0 ? String(d.estimatedValue) : f.estimatedValue,
        valueNote: d.valueNote || f.valueNote,
      }));
      setAnalyzed(true);
      toast.success("Eigenschaften erkannt");
    } catch {
      toast.error("Analyse fehlgeschlagen, bitte erneut versuchen");
    } finally {
      setAnalyzing(false);
    }
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error("Bitte einen Namen eingeben");
      return;
    }
    setSaving(true);
    try {
      let res: Response;
      if (mode === "new") {
        const formData = new FormData();
        Object.entries(form).forEach(([k, v]) => formData.append(k, v));
        for (const p of photos) formData.append("photo", p.file);
        res = await fetch("/api/items", { method: "POST", body: formData });
      } else {
        res = await fetch(`/api/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
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
      {mode === "new" && (
        <div className="flex flex-col gap-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <ImagePlusIcon className="size-7 text-muted-foreground" />
            <p className="font-medium">Bilder hierher ziehen oder klicken</p>
            <p className="text-sm text-muted-foreground">
              PNG, JPEG oder WebP, max. 15 MB – die KI erkennt die Eigenschaften
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {photos.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {photos.map((p, i) => (
                  <div key={p.url} className="group relative size-20 overflow-hidden rounded-lg border">
                    <Image src={p.url} alt={`Bild ${i + 1}`} fill unoptimized sizes="80px" className="object-cover" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(i);
                      }}
                      className="absolute right-0.5 top-0.5 hidden rounded-full bg-destructive p-0.5 text-destructive-foreground group-hover:block"
                      aria-label="Entfernen"
                    >
                      <Trash2Icon className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="w-fit" onClick={() => inputRef.current?.click()}>
                  <PlusIcon className="size-4" />
                  Weitere Bilder
                </Button>
                <Button size="sm" className="w-fit" onClick={() => void analyze()} disabled={analyzing || photos.length === 0}>
                  {analyzing ? <Loader2Icon className="size-4 animate-spin" /> : <SparklesIcon className="size-4" />}
                  Mit KI erkennen
                </Button>
              </div>
            </div>
          )}

          {analyzing && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Eigenschaften werden erkannt…
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Objektdetails</h3>
          {analyzed ? (
            <Badge variant="secondary" className="gap-1">
              <SparklesIcon className="size-3" />
              von der KI erkannt
            </Badge>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="z. B. Standuhr" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="category">Kategorie</Label>
            <Input list="category-list" id="category" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="z. B. Keramik" />
            <datalist id="category-list">
              {CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="era">Epoche</Label>
            <Input list="era-list" id="era" value={form.era} onChange={(e) => set("era", e.target.value)} placeholder="z. B. Jugendstil" />
            <datalist id="era-list">
              {ERAS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="material">Material</Label>
            <Input id="material" value={form.material} onChange={(e) => set("material", e.target.value)} placeholder="z. B. Porzellan" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="origin">Herkunft</Label>
            <Input id="origin" value={form.origin} onChange={(e) => set("origin", e.target.value)} placeholder="z. B. Meißen" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="dimensions">Maße</Label>
            <Input id="dimensions" value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} placeholder="z. B. H 22 cm" />
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
            <Label htmlFor="author">Autor</Label>
            <Input id="author" value={form.author} onChange={(e) => set("author", e.target.value)} placeholder="z. B. Johan F. Stöckel" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="publisher">Verlag / Hersteller</Label>
            <Input id="publisher" value={form.publisher} onChange={(e) => set("publisher", e.target.value)} placeholder="z. B. Verlag, Manufaktur" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="publicationYear">Erscheinungsjahr</Label>
            <Input id="publicationYear" value={form.publicationYear} onChange={(e) => set("publicationYear", e.target.value)} placeholder="z. B. 1938" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edition">Auflage</Label>
            <Input id="edition" value={form.edition} onChange={(e) => set("edition", e.target.value)} placeholder="z. B. 1. Auflage" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="language">Sprache</Label>
            <Input id="language" value={form.language} onChange={(e) => set("language", e.target.value)} placeholder="z. B. Dänisch" />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder="Wie das Objekt aussieht (Optik, Ausführung, Details …)"
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="context">Hintergrund / Kontext</Label>
            <Textarea
              id="context"
              value={form.context}
              onChange={(e) => set("context", e.target.value)}
              rows={3}
              placeholder="z. B. bei einem Buch: Worum geht es darin, wofür ist es bekannt?"
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="estimatedValue">Geschätzter Wert (EUR)</Label>
            <Input
              id="estimatedValue"
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={form.estimatedValue}
              onChange={(e) => set("estimatedValue", e.target.value)}
              placeholder="z. B. 350"
            />
            {form.valueNote ? <p className="text-xs text-muted-foreground">{form.valueNote}</p> : null}
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-muted/40 p-4">
        <div className="flex items-center gap-2">
          <InfoIcon className="size-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Ergänzungen von dir</h3>
        </div>
        <p className="-mt-2 text-sm text-muted-foreground">
          Diese Angaben kann die KI nicht erkennen – bitte selbst ausfüllen. Die Inventarnummer wird automatisch vergeben.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="acquisitionDate">Übernahmedatum</Label>
            <Input id="acquisitionDate" type="date" value={form.acquisitionDate} onChange={(e) => set("acquisitionDate", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-muted/40 p-4">
        <div className="flex items-center gap-2">
          <TagIcon className="size-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Verkauf (eBay)</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="ebayTitle">eBay-Titel</Label>
            <Input id="ebayTitle" value={form.ebayTitle} onChange={(e) => set("ebayTitle", e.target.value)} placeholder="z. B. Antikes Buch Handfeuerwaffen – Johan F. Stöckel, 1938" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ebayCategory">eBay-Kategorie</Label>
            <Input id="ebayCategory" value={form.ebayCategory} onChange={(e) => set("ebayCategory", e.target.value)} placeholder="z. B. Bücher > Antiquarisch" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ebayCondition">eBay-Zustand</Label>
            <Select id="ebayCondition" value={form.ebayCondition} onChange={(e) => set("ebayCondition", e.target.value)}>
              <option value="">–</option>
              {EBAY_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="ebayConditionNote">Zustandsbeschreibung</Label>
            <Textarea
              id="ebayConditionNote"
              value={form.ebayConditionNote}
              onChange={(e) => set("ebayConditionNote", e.target.value)}
              rows={2}
              placeholder="z. B. Einband berieben, Seiten altersbedingt gebräunt"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="weight">Gewicht</Label>
            <Input id="weight" value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="z. B. 1,2 kg" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="startPrice">Startpreis (EUR)</Label>
            <Input id="startPrice" type="number" min={0} step="any" inputMode="decimal" value={form.startPrice} onChange={(e) => set("startPrice", e.target.value)} placeholder="z. B. 50" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="buyItNowPrice">Sofort-Kaufen (EUR)</Label>
            <Input id="buyItNowPrice" type="number" min={0} step="any" inputMode="decimal" value={form.buyItNowPrice} onChange={(e) => set("buyItNowPrice", e.target.value)} placeholder="z. B. 120" />
          </div>
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
