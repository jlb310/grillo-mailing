import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

const LOG = "[resend-webhook]";

// Every empresa's own Resend account can point its webhook at this same
// shared endpoint, but each one signs with a DIFFERENT secret (its own
// account's signing secret, not the shared SVIX_SECRET). There is no header
// telling us which empresa sent this, so verification tries every known
// secret (shared + each empresa's own) until one validates.
async function candidateSecrets(): Promise<string[]> {
  const secrets: string[] = [];
  if (process.env.SVIX_SECRET) secrets.push(process.env.SVIX_SECRET);
  const empresas = await prisma.empresa.findMany({
    where: { resendWebhookSecretEncrypted: { not: null } },
    select: { resendWebhookSecretEncrypted: true },
  });
  for (const e of empresas) {
    if (!e.resendWebhookSecretEncrypted) continue;
    try {
      secrets.push(decrypt(e.resendWebhookSecretEncrypted));
    } catch (err) {
      console.error(`${LOG} Could not decrypt an empresa's webhook secret:`, err);
    }
  }
  return secrets;
}

export async function POST(req: Request) {
  const secrets = await candidateSecrets();
  if (secrets.length === 0) {
    console.warn(`${LOG} No webhook secret configured (SVIX_SECRET, empresa) — rejecting.`);
    return NextResponse.json({ error: "No webhook secret" }, { status: 500 });
  }

  const body = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  type Payload = { type: string; data: { email_id: string } };
  let payload: Payload | null = null;
  for (const secret of secrets) {
    try {
      payload = new Webhook(secret).verify(body, headers) as Payload;
      break;
    } catch {
      // Try the next candidate secret — this one just doesn't match.
    }
  }
  if (!payload) {
    console.warn(`${LOG} Invalid signature — matched none of ${secrets.length} known secret(s).`);
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
