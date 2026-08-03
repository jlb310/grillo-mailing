import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canAccessOrganization } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const list = await prisma.contactList.findUnique({ where: { id } })
    if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 })

    if (!canAccessOrganization(session, list.organizationId)) {
      return NextResponse.json({ error: "No tienes acceso a esta lista" }, { status: 403 })
    }

    const body = await req.json()
    const { contactIds } = body

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: "Faltan contactIds" }, { status: 400 })
    }

    // Verificar que todos los contactos pertenecen a la misma org
    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds }, organizationId: list.organizationId },
    })

    if (contacts.length !== contactIds.length) {
      return NextResponse.json(
        { error: "Algunos contactos no existen o no pertenecen a esta organización" },
        { status: 400 }
      )
    }

    // Crear members (ignorar duplicados)
    const data = await prisma.$transaction(
      contactIds.map((contactId: string) =>
        prisma.contactListMember.upsert({
          where: {
            contactId_contactListId: {
              contactId,
              contactListId: id,
            },
          },
          update: {},
          create: {
            contactId,
            contactListId: id,
          },
        })
      )
    )

    return NextResponse.json({ added: data.length })
  } catch (error) {
    console.error("Add to list error:", error)
    return NextResponse.json({ error: "Failed to add contacts to list" }, { status: 500 })
  }
}
