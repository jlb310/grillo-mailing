import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runSend } from "@/lib/send-campaign";
import { canAccessEmpresa } from "@/lib/empresa";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      empresa: { include: { contacts: { where: { unsubscribed: false, bounced: false } } } },
      contactGroups: { include: { contacts: { where: { unsubscribed: false, bounced: false } } } },
    },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canAccessEmpresa(campaign.empresaId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (campaign.status === "SENDING") {
    return NextResponse.json({ error: "Ya está en proceso de envío" }, { status: 400 });
  }

  const allContacts = campaign.contactGroups.length > 0
    ? Array.from(new Map(campaign.contactGroups.flatMap(g => g.contacts).map(c => [c.id, c])).values())
    : campaign.empresa.contacts;

  if (allContacts.length === 0) {
    return NextResponse.json({ error: "No hay contactos en esta empresa" }, { status: 400 });
  }

  const pending = await prisma.sendLog.count({ where: { campaignId, resendId: null } });
  const totalToSend = pending > 0 ? pending : allContacts.length;

  await prisma.campaign.update({ where: { id: campaignId }, data: { status: "SENDING" } });

  runSend(campaignId); // fire and forget

  return NextResponse.json({ started: true, total: totalToSend }, { status: 202 });
}

// Reset a stuck SENDING campaign back to DRAFT
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { status: true } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (campaign.status !== "SENDING") return NextResponse.json({ error: "La campaña no está en estado SENDING" }, { status: 400 });

  await prisma.campaign.update({ where: { id: campaignId }, data: { status: "DRAFT" } });
  return NextResponse.json({ ok: true });
}
