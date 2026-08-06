import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessEmpresa } from "@/lib/empresa";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: empresaId } = await params;
  if (!(await canAccessEmpresa(empresaId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const groups = await prisma.contactGroup.findMany({
    where: { empresaId },
    include: { _count: { select: { contacts: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(groups);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: empresaId } = await params;
  if (!(await canAccessEmpresa(empresaId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { name } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const group = await prisma.contactGroup.create({
    data: { empresaId, name: name.trim() },
    include: { _count: { select: { contacts: true } } },
  });

  return NextResponse.json(group, { status: 201 });
}
