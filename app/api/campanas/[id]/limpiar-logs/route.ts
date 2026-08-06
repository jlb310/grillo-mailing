import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Deletes SendLog entries with no resendId (never actually sent to Resend).
// Leaves entries with resendId intact so we don't resend to those contacts.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, status: true },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (campaign.status === "SENDING") {
    return NextResponse.json({ error: "No se puede limpiar mientras está enviando" }, { status: 400 });
  }

  const { count } = await prisma.sendLog.deleteMany({
    where: { campaignId, resendId: null },
  });

  return NextResponse.json({ deleted: count });
}
