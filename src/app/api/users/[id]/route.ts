import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const role = body?.role === "ADMIN" ? "ADMIN" : body?.role === "MEMBER" ? "MEMBER" : null;
  const name = typeof body?.name === "string" ? body.name.trim() : null;

  if (!role && name === null) return NextResponse.json({ error: "Keine Änderung" }, { status: 400 });

  if (role && id === session.user.id && role !== "ADMIN") {
    return NextResponse.json({ error: "Sie können sich nicht selbst zum Mitglied herabstufen" }, { status: 400 });
  }

  if (role === "MEMBER" && target.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) {
      return NextResponse.json({ error: "Es muss mindestens ein Administrator übrig bleiben" }, { status: 400 });
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role: role ?? undefined, name: name === null ? undefined : name },
    select: { id: true, email: true, name: true, role: true },
  });
  return NextResponse.json({ user });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });

  if (id === session.user.id) {
    return NextResponse.json({ error: "Sie können sich nicht selbst löschen" }, { status: 400 });
  }
  if (target.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) {
      return NextResponse.json({ error: "Es muss mindestens ein Administrator übrig bleiben" }, { status: 400 });
    }
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
