import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseContacts } from "@/lib/csv";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;

  const ungrouped = await prisma.contact.findMany({
    where: { eventId, groups: { none: {} } },
    select: { id: true },
  });
  const ids = ungrouped.map((c) => c.id);

  if (ids.length === 0) return NextResponse.json({ deleted: 0 });

  await prisma.$transaction([
    prisma.sendLog.deleteMany({ where: { contactId: { in: ids } } }),
    prisma.contact.deleteMany({ where: { id: { in: ids } } }),
  ]);

  return NextResponse.json({ deleted: ids.length });
}

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
  const { contacts, invalid } = parseContacts(buffer, file.name);

  const result = await prisma.contact.createMany({
    data: contacts.map((c) => ({ eventId, email: c.email, name: c.name })),
    skipDuplicates: true,
  });

  return NextResponse.json({
    imported: result.count,
    duplicates: contacts.length - result.count,
    invalid,
  });
}
