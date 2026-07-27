import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = session.user.role === "ADMIN"
  const orgId = session.user.organizationId

  const lists = await prisma.contactList.findMany({
    where: isAdmin ? {} : { organizationId: orgId! },
    include: {
      _count: { select: { members: true } }
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(lists)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { name, description, organizationId } = body

    const list = await prisma.contactList.create({
      data: {
        name,
        description,
        organizationId: organizationId || session.user.organizationId!,
      }
    })

    return NextResponse.json(list)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create list" }, { status: 500 })
  }
}
