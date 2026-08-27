import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { removePhotoFile } from "@/lib/uploads";
import { requireSession } from "@/lib/session";

interface Params {
  params: Promise<{ id: string }>;
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
