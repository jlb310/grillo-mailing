import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";

const LOG = "[resend-webhook]";

export async function POST(req: Request) {
  const secret = process.env.SVIX_SECRET;
  if (!secret) {
    console.warn(`${LOG} SVIX_SECRET not set — rejecting.`);
    return NextResponse.json({ error: "No webhook secret" }, { status: 500 });
  }

  const body = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  let payload: { type: string; data: { email_id: string } };
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(body, headers) as typeof payload;
  } catch (err) {
    // Most likely SVIX_SECRET does not match this endpoint's signing secret.
    console.warn(`${LOG} Invalid signature (SVIX_SECRET likely wrong):`, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const resendId = payload.data.email_id;
  const log = await prisma.sendLog.findFirst({ where: { resendId } });
  if (!log) {
    // Not a campaign send — it may be a certificate email. Certificates only
    // track opens (their body has no clickable links).
    const cert = await prisma.certificate.findFirst({ where: { resendId } });
    if (cert) {
      if (payload.type === "email.opened" && !cert.openedAt) {
        await prisma.certificate.update({ where: { id: cert.id }, data: { openedAt: new Date() } });
      }
      console.log(`${LOG} ${payload.type} matched Certificate ${cert.id} (batch ${cert.batchId}).`);
      return NextResponse.json({ ok: true });
    }
    console.warn(`${LOG} ${payload.type} received but no SendLog/Certificate matched resendId=${resendId}.`);
    return NextResponse.json({ ok: true });
  }
  console.log(`${LOG} ${payload.type} matched SendLog ${log.id} (campaign ${log.campaignId}).`);

  const updates: Record<string, Date> = {};
  if (payload.type === "email.opened") updates.openedAt = new Date();
  if (payload.type === "email.clicked") updates.clickedAt = new Date();
  if (payload.type === "email.bounced") updates.bouncedAt = new Date();

  if (Object.keys(updates).length > 0) {
    await prisma.sendLog.update({ where: { id: log.id }, data: { ...updates, status: payload.type.replace("email.", "") } });
  }

  if (payload.type === "email.bounced") {
    await prisma.contact.update({ where: { id: log.contactId }, data: { bounced: true } });
  }

  return NextResponse.json({ ok: true });
}
