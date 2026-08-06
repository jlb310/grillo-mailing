import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, getEffectiveOrganizationId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const requestedOrgId = searchParams.get("organizationId")
  const effectiveOrgId = getEffectiveOrganizationId(session, requestedOrgId)

  const campaigns = await prisma.campaign.findMany({
    where: effectiveOrgId ? { organizationId: effectiveOrgId } : {},
    include: {
      domain: { select: { name: true } },
      contactList: { select: { name: true } },
      template: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(campaigns)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { name, subject, htmlContent, textContent, blocks, fromName, fromEmail, replyTo, domainId, contactListId, templateId, scheduledAt, status } = body

    if (session.user.role !== UserRole.SUPERADMIN && body.organizationId && body.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "No tienes acceso a esta organización" }, { status: 403 })
    }

    const effectiveOrgId = getEffectiveOrganizationId(session, body.organizationId)
    if (!effectiveOrgId) {
      return NextResponse.json({ error: "Falta la organización" }, { status: 400 })
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        subject,
        htmlContent,
        textContent,
        blocks: Array.isArray(blocks) ? blocks : undefined,
        fromName,
        fromEmail,
        replyTo,
        domainId,
        contactListId,
        templateId,
        organizationId: effectiveOrgId,
        createdById: session.user.id,
        status: status || "DRAFT",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      }
    })

    return NextResponse.json(campaign)
  } catch (error) {
    console.error("Create campaign error:", error)
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 })
  }
}
