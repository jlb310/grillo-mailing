import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get("email")
  const orgId = searchParams.get("org")

  if (!email || !orgId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
  }

  try {
    const contact = await prisma.contact.findFirst({
      where: {
        email,
        organizationId: orgId,
      },
    })

    if (contact) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { unsubscribed: true },
      })
    }

    return NextResponse.json({ success: true, message: "Has sido dado de baja exitosamente" })
  } catch (error) {
    console.error("Unsubscribe error:", error)
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 })
  }
}
