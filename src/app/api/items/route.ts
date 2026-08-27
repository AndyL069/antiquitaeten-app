import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSearchText, parseItemInput } from "@/lib/items";
import { assertUploadType, saveItemPhoto, MAX_PHOTOS } from "@/lib/uploads";
import { requireSession } from "@/lib/session";

async function nextInventoryNumber(prefix = "INV-"): Promise<string> {
  const items = await prisma.item.findMany({
    where: { inventoryNumber: { not: null } },
    select: { inventoryNumber: true },
  });
  let max = 0;
  for (const it of items) {
    const m = /(\d+)\s*$/.exec(it.inventoryNumber!);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

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
      _count: { select: { sales: true } },
    },
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });

  const fields: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") fields[key] = value;
  }
  const data = parseItemInput(fields);
  if ("error" in data) return NextResponse.json({ error: data.error }, { status: 400 });

  const files = form.getAll("photo").filter((f): f is File => f instanceof File);
  if (files.length > MAX_PHOTOS) {
    return NextResponse.json({ error: `Maximal ${MAX_PHOTOS} Bilder pro Objekt erlaubt` }, { status: 400 });
  }
  for (const file of files) {
    try {
      assertUploadType(file.type, file.size);
    } catch (e) {
      const err = e as Error & { status?: number };
      return NextResponse.json({ error: err.message }, { status: err.status ?? 400 });
    }
  }

  const autoNumber = !data.inventoryNumber;
  let inventoryNumber = data.inventoryNumber || null;

  for (let attempt = 0; attempt < 10; attempt++) {
    if (!inventoryNumber) inventoryNumber = await nextInventoryNumber();
    try {
      const item = await prisma.item.create({
        data: {
          name: data.name,
          inventoryNumber,
          category: data.category || null,
          era: data.era || null,
          origin: data.origin || null,
          material: data.material || null,
          dimensions: data.dimensions || null,
          condition: data.condition || null,
          description: data.description || null,
          context: data.context || null,
          acquisitionDate: data.acquisitionDate ? new Date(data.acquisitionDate) : null,
          locationId: data.locationId || null,
          createdById: session.user.id,
          searchText: buildSearchText(data),
        },
      });

      for (let i = 0; i < files.length; i++) {
        const bytes = Buffer.from(await files[i].arrayBuffer());
        const rel = await saveItemPhoto(item.id, bytes, files[i].type);
        await prisma.photo.create({ data: { itemId: item.id, path: rel, isPrimary: i === 0 } });
      }

      return NextResponse.json({ id: item.id, inventoryNumber }, { status: 201 });
    } catch (e) {
      if ((e as { code?: string }).code === "P2002" && autoNumber) {
        inventoryNumber = null;
        continue;
      }
      if ((e as { code?: string }).code === "P2002") {
        return NextResponse.json({ error: "Inventarnummer ist bereits vergeben" }, { status: 409 });
      }
      throw e;
    }
  }
  return NextResponse.json({ error: "Inventarnummer konnte nicht automatisch vergeben werden" }, { status: 500 });
}
