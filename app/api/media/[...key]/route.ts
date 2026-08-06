import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { uploadsDir } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  if (!key?.length) return new NextResponse("Not found", { status: 404 });

  const rel = path.join(...key);
  if (rel.includes("..") || path.isAbsolute(rel)) return new NextResponse("Forbidden", { status: 403 });

  const filePath = path.join(uploadsDir, rel);
  const buf = await fs.readFile(filePath).catch(() => null);
  if (!buf) return new NextResponse("Not found", { status: 404 });

  const ext = path.extname(filePath).toLowerCase();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
