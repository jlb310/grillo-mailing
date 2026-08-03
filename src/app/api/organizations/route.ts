import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // `select` explícito, no `include`: con include se irían al navegador las
  // columnas resendApiKey/resendWebhookSecret. Van cifradas, pero un secreto
  // cifrado tampoco tiene nada que hacer en el cliente.
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logo: true,
      brandColor: true,
      createdAt: true,
      updatedAt: true,
      resendApiKey: true,
      resendWebhookSecret: true,
      _count: {
        select: { users: true, domains: true, campaigns: true }
      }
    }
  })

  return NextResponse.json(
    organizations.map(({ resendApiKey, resendWebhookSecret, ...org }) => ({
      ...org,
      hasResendApiKey: Boolean(resendApiKey),
      hasResendWebhookSecret: Boolean(resendWebhookSecret),
    }))
  )
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, slug, description } = body

    const organization = await prisma.organization.create({
      data: { name, slug, description }
    })

    return NextResponse.json(organization)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 })
  }
}
