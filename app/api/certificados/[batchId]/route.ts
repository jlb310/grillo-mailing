import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProcessing } from "@/lib/certificate-processor";

// Batch detail + per-recipient rows + progress (polled by the detail page).
export async function GET(_req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { batchId } = await params;
  const batch = await prisma.certificateBatch.findUnique({
    where: { id: batchId },
    include: { certificates: { orderBy: { recipientName: "asc" } } },
  });
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const counts = { total: batch.certificates.length, SENT: 0, FAILED: 0, PENDING: 0, GENERATING: 0, OPENED: 0 };
  for (const c of batch.certificates) {
    counts[c.status]++;
    if (c.openedAt) counts.OPENED++;
  }

  return NextResponse.json({
    id: batch.id,
    name: batch.name,
    status: batch.status,
    scheduledAt: batch.scheduledAt,
    createdAt: batch.createdAt,
    processing: isProcessing(batch.id),
    counts,
    certificates: batch.certificates.map((c) => ({
      id: c.id,
      recipientName: c.recipientName,
      recipientEmail: c.recipientEmail,
      role: c.role,
      horas: c.horas,
      activityTitle: c.activityTitle,
      activityDate: c.activityDate,
      status: c.status,
      sentAt: c.sentAt,
      openedAt: c.openedAt,
      error: c.error,
    })),
  });
}

// Deletes a batch (certificates cascade).
export async function DELETE(_req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { batchId } = await params;
  await prisma.certificateBatch.delete({ where: { id: batchId } });
  return NextResponse.json({ ok: true });
}
