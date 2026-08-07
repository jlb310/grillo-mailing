import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessEmpresa, isSuperAdmin } from "@/lib/empresa";
import { encrypt } from "@/lib/crypto";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await canAccessEmpresa(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { name: "asc" } },
      campaigns: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { sendLogs: true } } },
      },
      contactGroups: {
        include: { _count: { select: { contacts: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!empresa) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Never send encrypted secrets to the browser — booleans are enough for the UI.
  const { resendApiKeyEncrypted, resendWebhookSecretEncrypted, ...safe } = empresa;
  return NextResponse.json({
    ...safe,
    resendApiKeyConfigured: !!resendApiKeyEncrypted,
    resendWebhookSecretConfigured: !!resendWebhookSecretEncrypted,
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(session)) {
    return NextResponse.json({ error: "Solo el super admin puede editar empresas" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const exists = await prisma.empresa.findUnique({ where: { id } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const name = (body.name ?? exists.name).toString().trim();
  if (!name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  // resendApiKey / resendWebhookSecret: undefined = leave untouched (never sent
  // back to the browser, so "untouched" is the only way to keep it across an
  // edit that isn't rotating it); "" explicitly clears it; anything else re-encrypts.
  const resendApiKeyEncrypted = body.resendApiKey === undefined
    ? exists.resendApiKeyEncrypted
    : body.resendApiKey.toString().trim()
      ? encrypt(body.resendApiKey.toString().trim())
      : null;
  const resendWebhookSecretEncrypted = body.resendWebhookSecret === undefined
    ? exists.resendWebhookSecretEncrypted
    : body.resendWebhookSecret.toString().trim()
      ? encrypt(body.resendWebhookSecret.toString().trim())
      : null;

  const empresa = await prisma.empresa.update({
    where: { id },
    data: {
      name,
      description: body.description !== undefined ? (body.description?.toString().trim() || null) : exists.description,
      resendApiKeyEncrypted,
      resendFromName: body.resendFromName !== undefined ? (body.resendFromName?.toString().trim() || null) : exists.resendFromName,
      resendFromEmail: body.resendFromEmail !== undefined ? (body.resendFromEmail?.toString().trim() || null) : exists.resendFromEmail,
      resendWebhookSecretEncrypted,
    },
  });

  return NextResponse.json({
    ...empresa,
    resendApiKeyEncrypted: undefined,
    resendWebhookSecretEncrypted: undefined,
    resendApiKeyConfigured: !!empresa.resendApiKeyEncrypted,
    resendWebhookSecretConfigured: !!empresa.resendWebhookSecretEncrypted,
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(session)) {
    return NextResponse.json({ error: "Solo el super admin puede eliminar empresas" }, { status: 403 });
  }

  const { id } = await params;
  const exists = await prisma.empresa.findUnique({ where: { id } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.sendLog.deleteMany({ where: { campaign: { empresaId: id } } }),
    prisma.scheduledSend.deleteMany({ where: { campaign: { empresaId: id } } }),
    prisma.contactGroup.deleteMany({ where: { empresaId: id } }),
    prisma.contact.deleteMany({ where: { empresaId: id } }),
    prisma.campaign.deleteMany({ where: { empresaId: id } }),
  ]);

  await prisma.empresa.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
