import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST { scheduledAt: ISO string } → set SCHEDULED
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: campaignId } = await params;
  const { scheduledAt } = await req.json();

  if (!scheduledAt) return NextResponse.json({ error: "scheduledAt requerido" }, { status: 400 });

  const date = new Date(scheduledAt);
  if (isNaN(date.getTime())) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  if (date <= new Date()) return NextResponse.json({ error: "La fecha debe ser en el futuro" }, { status: 400 });

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { status: true } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (campaign.status === "SENDING") return NextResponse.json({ error: "Ya está enviando" }, { status: 400 });
  if (campaign.status === "SENT") return NextResponse.json({ error: "Ya fue enviada" }, { status: 400 });

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "SCHEDULED", scheduledAt: date },
  });

  return NextResponse.json({ scheduled: true, scheduledAt: date.toISOString() });
}

// DELETE → cancel schedule, back to DRAFT
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { status: true } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (campaign.status !== "SCHEDULED") return NextResponse.json({ error: "La campaña no está programada" }, { status: 400 });

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "DRAFT", scheduledAt: null },
  });

  return NextResponse.json({ cancelled: true });
}
