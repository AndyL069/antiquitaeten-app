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
  const sale = await prisma.sale.findUnique({ where: { id } });
  if (!sale) return NextResponse.json({ error: "Verkauf nicht gefunden" }, { status: 404 });

  await prisma.sale.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
