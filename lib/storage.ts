import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { BASE_URL } from "@/lib/base-url";

// Local upload storage served publicly from /public. The compose mounts
// persistent volumes on the subfolders (logos, programas, uploads) so files
// survive redeploys — same approach as certificates (CERTIFICATES_PATH).
const UPLOADS_DIR = process.env.UPLOADS_PATH ?? path.join(process.cwd(), "public");
const PUBLIC_BASE = process.env.PUBLIC_BASE_URL ?? BASE_URL;

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

  return `${PUBLIC_BASE}/${safeFolder}/${filename}`;
}
