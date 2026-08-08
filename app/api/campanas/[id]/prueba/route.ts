import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveEmpresaSender } from "@/lib/resend";
import { BASE_URL } from "@/lib/base-url";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { emails } = await req.json();

  if (!Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json({ error: "No emails provided" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({ where: { id }, include: { empresa: true } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const viewUrl = `${BASE_URL}/email/${id}`;
  const html = campaign.htmlBody
    .replace(/\{\{UNSUBSCRIBE_URL\}\}/g, "#")
    .replace(/\{\{VIEW_URL\}\}/g, viewUrl);

  const { resend, from } = resolveEmpresaSender(campaign.empresa);
  const errors: { email: string; message: string }[] = [];
  let sent = 0;

  for (const email of emails) {
    try {
      const result = await resend.emails.send({
        from,
        to: email,
        subject: `[PRUEBA] ${campaign.subject}`,
        html,
      });
      if (result.data?.id) {
        sent++;
      } else {
        const message = result.error?.message ?? "Resend rechazó el envío";
        errors.push({ email, message });
        console.error("Test send rejected by Resend for", email, result.error);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error de red";
      errors.push({ email, message });
      console.error("Test send failed for", email, err);
    }
  }

  return NextResponse.json({ sent, errors });
}
