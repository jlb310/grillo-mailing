import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId, contactId } = await params;
  const body = await req.json();

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, eventId },
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.contact.update({
    where: { id: contactId },
    data: {
      ...(typeof body.attended === "boolean" ? { attended: body.attended } : {}),
    },
  });

  return NextResponse.json(updated);
}
