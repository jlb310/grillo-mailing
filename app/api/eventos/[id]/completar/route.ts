import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSurveyInvite } from "@/lib/mailer";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      contacts: true,
      surveys: { take: 1 },
    },
  });

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!event.surveys[0]) return NextResponse.json({ error: "No survey configured" }, { status: 400 });

  await prisma.event.update({ where: { id }, data: { status: "COMPLETED" } });

  const survey = event.surveys[0];
  const uniqueContacts = Array.from(new Map(event.contacts.map((c) => [c.email, c])).values());

  let sent = 0;
  for (const contact of uniqueContacts) {
    const token = await prisma.surveyToken.upsert({
      where: { surveyId_contactId: { surveyId: survey.id, contactId: contact.id } },
      update: {},
      create: { surveyId: survey.id, contactId: contact.id },
    });

    try {
      await sendSurveyInvite(contact.email, contact.name, event.title, token.id);
      sent++;
    } catch (err) {
      console.error("Survey invite failed for", contact.email, err);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
