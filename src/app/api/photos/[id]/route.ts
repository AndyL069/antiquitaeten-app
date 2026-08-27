import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { removePhotoFile, saveItemPhoto, assertUploadType } from "@/lib/uploads";
import { requireSession } from "@/lib/session";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: Params) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) return NextResponse.json({ error: "Foto nicht gefunden" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Ungültiger Upload" }, { status: 400 });
  const file = form.getAll("photo").find((f): f is File => f instanceof File);
  if (!file) return NextResponse.json({ error: "Keine Datei übermittelt" }, { status: 400 });

  try {
    assertUploadType(file.type, file.size);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: (e as { status?: number }).status ?? 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const newPath = await saveItemPhoto(photo.itemId, bytes, file.type);
  await removePhotoFile(photo.path).catch(() => undefined);
  const updated = await prisma.photo.update({ where: { id }, data: { path: newPath } });

  return NextResponse.json({ photo: updated });
}


export async function PATCH(req: Request, { params }: Params) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) return NextResponse.json({ error: "Foto nicht gefunden" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const caption = typeof body?.caption === "string" ? body.caption.trim() : null;
  const isPrimary = body?.isPrimary === true;

  if (isPrimary) {
    await prisma.photo.updateMany({ where: { itemId: photo.itemId }, data: { isPrimary: false } });
  }

  const updated = await prisma.photo.update({
    where: { id },
    data: {
      caption: caption ?? null,
      isPrimary: isPrimary ? true : photo.isPrimary,
    },
  });

  return NextResponse.json({ photo: updated });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) return NextResponse.json({ error: "Foto nicht gefunden" }, { status: 404 });

  await prisma.photo.delete({ where: { id } });
  await removePhotoFile(photo.path);

  if (photo.isPrimary) {
    const next = await prisma.photo.findFirst({ where: { itemId: photo.itemId }, orderBy: { createdAt: "asc" } });
    if (next) {
      await prisma.photo.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
  }

  return NextResponse.json({ ok: true });
}
