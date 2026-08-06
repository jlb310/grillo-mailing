import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const src = await prisma.campaign.findUnique({
    where: { id },
    include: { contactGroups: { select: { id: true } } },
  });
  if (!src) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const clone = await prisma.campaign.create({
    data: {
      eventId:      src.eventId,
      subject:      `${src.subject} (copia)`,
      htmlBody:     src.htmlBody,
      emailTitle:   src.emailTitle,
      emailSubtitle: src.emailSubtitle,
      emailDate:    src.emailDate,
      emailLocation: src.emailLocation,
      emailBody:    src.emailBody,
      ctaText:      src.ctaText,
      ctaUrl:       src.ctaUrl,
      logoUrl:      src.logoUrl,
      logoHeight:   src.logoHeight,
      logoAlign:    src.logoAlign,
      headerColor:  src.headerColor,
      footerText:   src.footerText,
      blocks:       src.blocks ?? undefined,
      ctaButtons:   src.ctaButtons ?? undefined,
      programaUrl:  src.programaUrl,
      iconDate:     src.iconDate,
      iconLinkText: src.iconLinkText,
      iconLinkUrl:  src.iconLinkUrl,
      notifyEmails: src.notifyEmails,
      status:       "DRAFT",
      contactGroups: { connect: src.contactGroups.map(g => ({ id: g.id })) },
    },
  });

  return NextResponse.json({ id: clone.id }, { status: 201 });
}
