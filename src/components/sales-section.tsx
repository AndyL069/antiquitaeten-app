"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/items";
import { CURRENCIES } from "@/lib/constants";
import { Loader2Icon, PlusIcon, TagIcon, Trash2Icon } from "lucide-react";

interface SaleItem {
  id: string;
  platform: string;
  amount: number;
  currency: string;
  soldAt: string | null;
  note: string | null;
}

const PLATFORMS = [
  "eBay",
  "eBay Kleinanzeigen",
  "Etsy",
  "Auktionshaus",
  "Catawiki",
  "Flohmarkt",
  "Privatverkauf",
  "Sonstiges",
];

export function SalesSection({ itemId, sales }: { itemId: string; sales: SaleItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [platform, setPlatform] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [soldAt, setSoldAt] = useState("");
  const [note, setNote] = useState("");

  async function add() {
    if (!platform.trim()) {
      toast.error("Bitte eine Verkaufsplattform wählen");
      return;
    }
    const v = Number(amount.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) {
      toast.error("Bitte einen gültigen Erlös eingeben");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, platform, amount: v, currency, soldAt: soldAt || null, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Speichern fehlgeschlagen");
        return;
      }
      toast.success("Verkauf erfasst");
      setOpen(false);
      setPlatform("");
      setAmount("");
      setSoldAt("");
      setNote("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/sales/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Löschen fehlgeschlagen");
      return;
    }
    toast.success("Verkauf gelöscht");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {sales.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {sales.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-card/50 p-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <TagIcon className="size-3" />
                    {s.platform}
                  </Badge>
                  <span className="font-semibold">{formatCurrency(s.amount, s.currency)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(s.soldAt)}
                  {s.note ? ` · ${s.note}` : ""}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Verkauf löschen" onClick={() => remove(s.id)}>
                <Trash2Icon className="size-4 text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Noch keine Verkäufe erfasst.</p>
      )}

      {!open ? (
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setOpen(true)}>
          <PlusIcon className="size-4" />
          Verkauf erfassen
        </Button>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/50 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sale-platform">Plattform *</Label>
              <Input
                list="sale-platform-list"
                id="sale-platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="z. B. eBay"
              />
              <datalist id="sale-platform-list">
                {PLATFORMS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sale-amount">Erlös *</Label>
              <Input
                id="sale-amount"
                type="number"
                step="any"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="z. B. 350"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sale-currency">Währung</Label>
              <Select id="sale-currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sale-date">Verkaufsdatum</Label>
              <Input id="sale-date" type="date" value={soldAt} onChange={(e) => setSoldAt(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sale-note">Anmerkung</Label>
            <Input id="sale-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. Los 12, Auktionshaus Berlin" />
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
