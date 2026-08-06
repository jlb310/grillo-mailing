import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { contactGroups: { include: { _count: { select: { contacts: true } } } } },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(campaign.contactGroups);
}

// PUT replaces the full group selection for the campaign
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: campaignId } = await params;
  const { groupIds } = await req.json() as { groupIds: string[] };

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: { contactGroups: { set: groupIds.map((id) => ({ id })) } },
    include: { contactGroups: { include: { _count: { select: { contacts: true } } } } },
  });

  return NextResponse.json(updated.contactGroups);
}
