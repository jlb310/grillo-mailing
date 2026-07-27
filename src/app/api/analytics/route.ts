import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = session.user.role === "ADMIN"
  const orgId = session.user.organizationId

  const where = isAdmin ? {} : { organizationId: orgId! }

  const [campaigns, events] = await Promise.all([
    prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { events: true } },
      },
      take: 50,
    }),
    prisma.emailEvent.groupBy({
      by: ["type"],
      where: isAdmin ? {} : { campaign: { organizationId: orgId! } },
      _count: { type: true },
    }),
  ])

  // Get daily stats for the last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const dailyEvents = await prisma.emailEvent.findMany({
    where: {
      ...where,
      createdAt: { gte: thirtyDaysAgo },
    },
    select: {
      type: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  })

  // Group by date
  const dailyStatsMap = new Map<string, { sent: number; opened: number; clicked: number }>()
  
  for (const event of dailyEvents) {
    const date = event.createdAt.toISOString().split("T")[0]
    if (!dailyStatsMap.has(date)) {
      dailyStatsMap.set(date, { sent: 0, opened: 0, clicked: 0 })
    }
    const stats = dailyStatsMap.get(date)!
    if (event.type === "DELIVERED") stats.sent++
    if (event.type === "OPENED") stats.opened++
    if (event.type === "CLICKED") stats.clicked++
  }

  // Fill in empty days
  for (let i = 0; i < 30; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split("T")[0]
    if (!dailyStatsMap.has(dateStr)) {
      dailyStatsMap.set(dateStr, { sent: 0, opened: 0, clicked: 0 })
    }
  }

  const dailyStats = Array.from(dailyStatsMap.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({
    campaigns,
    events: events.map((e) => ({ type: e.type, count: e._count.type })),
    dailyStats,
  })
}
