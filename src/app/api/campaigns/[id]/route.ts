import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canAccessOrganization } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

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

  // Solo se tocan los campos presentes en el body: el detalle envía por separado
  // los datos principales y el contenido del editor visual.
  const data: Prisma.CampaignUpdateInput = {}
  if (body.name !== undefined) data.name = body.name
  if (body.subject !== undefined) data.subject = body.subject
  if (body.fromName !== undefined) data.fromName = body.fromName
  if (body.fromEmail !== undefined) data.fromEmail = body.fromEmail
  if (body.replyTo !== undefined) data.replyTo = body.replyTo || null
  if (body.htmlContent !== undefined) data.htmlContent = body.htmlContent
  if (body.textContent !== undefined) data.textContent = body.textContent
  if (Array.isArray(body.blocks)) data.blocks = body.blocks

  const updated = await prisma.campaign.update({ where: { id }, data })

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
      blocks: campaign.blocks ?? Prisma.DbNull,
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
