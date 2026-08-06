import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessEmpresa } from "@/lib/empresa";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: empresaId, groupId } = await params;
  if (!(await canAccessEmpresa(empresaId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const group = await prisma.contactGroup.findFirst({ where: { id: groupId, empresaId } });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.contactGroup.delete({ where: { id: groupId } });

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: empresaId, groupId } = await params;
  if (!(await canAccessEmpresa(empresaId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { name } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const group = await prisma.contactGroup.findFirst({ where: { id: groupId, empresaId } });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.contactGroup.update({
    where: { id: groupId },
    data: { name: name.trim() },
    include: { _count: { select: { contacts: true } } },
  });

  return NextResponse.json(updated);
}
