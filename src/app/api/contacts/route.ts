import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { email, firstName, lastName, phone, company, organizationId, metadata } = body

    const contact = await prisma.contact.create({
      data: {
        email,
        firstName,
        lastName,
        phone,
        company,
        metadata: metadata ? JSON.stringify(metadata) : "{}",
        organizationId: organizationId || session.user.organizationId!,
      }
    })

    return NextResponse.json(contact)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 })
  }
}
