import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const locations = await prisma.location.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true, children: true } } },
  });
  return NextResponse.json({ locations });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const parentId = typeof body?.parentId === "string" && body.parentId ? body.parentId : null;

  if (!name) return NextResponse.json({ error: "Name fehlt" }, { status: 400 });

  const location = await prisma.location.create({
    data: { name, description: description || null, parentId },
  });
  return NextResponse.json({ location }, { status: 201 });
}
