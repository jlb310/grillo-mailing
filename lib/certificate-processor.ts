import { prisma } from "@/lib/prisma";
import { generatePdfBatch } from "@/lib/pdf";
import { buildCertificateHtml } from "@/lib/certificate-template";
import { sendCertificateBuffer } from "@/lib/mailer";

// Background generation + emailing of a certificate batch. Runs in-process on the
// long-lived Node server (Docker/Dokploy) — kicked off fire-and-forget by the
// "enviar" route and resumed on boot by the scheduler. Not for serverless.

const CHUNK = 20; // PDFs per browser launch — balances memory vs. launch overhead
const SEND_DELAY_MS = 220; // throttle between emails to stay under Resend rate limits

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// In-memory guard so a batch isn't processed by two overlapping runs (e.g. the
// enviar route and the boot-time resume firing close together).
const running = new Set<string>();

export function isProcessing(batchId: string): boolean {
  return running.has(batchId);
}

export async function processBatch(batchId: string): Promise<void> {
  if (running.has(batchId)) return;
  running.add(batchId);

  try {
    await prisma.certificateBatch.update({
      where: { id: batchId },
      data: { status: "PROCESSING" },
    }).catch(() => {});

    // Process PENDING certs in chunks until none remain.
    for (;;) {
      const pending = await prisma.certificate.findMany({
        where: { batchId, status: "PENDING" },
        take: CHUNK,
      });
      if (pending.length === 0) break;

      await prisma.certificate.updateMany({
        where: { id: { in: pending.map((c) => c.id) } },
        data: { status: "GENERATING" },
      });

      const rendered = await generatePdfBatch(
        pending,
        (c) => buildCertificateHtml({
          recipientName: c.recipientName,
          activityTitle: c.activityTitle,
          activityDate: c.activityDate,
          role: c.role,
          horas: c.horas,
        }),
        { landscape: true }
      );

      for (const { item: cert, pdf, error } of rendered) {
        try {
          if (!pdf) throw new Error(error ?? "PDF generation failed");
          const resendId = await sendCertificateBuffer(cert.recipientEmail, {
            recipientName: cert.recipientName,
            activityTitle: cert.activityTitle,
            activityDate: cert.activityDate,
            role: cert.role,
          }, pdf);
          await prisma.certificate.update({
            where: { id: cert.id },
            data: { status: "SENT", sentAt: new Date(), error: null, resendId },
          });
          await sleep(SEND_DELAY_MS);
        } catch (err) {
          console.error(`[certificates] cert ${cert.id} failed:`, err);
          await prisma.certificate.update({
            where: { id: cert.id },
            data: { status: "FAILED", error: err instanceof Error ? err.message : String(err) },
          });
        }
      }
    }

    // Mark the batch done once nothing is left pending/generating.
    const remaining = await prisma.certificate.count({
      where: { batchId, status: { in: ["PENDING", "GENERATING"] } },
    });
    if (remaining === 0) {
      await prisma.certificateBatch.update({ where: { id: batchId }, data: { status: "DONE" } });
    }
  } catch (err) {
    console.error(`[certificates] batch ${batchId} processing error:`, err);
  } finally {
    running.delete(batchId);
  }
}

// Resumes any batch left mid-flight by a restart: certs stuck in GENERATING are
// reset to PENDING, then PROCESSING batches with pending work are re-kicked.
export async function resumeCertificateBatches(): Promise<void> {
  try {
    await prisma.certificate.updateMany({
      where: { status: "GENERATING" },
      data: { status: "PENDING" },
    });
    const batches = await prisma.certificateBatch.findMany({
      where: { status: "PROCESSING" },
      select: { id: true },
    });
    for (const b of batches) {
      const pending = await prisma.certificate.count({ where: { batchId: b.id, status: "PENDING" } });
      if (pending > 0) processBatch(b.id); // fire and forget
      else await prisma.certificateBatch.update({ where: { id: b.id }, data: { status: "DONE" } });
    }
  } catch (err) {
    console.error("[certificates] resume error:", err);
  }
}
