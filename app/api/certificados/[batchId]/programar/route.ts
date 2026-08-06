import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Schedules (or cancels the schedule of) a certificate batch. The scheduler
// (lib/scheduler.ts) releases it for processing once scheduledAt is due.
// Body: { scheduledAt: ISO string } to schedule, or { scheduledAt: null } to cancel.
export async function POST(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { batchId } = await params;
  const { scheduledAt } = await req.json();

  const batch = await prisma.certificateBatch.findUnique({ where: { id: batchId } });
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (batch.status === "PROCESSING" || batch.status === "DONE") {
    return NextResponse.json({ error: "El lote ya está en proceso o finalizado." }, { status: 400 });
  }

  // Cancel: revert to DRAFT.
  if (scheduledAt === null || scheduledAt === undefined) {
    await prisma.certificateBatch.update({
      where: { id: batchId },
      data: { status: "DRAFT", scheduledAt: null },
    });
    return NextResponse.json({ ok: true, status: "DRAFT" });
  }

  const when = new Date(scheduledAt);
  if (isNaN(when.getTime())) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }
  if (when.getTime() <= Date.now()) {
    return NextResponse.json({ error: "La fecha debe ser futura." }, { status: 400 });
  }

  const pending = await prisma.certificate.count({
    where: { batchId, status: { in: ["PENDING", "GENERATING"] } },
  });
  if (pending === 0) {
    return NextResponse.json({ error: "No hay certificados pendientes." }, { status: 400 });
  }

  await prisma.certificateBatch.update({
    where: { id: batchId },
    data: { status: "SCHEDULED", scheduledAt: when },
  });

  return NextResponse.json({ ok: true, status: "SCHEDULED", scheduledAt: when.toISOString() });
}
