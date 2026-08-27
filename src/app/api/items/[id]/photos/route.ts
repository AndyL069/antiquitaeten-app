import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertUploadType, saveItemPhoto } from "@/lib/uploads";
import { requireSession } from "@/lib/session";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: Params) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Objekt nicht gefunden" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Ungültiger Upload" }, { status: 400 });

  const files = form.getAll("photo").filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "Keine Datei übermittelt" }, { status: 400 });

  const existingCount = await prisma.photo.count({ where: { itemId: id } });

  const created = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      assertUploadType(file.type, file.size);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: (e as { status?: number }).status ?? 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const path = await saveItemPhoto(id, bytes, file.type);
    const photo = await prisma.photo.create({
      data: { itemId: id, path, isPrimary: existingCount === 0 && i === 0 },
    });
    created.push(photo);
  }

  return NextResponse.json({ photos: created }, { status: 201 });
}
