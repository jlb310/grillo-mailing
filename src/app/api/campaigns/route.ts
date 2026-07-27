import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { name, subject, htmlContent, textContent, fromName, fromEmail, replyTo, domainId, contactListId, templateId, organizationId, scheduledAt, status } = body

    const campaign = await prisma.campaign.create({
      data: {
        name,
        subject,
        htmlContent,
        textContent,
        fromName,
        fromEmail,
        replyTo,
        domainId,
        contactListId,
        templateId,
        organizationId: organizationId || session.user.organizationId!,
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
