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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const campaign = await prisma.campaign.findUnique({ where: { id } })
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!canAccessOrganization(session, campaign.organizationId)) {
    return NextResponse.json({ error: "No tienes acceso a esta campaña" }, { status: 403 })
  }
  if (campaign.status === "SENDING" || campaign.status === "SENT") {
    return NextResponse.json({ error: "No se puede editar una campaña enviada o en proceso de envío" }, { status: 400 })
  }

  const body = await req.json()
  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      name: body.name,
      subject: body.subject,
      fromName: body.fromName,
      fromEmail: body.fromEmail,
      replyTo: body.replyTo || null,
    },
  })

  return NextResponse.json(updated)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const campaign = await prisma.campaign.findUnique({ where: { id } })
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!canAccessOrganization(session, campaign.organizationId)) {
    return NextResponse.json({ error: "No tienes acceso a esta campaña" }, { status: 403 })
  }

  const duplicate = await prisma.campaign.create({
    data: {
      name: `${campaign.name} (copia)`,
      subject: campaign.subject,
      htmlContent: campaign.htmlContent,
      textContent: campaign.textContent,
      fromName: campaign.fromName,
      fromEmail: campaign.fromEmail,
      replyTo: campaign.replyTo,
      domainId: campaign.domainId,
      contactListId: campaign.contactListId,
      templateId: campaign.templateId,
      organizationId: campaign.organizationId,
      createdById: session.user.id,
      status: "DRAFT",
    },
  })

  return NextResponse.json(duplicate)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const campaign = await prisma.campaign.findUnique({ where: { id } })
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!canAccessOrganization(session, campaign.organizationId)) {
    return NextResponse.json({ error: "No tienes acceso a esta campaña" }, { status: 403 })
  }
  if (campaign.status === "SENDING") {
    return NextResponse.json({ error: "No se puede eliminar una campaña en proceso de envío" }, { status: 400 })
  }

  await prisma.$transaction([
    prisma.emailEvent.deleteMany({ where: { campaignId: id } }),
    prisma.campaign.delete({ where: { id } }),
  ])

  return NextResponse.json({ success: true })
}
