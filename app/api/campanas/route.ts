import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildEmailHtml } from "@/lib/email-builder";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      event: { select: { title: true } },
      _count: { select: { sendLogs: true } },
      sendLogs: {
        select: { openedAt: true, clickedAt: true },
      },
    },
  });

  const result = campaigns.map((c) => {
    const total = c._count.sendLogs;
    const opens = c.sendLogs.filter((l) => l.openedAt).length;
    const clicks = c.sendLogs.filter((l) => l.clickedAt).length;
    return {
      ...c,
      sendLogs: undefined,
      metrics: {
        total,
        openRate: total > 0 ? Math.round((opens / total) * 100) : 0,
        clickRate: total > 0 ? Math.round((clicks / total) * 100) : 0,
      },
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const htmlBody = body.htmlBody ?? buildEmailHtml(body);

  const campaign = await prisma.campaign.create({
    data: {
      eventId: body.eventId,
      subject: body.subject || body.emailTitle || "Sin asunto",
      htmlBody,
      emailTitle: body.emailTitle,
      emailSubtitle: body.emailSubtitle,
      emailDate: body.emailDate,
      emailLocation: body.emailLocation,
      emailBody: body.emailBody,
      ctaText: body.ctaText,
      ctaUrl: body.ctaUrl,
      logoUrl: body.logoUrl,
      logoHeight: body.logoHeight,
      logoAlign: body.logoAlign,
      logoRightUrl: body.logoRightUrl,
      logoRightHeight: body.logoRightHeight,
      logoRight2Url: body.logoRight2Url,
      logoRight2Height: body.logoRight2Height,
      headerColor: body.headerColor,
      footerText: body.footerText,
      blocks: body.blocks ?? undefined,
      ctaButtons: body.ctaButtons ?? undefined,
      programaUrl: body.programaUrl,
      iconDate: body.iconDate,
      iconLinkText: body.iconLinkText,
      iconLinkUrl: body.iconLinkUrl,
      useAlemanaFooter: body.useAlemanaFooter ?? undefined,
      eventInfoButtons: body.eventInfoButtons ?? undefined,
    },
  });

  return NextResponse.json(campaign, { status: 201 });
}
