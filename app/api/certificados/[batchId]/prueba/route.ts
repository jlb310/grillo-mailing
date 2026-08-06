import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePdf } from "@/lib/pdf";
import { buildCertificateHtml } from "@/lib/certificate-template";
import { sendCertificateBuffer } from "@/lib/mailer";
import { isValidEmail } from "@/lib/csv";

// Sends a test certificate email (PDF attached) to an arbitrary address, using
// the first certificate of the batch as the sample content. Lets the operator
// preview the real email + PDF before releasing the whole batch.
export async function POST(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { batchId } = await params;
  const { email } = await req.json();

  if (typeof email !== "string" || !isValidEmail(email.trim())) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }

  const sample = await prisma.certificate.findFirst({
    where: { batchId },
    orderBy: { recipientName: "asc" },
  });
  if (!sample) return NextResponse.json({ error: "El lote no tiene certificados." }, { status: 404 });

  const data = {
    recipientName: sample.recipientName,
    activityTitle: sample.activityTitle,
    activityDate: sample.activityDate,
    role: sample.role,
  };

  try {
    const pdf = await generatePdf(buildCertificateHtml({ ...data, horas: sample.horas }), { landscape: true });
    await sendCertificateBuffer(email.trim(), data, pdf, { subjectPrefix: "[PRUEBA] " });
  } catch (err) {
    console.error("[certificates] test send failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error enviando la prueba." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, sentTo: email.trim() });
}
