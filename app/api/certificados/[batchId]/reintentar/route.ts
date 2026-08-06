import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processBatch } from "@/lib/certificate-processor";

// Re-queues the FAILED certificates of a batch and re-kicks processing.
export async function POST(_req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { batchId } = await params;
  const reset = await prisma.certificate.updateMany({
    where: { batchId, status: "FAILED" },
    data: { status: "PENDING", error: null },
  });
  if (reset.count === 0) return NextResponse.json({ error: "No hay certificados fallidos." }, { status: 400 });

  await prisma.certificateBatch.update({ where: { id: batchId }, data: { status: "PROCESSING" } });
  processBatch(batchId); // fire and forget

  return NextResponse.json({ ok: true, retried: reset.count });
}
