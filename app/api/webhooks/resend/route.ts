import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

const LOG = "[resend-webhook]";

interface CandidateSecret {
  secret: string;
  /** null = the shared Grillo SVIX_SECRET; otherwise the empresa that owns this secret. */
  empresaId: string | null;
}

// Every empresa's own Resend account can point its webhook at this same
// shared endpoint, but each one signs with a DIFFERENT secret (its own
// account's signing secret, not the shared SVIX_SECRET). There is no header
// telling us which empresa sent this, so verification tries every known
// secret (shared + each empresa's own) until one validates — but WHICH one
// validated matters: an empresa's own secret only authenticates events for
// ITS OWN campaigns. Without that binding, any empresa that configures a
// webhook secret could sign an arbitrary payload (any resendId/email_id) and
// forge open/click/bounce events for a DIFFERENT empresa's campaign — the
// signature would be genuinely valid (it really is that empresa's secret),
// just not authorization to touch someone else's data.
async function candidateSecrets(): Promise<CandidateSecret[]> {
  const secrets: CandidateSecret[] = [];
  if (process.env.SVIX_SECRET) secrets.push({ secret: process.env.SVIX_SECRET, empresaId: null });
  const empresas = await prisma.empresa.findMany({
    where: { resendWebhookSecretEncrypted: { not: null } },
    select: { id: true, resendWebhookSecretEncrypted: true },
  });
  for (const e of empresas) {
    if (!e.resendWebhookSecretEncrypted) continue;
    try {
      secrets.push({ secret: decrypt(e.resendWebhookSecretEncrypted), empresaId: e.id });
    } catch (err) {
      console.error(`${LOG} Could not decrypt empresa ${e.id}'s webhook secret:`, err);
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
  // undefined = no candidate matched yet; null = matched the shared secret;
  // string = matched that empresa's own secret. Distinct from `payload` being
  // null so "matched the shared secret" (empresaId null) can't be confused
  // with "nothing matched yet".
  let signedByEmpresaId: string | null | undefined;
  for (const candidate of secrets) {
    try {
      payload = new Webhook(candidate.secret).verify(body, headers) as Payload;
      signedByEmpresaId = candidate.empresaId;
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
  const log = await prisma.sendLog.findFirst({
    where: { resendId },
    include: { campaign: { select: { empresaId: true, empresa: { select: { resendWebhookSecretEncrypted: true } } } } },
  });
  if (!log) {
    // Not a campaign send — it may be a certificate email. Certificates aren't
    // tenant-scoped and always send via the shared Grillo account, so only the
    // shared secret may authenticate their events.
    if (signedByEmpresaId !== null) {
      console.warn(`${LOG} ${payload.type} for resendId=${resendId} signed by empresa ${signedByEmpresaId}'s secret but no matching SendLog — refusing to check it against Certificate too (cross-tenant forgery attempt?).`);
      return NextResponse.json({ ok: true });
    }
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

  // Bind the secret that validated this payload to the tenant it may mutate:
  // an empresa's own secret only authenticates its own campaigns; the shared
  // secret only authenticates campaigns from empresas with no account of their own.
  const ownerEmpresaId = log.campaign.empresaId;
  const authorized = signedByEmpresaId === null
    ? !log.campaign.empresa.resendWebhookSecretEncrypted
    : signedByEmpresaId === ownerEmpresaId;
  if (!authorized) {
    console.warn(`${LOG} ${payload.type} for SendLog ${log.id} (empresa ${ownerEmpresaId}) signed by a non-matching secret (empresa ${signedByEmpresaId ?? "shared"}) — rejecting as cross-tenant forgery.`);
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
