"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/items";
import { CURRENCIES } from "@/lib/constants";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";

interface AppraisalItem {
  id: string;
  value: number;
  currency: string;
  appraisalDate: string | null;
  appraiser: string | null;
  note: string | null;
}

export function AppraisalsSection({ itemId, appraisals }: { itemId: string; appraisals: AppraisalItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [appraisalDate, setAppraisalDate] = useState("");
  const [appraiser, setAppraiser] = useState("");
  const [note, setNote] = useState("");

  async function add() {
    const v = Number(value.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) {
      toast.error("Bitte einen gültigen Wert eingeben");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/appraisals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          value: v,
          currency,
          appraisalDate: appraisalDate || null,
          appraiser,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Speichern fehlgeschlagen");
        return;
      }
      toast.success("Wertgutachten hinzugefügt");
      setOpen(false);
      setValue("");
      setAppraisalDate("");
      setAppraiser("");
      setNote("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/appraisals/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Löschen fehlgeschlagen");
      return;
    }
    toast.success("Wertgutachten gelöscht");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {appraisals.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {appraisals.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-card/50 p-3">
              <div>
                <p className="font-semibold">{formatCurrency(a.value, a.currency)}</p>
                <p className="text-sm text-muted-foreground">
                  {[formatDate(a.appraisalDate), a.appraiser].filter(Boolean).join(" · ")}
                </p>
                {a.note ? <p className="mt-1 text-sm">{a.note}</p> : null}
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Wertgutachten löschen" onClick={() => remove(a.id)}>
                <Trash2Icon className="size-4 text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Keine Wertgutachten erfasst.</p>
      )}

      {!open ? (
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setOpen(true)}>
          <PlusIcon className="size-4" />
          Wertgutachten hinzufügen
        </Button>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/50 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="value">Wert *</Label>
              <Input
                id="value"
                type="number"
                step="any"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="z. B. 1800"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="currency">Währung</Label>
              <Select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="appraisalDate">Datum</Label>
              <Input id="appraisalDate" type="date" value={appraisalDate} onChange={(e) => setAppraisalDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="appraiser">Gutachter</Label>
              <Input id="appraiser" value={appraiser} onChange={(e) => setAppraiser(e.target.value)} placeholder="z. B. Auktionshaus" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="note">Anmerkung</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. geschätzt nach Foto" />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button size="sm" onClick={add} disabled={saving}>
              {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Speichern
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
