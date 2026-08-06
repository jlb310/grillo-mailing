import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getResend, FROM } from "@/lib/resend";
import { BASE_URL } from "@/lib/base-url";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { emails } = await req.json();

  if (!Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json({ error: "No emails provided" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const viewUrl = `${BASE_URL}/email/${id}`;
  const html = campaign.htmlBody
    .replace(/\{\{UNSUBSCRIBE_URL\}\}/g, "#")
    .replace(/\{\{VIEW_URL\}\}/g, viewUrl);

  const resend = getResend();
  const errors: string[] = [];

  for (const email of emails) {
    try {
      await resend.emails.send({
        from: FROM(),
        to: email,
        subject: `[PRUEBA] ${campaign.subject}`,
        html,
      });
    } catch (err) {
      errors.push(email);
      console.error("Test send failed for", email, err);
    }
  }

  return NextResponse.json({ sent: emails.length - errors.length, errors });
}
