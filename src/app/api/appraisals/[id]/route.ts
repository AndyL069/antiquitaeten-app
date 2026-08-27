import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const appraisal = await prisma.appraisal.findUnique({ where: { id } });
  if (!appraisal) return NextResponse.json({ error: "Wertgutachten nicht gefunden" }, { status: 404 });

  await prisma.appraisal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
