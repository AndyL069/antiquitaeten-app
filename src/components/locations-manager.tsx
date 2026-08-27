"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { locationOptions } from "@/lib/locations";
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

interface LocationItem {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  itemCount: number;
  childCount: number;
}

export function LocationsManager({ locations }: { locations: LocationItem[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [saving, setSaving] = useState(false);

  const options = locationOptions(locations);

  async function save() {
    if (!name.trim()) {
      toast.error("Bitte einen Namen eingeben");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(editingId ? `/api/locations/${editingId}` : "/api/locations", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, parentId: parentId || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Speichern fehlgeschlagen");
        return;
      }
      toast.success(editingId ? "Standort aktualisiert" : "Standort angelegt");
      reset();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Standort „${name}" löschen? Zugeordnete Objekte behalten keinen Standort mehr.`)) return;
    const res = await fetch(`/api/locations/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error ?? "Löschen fehlgeschlagen");
      return;
    }
    toast.success("Standort gelöscht");
    router.refresh();
  }

  function startEdit(l: LocationItem) {
    setEditingId(l.id);
    setName(l.name);
    setDescription(l.description ?? "");
    setParentId(l.parentId ?? "");
    setAdding(true);
  }

  function reset() {
    setAdding(false);
    setEditingId(null);
    setName("");
    setDescription("");
    setParentId("");
  }

  return (
    <div className="flex flex-col gap-5">
      {!adding ? (
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setAdding(true)}>
          <PlusIcon className="size-4" />
          Neuer Standort
        </Button>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/50 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="loc-name">Name *</Label>
              <Input id="loc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Dachboden" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="loc-parent">Übergeordneter Standort</Label>
              <Select id="loc-parent" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">–</option>
                {options
                  .filter((o) => o.id !== editingId)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {"\u00A0".repeat(o.depth * 2)}
                      {o.depth > 0 ? "↳ " : ""}
                      {o.label}
                    </option>
                  ))}
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="loc-desc">Beschreibung</Label>
            <Input id="loc-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="z. B. Regal links" />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={reset} disabled={saving}>
              Abbrechen
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Speichern
            </Button>
          </div>
        </div>
      )}

      {locations.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Standorte erfasst.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {options.map((o) => {
            const l = locations.find((x) => x.id === o.id)!;
            return (
              <li key={o.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-card/50 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-muted-foreground">{"\u00A0".repeat(o.depth * 2)}{o.depth > 0 ? "↳" : ""}</span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{l.name}</p>
                    {l.description ? <p className="truncate text-xs text-muted-foreground">{l.description}</p> : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-xs text-muted-foreground">
                    {l.itemCount} {l.itemCount === 1 ? "Objekt" : "Objekte"}
                  </span>
                  <Button variant="ghost" size="icon-sm" aria-label="Bearbeiten" onClick={() => startEdit(l)}>
                    <PencilIcon className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Löschen" onClick={() => remove(l.id, l.name)}>
                    <Trash2Icon className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
