import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessEmpresa } from "@/lib/empresa";
import { parseContacts } from "@/lib/csv";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: empresaId, groupId } = await params;
  if (!(await canAccessEmpresa(empresaId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const group = await prisma.contactGroup.findFirst({
    where: { id: groupId, empresaId },
    include: {
      contacts: { orderBy: { name: "asc" } },
    },
  });

  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(group.contacts);
}

export async function POST(
  req: Request,
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

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const { contacts: parsed, invalid } = parseContacts(buffer, file.name);

  // Upsert contacts into the empresa, then connect to group
  const results = await Promise.all(
    parsed.map((c) =>
      prisma.contact.upsert({
        where: { empresaId_email: { empresaId, email: c.email } },
        update: {},
        create: { empresaId, email: c.email, name: c.name },
      })
    )
  );

  await prisma.contactGroup.update({
    where: { id: groupId },
    data: { contacts: { connect: results.map((c) => ({ id: c.id })) } },
  });

  return NextResponse.json({ imported: results.length, invalid });
}
