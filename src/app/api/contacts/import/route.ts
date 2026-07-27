import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { contacts: csvContacts } = body
    const orgId = session.user.organizationId!

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Create a default list for imports if none specified
    let defaultList = await prisma.contactList.findFirst({
      where: { name: "Importados", organizationId: orgId }
    })

    if (!defaultList) {
      defaultList = await prisma.contactList.create({
        data: { name: "Importados", description: "Contactos importados desde CSV", organizationId: orgId }
      })
    }

    for (const row of csvContacts) {
      const email = row.email || row.Email || row.EMAIL || ""
      const firstName = row.firstName || row.first_name || row.FirstName || row.nombre || ""
      const lastName = row.lastName || row.last_name || row.LastName || row.apellido || ""
      const phone = row.phone || row.phoneNumber || row.Phone || row.telefono || row.Telefono || ""
      const company = row.company || row.Company || row.empresa || row.Empresa || row.organization || row.Organization || ""

      if (!email || !email.includes("@")) {
        results.failed++
        results.errors.push(`Email inválido: ${email}`)
        continue
      }

      try {
        const existing = await prisma.contact.findUnique({
          where: { email_organizationId: { email, organizationId: orgId } }
        })

        if (existing) {
          await prisma.contact.update({
            where: { id: existing.id },
            data: { 
              firstName: firstName || existing.firstName, 
              lastName: lastName || existing.lastName,
              phone: phone || existing.phone,
              company: company || existing.company,
            }
          })
          results.updated++
        } else {
          const contact = await prisma.contact.create({
            data: {
              email,
              firstName,
              lastName,
              phone,
              company,
              organizationId: orgId,
            }
          })
          results.created++

          // Add to default list
          await prisma.contactListMember.create({
            data: {
              contactId: contact.id,
              contactListId: defaultList.id,
            }
          })
        }
      } catch (err) {
        results.failed++
        results.errors.push(`Error con ${email}: ${(err as Error).message}`)
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({ error: "Failed to import contacts" }, { status: 500 })
  }
}
