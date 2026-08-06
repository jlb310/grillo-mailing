import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canAccessOrganization } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      domain: { select: { id: true, name: true } },
      contactList: { include: { _count: { select: { members: true } } } },
      template: { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
      events: { orderBy: { createdAt: "desc" } },
    },
  })

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!canAccessOrganization(session, campaign.organizationId)) {
    return NextResponse.json({ error: "No tienes acceso a esta campaña" }, { status: 403 })
  }

  return NextResponse.json(campaign)
}
