import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/empresa";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = isSuperAdmin(session)
    ? {}
    : { id: session.user.empresaId ?? "__none__" };

  const empresas = await prisma.empresa.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { contacts: true, campaigns: true } } },
  });

  return NextResponse.json(empresas);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(session)) {
    return NextResponse.json({ error: "Solo el super admin puede crear empresas" }, { status: 403 });
  }

  const body = await req.json();
  const name = (body.name ?? "").toString().trim();
  if (!name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const slug = (body.slug ?? "").toString().trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (!slug) return NextResponse.json({ error: "Slug requerido (solo letras minúsculas, números y guiones)" }, { status: 400 });

  const exists = await prisma.empresa.findUnique({ where: { slug } });
  if (exists) return NextResponse.json({ error: "Ya existe una empresa con ese slug" }, { status: 409 });

  const empresa = await prisma.empresa.create({
    data: {
      name,
      slug,
      description: body.description?.toString().trim() || null,
    },
  });

  return NextResponse.json(empresa, { status: 201 });
}
