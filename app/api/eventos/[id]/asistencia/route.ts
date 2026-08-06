import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseContacts } from "@/lib/csv";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const { contacts: rows } = parseContacts(buffer, file.name);

  const emailsInFile = rows.map((r) => r.email.toLowerCase());

  // Find existing contacts in this event matching those emails
  const existingContacts = await prisma.contact.findMany({
    where: { eventId },
    select: { id: true, email: true },
  });

  const notFound: string[] = [];
  const toMarkIds: string[] = [];

  for (const email of emailsInFile) {
    const contact = existingContacts.find((c) => c.email.toLowerCase() === email);
    if (contact) {
      toMarkIds.push(contact.id);
    } else {
      notFound.push(email);
    }
  }

  if (toMarkIds.length > 0) {
    await prisma.contact.updateMany({
      where: { id: { in: toMarkIds } },
      data: { attended: true },
    });
  }

  return NextResponse.json({ marked: toMarkIds.length, notFound });
}
