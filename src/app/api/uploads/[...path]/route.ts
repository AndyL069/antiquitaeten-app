import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { uploadFilePath } from "@/lib/uploads";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

interface Params {
  params: Promise<{ path: string[] }>;
}

export async function GET(_req: Request, { params }: Params) {
  const { path: segments } = await params;
  const rel = segments.join("/");
  const normalized = path.normalize(rel);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const filePath = uploadFilePath(normalized);
  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
