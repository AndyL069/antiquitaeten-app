import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Standort nicht gefunden" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : null;
  const parentId = typeof body?.parentId === "string" && body.parentId ? body.parentId : null;

  if (!name) return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
  if (parentId === id) return NextResponse.json({ error: "Standort kann nicht sich selbst übergeordnet sein" }, { status: 400 });

  const location = await prisma.location.update({
    where: { id },
    data: { name, description, parentId },
  });
  return NextResponse.json({ location });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Standort nicht gefunden" }, { status: 404 });

  await prisma.location.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
