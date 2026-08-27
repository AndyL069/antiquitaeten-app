import { mkdir, writeFile, rm } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

function extFor(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  return "webp";
}

export function assertUploadType(contentType: string, size: number) {
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw Object.assign(new Error("Nur PNG, JPEG oder WebP erlaubt"), { status: 415 });
  }
  if (size > MAX_UPLOAD_BYTES) {
    throw Object.assign(new Error("Bild darf max. 15 MB groß sein"), { status: 413 });
  }
}

export async function saveItemPhoto(itemId: string, bytes: Buffer, mimeType: string): Promise<string> {
  const dir = path.join(UPLOADS_ROOT, itemId);
  await mkdir(dir, { recursive: true });
  const rel = path.join(itemId, `${randomUUID()}.${extFor(mimeType)}`);
  await writeFile(path.join(UPLOADS_ROOT, rel), bytes);
  return rel;
}

export async function removePhotoFile(rel: string) {
  await rm(path.join(UPLOADS_ROOT, rel), { force: true });
}

export async function removeItemFiles(itemId: string) {
  await rm(path.join(UPLOADS_ROOT, itemId), { recursive: true, force: true });
}

export function uploadFilePath(rel: string): string {
  return path.join(UPLOADS_ROOT, rel);
}
