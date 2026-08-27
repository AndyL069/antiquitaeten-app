import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const itemId = typeof body?.itemId === "string" ? body.itemId : "";
  const platform = typeof body?.platform === "string" ? body.platform.trim() : "";
  const amount = Number(body?.amount);
  const currency = typeof body?.currency === "string" && body.currency ? body.currency.toUpperCase() : "EUR";
  const soldAt = typeof body?.soldAt === "string" && body.soldAt ? body.soldAt : null;
  const note = typeof body?.note === "string" ? body.note.trim() : "";

  if (!itemId) return NextResponse.json({ error: "Objekt fehlt" }, { status: 400 });
  if (!platform) return NextResponse.json({ error: "Verkaufsplattform fehlt" }, { status: 400 });
  if (!Number.isFinite(amount)) return NextResponse.json({ error: "Ungültiger Erlös" }, { status: 400 });

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return NextResponse.json({ error: "Objekt nicht gefunden" }, { status: 404 });

  const sale = await prisma.sale.create({
    data: {
      itemId,
      platform,
      amount,
      currency,
      soldAt: soldAt ? new Date(soldAt) : null,
      note: note || null,
    },
  });

  return NextResponse.json({ sale }, { status: 201 });
}
