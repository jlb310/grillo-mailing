import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { BASE_URL } from "@/lib/base-url";

// Local upload storage. Files live under the uploads root (mounted on persistent
// volumes in prod) and are served by the /api/media/[...key] route handler —
// this Next version does NOT serve files added to /public at runtime.
const UPLOADS_DIR = process.env.UPLOADS_PATH ?? path.join(process.cwd(), "public");
export const uploadsDir = UPLOADS_DIR;

export async function saveUpload(
  buffer: Buffer,
  originalName: string,
  _contentType: string,
  folder = "uploads"
): Promise<string> {
  const ext = path.extname(originalName) || ".bin";
  const safeFolder = folder.replace(/[^a-z0-9-_]/gi, "");
  const dir = path.join(UPLOADS_DIR, safeFolder);
  await fs.mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}${ext}`;
  await fs.writeFile(path.join(dir, filename), buffer);

  return `${BASE_URL}/api/media/${safeFolder}/${filename}`;
}
