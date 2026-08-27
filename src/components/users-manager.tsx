"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheckIcon, ShieldOffIcon, Trash2Icon } from "lucide-react";

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "MEMBER";
  authProvider: string;
  createdAt: string;
}

export function UsersManager({ users, currentUserId }: { users: UserItem[]; currentUserId: string }) {
  const router = useRouter();

  async function setRole(user: UserItem, role: "ADMIN" | "MEMBER") {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Fehler beim Ändern der Rolle");
      return;
    }
    toast.success("Rolle aktualisiert");
    router.refresh();
  }

  async function remove(user: UserItem) {
    if (!window.confirm(`Benutzer „${user.email}" wirklich löschen?`)) return;
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Löschen fehlgeschlagen");
      return;
    }
    toast.success("Benutzer gelöscht");
    router.refresh();
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/70">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/70 bg-muted/50 text-left">
            <th className="px-3 py-2 font-medium">Benutzer</th>
            <th className="px-3 py-2 font-medium">Rolle</th>
            <th className="px-3 py-2 font-medium">Erstellt am</th>
            <th className="px-3 py-2 text-right font-medium">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <tr key={u.id} className="border-b border-border/50 last:border-0">
                <td className="px-3 py-2">
                  <p className="font-medium">{u.name || u.email}</p>
                  {u.name ? <p className="text-xs text-muted-foreground">{u.email}</p> : null}
                  {isSelf ? <Badge variant="outline" className="mt-1">Du</Badge> : null}
                </td>
                <td className="px-3 py-2">
                  {u.role === "ADMIN" ? (
                    <Badge>Administrator</Badge>
                  ) : (
                    <Badge variant="secondary">Mitglied</Badge>
                  )}
                  <div className="mt-1">
                    <Badge variant="ghost">{u.authProvider === "authentik" ? "Authentik" : "Lokal"}</Badge>
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString("de-DE")}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    {u.role === "ADMIN" ? (
                      <Button variant="ghost" size="icon-sm" aria-label="Zum Mitglied machen" disabled={isSelf} onClick={() => setRole(u, "MEMBER")}>
                        <ShieldOffIcon className="size-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon-sm" aria-label="Zum Administrator machen" onClick={() => setRole(u, "ADMIN")}>
                        <ShieldCheckIcon className="size-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon-sm" aria-label="Benutzer löschen" disabled={isSelf} onClick={() => remove(u)}>
                      <Trash2Icon className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
