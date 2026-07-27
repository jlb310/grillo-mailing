import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = session.user.role === "ADMIN"
  const orgId = session.user.organizationId

  const templates = await prisma.template.findMany({
    where: isAdmin ? {} : { organizationId: orgId! },
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

    const template = await prisma.template.create({
      data: {
        name,
        subject,
        htmlContent,
        textContent,
        organizationId: organizationId || session.user.organizationId!,
        createdById: session.user.id,
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 })
  }
}
