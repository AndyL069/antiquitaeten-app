import { NextResponse } from "next/server";
import { assertUploadType, MAX_PHOTOS } from "@/lib/uploads";
import { extractItemDetailsFromImage } from "@/lib/gemini";
import { requireSession } from "@/lib/session";

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage: multipart/form-data erwartet" }, { status: 400 });
  }

  const files = form.getAll("photo").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Feld 'photo' fehlt" }, { status: 400 });
  }
  if (files.length > MAX_PHOTOS) {
    return NextResponse.json({ error: `Maximal ${MAX_PHOTOS} Bilder pro Objekt erlaubt` }, { status: 400 });
  }
  for (const file of files) {
    if (!file.type) return NextResponse.json({ error: "Dateityp unbekannt" }, { status: 415 });
    try {
      assertUploadType(file.type, file.size);
    } catch (e) {
      const err = e as Error & { status?: number };
      return NextResponse.json({ error: err.message }, { status: err.status ?? 400 });
    }
  }

  const images: { base64: string; mimeType: string }[] = [];
  for (const file of files) {
    const bytes = Buffer.from(await file.arrayBuffer());
    images.push({ base64: bytes.toString("base64"), mimeType: file.type });
  }

  try {
    const details = await extractItemDetailsFromImage(images);
    return NextResponse.json({ details });
  } catch (e) {
    const message =
      e instanceof Error && e.message.includes("API-Key")
        ? e.message
        : "Analyse fehlgeschlagen, bitte erneut versuchen";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
