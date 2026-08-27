import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const itemId = typeof body?.itemId === "string" ? body.itemId : "";
  const value = Number(body?.value);
  const currency = typeof body?.currency === "string" && body.currency ? body.currency.toUpperCase() : "EUR";
  const appraisalDate = typeof body?.appraisalDate === "string" && body.appraisalDate ? body.appraisalDate : null;
  const appraiser = typeof body?.appraiser === "string" ? body.appraiser.trim() : "";
  const note = typeof body?.note === "string" ? body.note.trim() : "";

  if (!itemId) return NextResponse.json({ error: "Objekt fehlt" }, { status: 400 });
  if (!Number.isFinite(value)) return NextResponse.json({ error: "Ungültiger Wert" }, { status: 400 });

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return NextResponse.json({ error: "Objekt nicht gefunden" }, { status: 404 });

  const appraisal = await prisma.appraisal.create({
    data: {
      itemId,
      value,
      currency,
      appraisalDate: appraisalDate ? new Date(appraisalDate) : null,
      appraiser: appraiser || null,
      note: note || null,
    },
  });

  return NextResponse.json({ appraisal }, { status: 201 });
}
