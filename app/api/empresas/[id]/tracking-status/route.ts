import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessEmpresa } from "@/lib/empresa";
import { decrypt } from "@/lib/crypto";
import { getTrackingStatus } from "@/lib/resend-status";

// Diagnoses open/click tracking for the account this empresa ACTUALLY sends
// with: its own Resend account when configured, otherwise the shared Grillo
// one. Mirrors the sender resolution in lib/send-campaign.ts so the answer
// matches what a real send would use.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await canAccessEmpresa(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const empresa = await prisma.empresa.findUnique({ where: { id } });
  if (!empresa) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const overrides = empresa.resendApiKeyEncrypted
    ? {
        apiKey: decrypt(empresa.resendApiKeyEncrypted),
        fromEmail: empresa.resendFromEmail ?? undefined,
        webhookSecretSet: !!empresa.resendWebhookSecretEncrypted,
      }
    : {};

  const status = await getTrackingStatus(overrides);
  return NextResponse.json(status);
}
