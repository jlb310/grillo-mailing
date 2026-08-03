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

  const templates = await prisma.template.findMany({
    where: effectiveOrgId ? { organizationId: effectiveOrgId } : {},
    include: { 
      organization: { select: { name: true } },
      createdBy: { select: { name: true, email: true } }
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { name, subject, htmlContent, textContent, organizationId } = body

    if (session.user.role !== UserRole.SUPERADMIN && body.organizationId && body.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "No tienes acceso a esta organización" }, { status: 403 })
    }

    const effectiveOrgId = getEffectiveOrganizationId(session, body.organizationId)
    if (!effectiveOrgId) {
      return NextResponse.json({ error: "Falta la organización" }, { status: 400 })
    }

    const template = await prisma.template.create({
      data: {
        name,
        subject,
        htmlContent,
        textContent,
        organizationId: effectiveOrgId,
        createdById: session.user.id,
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 })
  }
}
