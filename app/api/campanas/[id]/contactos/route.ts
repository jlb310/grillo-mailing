import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseContacts } from "@/lib/csv";
import { canAccessEmpresa } from "@/lib/empresa";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canAccessEmpresa(campaign.empresaId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let contacts, invalid;
  try {
    ({ contacts, invalid } = parseContacts(buffer, file.name));
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo. Revisa que sea un CSV o Excel válido." }, { status: 400 });
  }

  const result = await prisma.contact.createMany({
    data: contacts.map((c) => ({
      empresaId: campaign.empresaId,
      email: c.email,
      name: c.name,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({
    imported: result.count,
    duplicates: contacts.length - result.count,
    invalid,
  });
}
