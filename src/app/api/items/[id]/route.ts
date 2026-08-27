import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSearchText, parseItemInput } from "@/lib/items";
import { removeItemFiles } from "@/lib/uploads";
import { requireSession } from "@/lib/session";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      location: true,
      createdBy: { select: { id: true, email: true, name: true } },
      photos: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      appraisals: { orderBy: { appraisalDate: "desc" } },
    },
  });
  if (!item) return NextResponse.json({ error: "Objekt nicht gefunden" }, { status: 404 });

  return NextResponse.json({ item });
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Objekt nicht gefunden" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const data = parseItemInput(body);
  if ("error" in data) return NextResponse.json({ error: data.error }, { status: 400 });

  try {
    await prisma.item.update({
      where: { id },
      data: {
        name: data.name,
        inventoryNumber: data.inventoryNumber || null,
        category: data.category || null,
        era: data.era || null,
        origin: data.origin || null,
        material: data.material || null,
        dimensions: data.dimensions || null,
        condition: data.condition || null,
        description: data.description || null,
        acquisitionDate: data.acquisitionDate ? new Date(data.acquisitionDate) : null,
        acquisitionNote: data.acquisitionNote || null,
        locationId: data.locationId || null,
        searchText: buildSearchText(data),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Inventarnummer ist bereits vergeben" }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Objekt nicht gefunden" }, { status: 404 });

  await prisma.item.delete({ where: { id } });
  await removeItemFiles(id);
  return NextResponse.json({ ok: true });
}
