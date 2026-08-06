import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePdf } from "@/lib/pdf";
import { buildCertificateHtml } from "@/lib/certificate-template";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Regenerates and returns a single certificate PDF on demand (not stored).
// `?inline=1` serves it with `Content-Disposition: inline` so it renders inside
// an <iframe> (the preview modal); the default is `attachment` (download).
export async function GET(req: Request, { params }: { params: Promise<{ certId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const inline = new URL(req.url).searchParams.get("inline") === "1";
  const { certId } = await params;
  const cert = await prisma.certificate.findUnique({ where: { id: certId } });
  if (!cert) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const html = buildCertificateHtml({
    recipientName: cert.recipientName,
    activityTitle: cert.activityTitle,
    activityDate: cert.activityDate,
    role: cert.role,
    horas: cert.horas,
  });

  const pdf = await generatePdf(html, { landscape: true });
  const filename = `certificado-${slugify(cert.recipientName)}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
    },
  });
}

// Removes a single recipient from a batch.
export async function DELETE(_req: Request, { params }: { params: Promise<{ certId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { certId } = await params;
  await prisma.certificate.delete({ where: { id: certId } });
  return NextResponse.json({ ok: true });
}
