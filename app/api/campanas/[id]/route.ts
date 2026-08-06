import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildEmailHtml } from "@/lib/email-builder";
import { canAccessEmpresa } from "@/lib/empresa";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      empresa: true,
      sendLogs: {
        include: { contact: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canAccessEmpresa(campaign.empresaId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const total      = campaign.sendLogs.length;
  const sentCount  = campaign.sendLogs.filter(l => l.resendId).length;
  const opens      = campaign.sendLogs.filter(l => l.openedAt).length;
  const clicks     = campaign.sendLogs.filter(l => l.clickedAt).length;
  const bounces    = campaign.sendLogs.filter(l => l.bouncedAt).length;
  const unsubs     = campaign.sendLogs.filter(l => l.contact.unsubscribed).length;

  return NextResponse.json({
    ...campaign,
    metrics: {
      total,
      sentCount,
      pendingCount: total - sentCount,
      opens,
      clicks,
      bounces,
      unsubs,
      openRate:   total > 0 ? Math.round((opens   / total) * 100) : 0,
      clickRate:  total > 0 ? Math.round((clicks  / total) * 100) : 0,
      bounceRate: total > 0 ? Math.round((bounces / total) * 100) : 0,
    },
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.campaign.findUnique({ where: { id }, select: { empresaId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canAccessEmpresa(existing.empresaId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const htmlBody = body.htmlBody ?? buildEmailHtml(body);

  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      subject: body.subject || body.emailTitle,
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
      status: body.status,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    },
  });

  return NextResponse.json(campaign);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.campaign.findUnique({ where: { id }, select: { empresaId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canAccessEmpresa(existing.empresaId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const campaign = await prisma.campaign.update({
    where: { id },
    data: { notifyEmails: body.notifyEmails },
  });

  return NextResponse.json({ notifyEmails: campaign.notifyEmails });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.campaign.findUnique({ where: { id }, select: { empresaId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canAccessEmpresa(existing.empresaId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
