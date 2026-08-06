import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processBatch } from "@/lib/certificate-processor";

// Releases a batch for processing: marks it PROCESSING and kicks off background
// generation + emailing (fire-and-forget on the long-lived Node server). The
// detail page then polls GET /api/certificados/[batchId] for progress.
export async function POST(_req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { batchId } = await params;
  const batch = await prisma.certificateBatch.findUnique({ where: { id: batchId } });
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pending = await prisma.certificate.count({
    where: { batchId, status: { in: ["PENDING", "GENERATING"] } },
  });
  if (pending === 0) return NextResponse.json({ error: "No hay certificados pendientes." }, { status: 400 });

  await prisma.certificateBatch.update({ where: { id: batchId }, data: { status: "PROCESSING" } });
  processBatch(batchId); // fire and forget

  return NextResponse.json({ ok: true, pending });
}
