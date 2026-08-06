import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadToS3 } from "@/lib/s3";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "application/pdf"];
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string | null) ?? "uploads";

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "Archivo demasiado grande (máx 5MB)" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadToS3(buffer, file.name, file.type, folder);

  return NextResponse.json({ url });
}
