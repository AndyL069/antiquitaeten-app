import { NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/lib/prisma";
import { buildSearchText, parseItemInput } from "@/lib/items";
import { finalizeTempPhoto } from "@/lib/uploads";
import { requireSession } from "@/lib/session";

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const category = url.searchParams.get("category")?.trim() ?? "";
  const locationId = url.searchParams.get("locationId")?.trim() ?? "";

  const items = await prisma.item.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { searchText: { contains: q, mode: "insensitive" } },
                { inventoryNumber: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
        category ? { category: { equals: category, mode: "insensitive" } } : {},
        locationId ? { locationId } : {},
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      inventoryNumber: true,
      category: true,
      era: true,
      description: true,
      createdAt: true,
      location: { select: { id: true, name: true } },
      photos: { select: { id: true, path: true, isPrimary: true }, orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const data = parseItemInput(body);
  if ("error" in data) return NextResponse.json({ error: data.error }, { status: 400 });

  const photoPaths = Array.isArray((body as { photoPaths?: unknown })?.photoPaths)
    ? (body as { photoPaths: unknown[] }).photoPaths
        .filter((p): p is string => typeof p === "string")
        .map((p) => path.normalize(p))
        .filter((p) => p.startsWith("tmp"))
    : [];
  if (photoPaths.some((p) => p.startsWith("..") || path.isAbsolute(p))) {
    return NextResponse.json({ error: "Ungültiger Bildpfad" }, { status: 400 });
  }

  try {
    const item = await prisma.item.create({
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
        createdById: session.user.id,
        searchText: buildSearchText(data),
      },
    });

    const finalPaths: string[] = [];
    for (const rel of photoPaths) {
      const finalized = await finalizeTempPhoto(rel, item.id).catch(() => null);
      if (finalized) finalPaths.push(finalized);
    }
    if (finalPaths.length > 0) {
      await prisma.photo.createMany({
        data: finalPaths.map((p, i) => ({ itemId: item.id, path: p, isPrimary: i === 0 })),
      });
    }

    return NextResponse.json({ id: item.id }, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Inventarnummer ist bereits vergeben" }, { status: 409 });
    }
    throw e;
  }
}
