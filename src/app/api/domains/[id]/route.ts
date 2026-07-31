import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { syncDomainWithResend } from "@/lib/domains"
import { ResendConfigError } from "@/lib/resend"

/** Ficha del dominio con sus registros DNS al día, tal como los ve Resend. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const domain = await prisma.domain.findUnique({ where: { id } })
  if (!domain) {
    return NextResponse.json({ error: "Dominio no encontrado" }, { status: 404 })
  }

  if (
    session.user.role !== "ADMIN" &&
    domain.organizationId !== session.user.organizationId
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    return NextResponse.json(await syncDomainWithResend(domain))
  } catch (error) {
    if (error instanceof ResendConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    console.error("[domains] consulta fallida", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error consultando Resend" },
      { status: 502 }
    )
  }
}
