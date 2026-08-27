import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, role: true, authProvider: true, createdAt: true },
  });
  return NextResponse.json({ users });
}
