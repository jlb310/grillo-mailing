import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = session.user.role === "ADMIN"
  const orgId = session.user.organizationId

  const domains = await prisma.domain.findMany({
    where: isAdmin ? {} : { organizationId: orgId! },
    include: { organization: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(domains)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, organizationId } = body

    const domain = await prisma.domain.create({
      data: {
        name,
        organizationId,
        status: "PENDING",
      }
    })

    return NextResponse.json(domain)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create domain" }, { status: 500 })
  }
}
