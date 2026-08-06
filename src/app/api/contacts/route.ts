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

  const contacts = await prisma.contact.findMany({
    where: effectiveOrgId ? { organizationId: effectiveOrgId } : {},
    include: {
      lists: {
        include: {
          contactList: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(contacts)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { email, firstName, lastName, phone, company, metadata } = body

    if (session.user.role !== UserRole.SUPERADMIN && body.organizationId && body.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "No tienes acceso a esta organización" }, { status: 403 })
    }

    const effectiveOrgId = getEffectiveOrganizationId(session, body.organizationId)
    if (!effectiveOrgId) {
      return NextResponse.json({ error: "Falta la organización" }, { status: 400 })
    }

    const contact = await prisma.contact.create({
      data: {
        email,
        firstName,
        lastName,
        phone,
        company,
        metadata: metadata ? JSON.stringify(metadata) : "{}",
        organizationId: effectiveOrgId,
      }
    })

    return NextResponse.json(contact)
  } catch (error) {
    console.error("Create contact error:", error)
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 })
  }
}
