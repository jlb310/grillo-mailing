import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseCertificates } from "@/lib/certificate-csv";

// Parses an uploaded CSV/XLSX and returns the recipient rows for preview.
// Stateless — nothing is persisted until the user confirms via POST /api/certificados.
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const { rows, suggestedName } = parseCertificates(buffer, file.name);

  return NextResponse.json({
    rows,
    suggestedName: suggestedName || file.name.replace(/\.[^.]+$/, ""),
    total: rows.length,
    valid: rows.filter((r) => r.valid).length,
    invalid: rows.filter((r) => !r.valid).length,
  });
}
