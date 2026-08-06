import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidEmail } from "@/lib/csv";

interface IncomingRow {
  recipientName?: string;
  recipientEmail?: string;
  role?: string;
  horas?: number | string;
  activityTitle?: string;
  activityDate?: string;
}

// Lists certificate batches with per-status counts.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const batches = await prisma.certificateBatch.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      certificates: { select: { status: true } },
    },
  });

  return NextResponse.json(
    batches.map((b) => {
      const counts = { total: b.certificates.length, SENT: 0, FAILED: 0, PENDING: 0, GENERATING: 0 };
      for (const c of b.certificates) counts[c.status]++;
      return { id: b.id, name: b.name, status: b.status, createdAt: b.createdAt, counts };
    })
  );
}

// Creates a batch (DRAFT) from confirmed preview rows. Only rows with a valid
// email are persisted; the rest were flagged for the user in the preview.
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const name: string = (body.name ?? "").toString().trim() || "Certificados";
  const rows: IncomingRow[] = Array.isArray(body.rows) ? body.rows : [];

  const valid = rows
    .map((r) => ({
      recipientName: (r.recipientName ?? "").toString().trim(),
      recipientEmail: (r.recipientEmail ?? "").toString().trim().toLowerCase(),
      role: (r.role ?? "Asistente").toString().trim() || "Asistente",
      horas: parseInt(String(r.horas ?? "0").replace(/[^0-9]/g, ""), 10) || 0,
      activityTitle: (r.activityTitle ?? "").toString().trim(),
      activityDate: (r.activityDate ?? "").toString().trim(),
    }))
    .filter((r) => r.recipientName && isValidEmail(r.recipientEmail));

  if (valid.length === 0) {
    return NextResponse.json({ error: "No hay filas válidas para generar." }, { status: 400 });
  }

  const batch = await prisma.certificateBatch.create({
    data: {
      name,
      status: "DRAFT",
      certificates: { create: valid.map((r) => ({ ...r, status: "PENDING" as const })) },
    },
  });

  return NextResponse.json({ id: batch.id, created: valid.length });
}
