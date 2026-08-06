import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;

  const groups = await prisma.contactGroup.findMany({
    where: { eventId },
    include: { _count: { select: { contacts: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(groups);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  const { name } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const group = await prisma.contactGroup.create({
    data: { eventId, name: name.trim() },
    include: { _count: { select: { contacts: true } } },
  });

  return NextResponse.json(group, { status: 201 });
}
