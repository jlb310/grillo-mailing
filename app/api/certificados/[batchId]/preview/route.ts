import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCertificateEmailHtml, buildCertificateHtml } from "@/lib/certificate-template";

// Returns the sample email body (first certificate of the batch) plus the
// sample cert id, so the detail page can preview both the email and the PDF
// before releasing the batch. The PDF itself is served by /cert/[certId].
export async function GET(_req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { batchId } = await params;
  const sample = await prisma.certificate.findFirst({
    where: { batchId },
    orderBy: { recipientName: "asc" },
  });
  if (!sample) return NextResponse.json({ error: "El lote no tiene certificados." }, { status: 404 });

  const emailHtml = buildCertificateEmailHtml({
    recipientName: sample.recipientName,
    activityTitle: sample.activityTitle,
    activityDate: sample.activityDate,
    role: sample.role,
  });
  // Same HTML the PDF is rendered from — previewed directly in an <iframe>
  // (srcDoc) so we don't depend on the browser rendering an embedded PDF.
  const certHtml = buildCertificateHtml({
    recipientName: sample.recipientName,
    activityTitle: sample.activityTitle,
    activityDate: sample.activityDate,
    role: sample.role,
    horas: sample.horas,
  });

  return NextResponse.json({
    certId: sample.id,
    recipientName: sample.recipientName,
    emailHtml,
    certHtml,
  });
}
