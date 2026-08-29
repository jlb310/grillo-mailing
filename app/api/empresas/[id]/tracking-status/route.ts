import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessEmpresa, isSuperAdmin } from "@/lib/empresa";
import { encrypt } from "@/lib/crypto";
import { resolveEmpresaSender, trackingOverridesFor } from "@/lib/resend";
import { getTrackingStatus } from "@/lib/resend-status";
import { domainFromSender } from "@/lib/sender";
import { BASE_URL } from "@/lib/base-url";

// Diagnoses open/click tracking for the account AND domain this empresa
// actually sends with — which are independent: its own Resend account when it
// still has one, otherwise the shared Grillo account, in both cases against its
// own sending domain. Mirrors lib/send-campaign.ts so the answer matches a real send.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await canAccessEmpresa(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const empresa = await prisma.empresa.findUnique({ where: { id } });
  if (!empresa) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sender = resolveEmpresaSender(empresa);
  const status = await getTrackingStatus(
    trackingOverridesFor(sender, !!empresa.resendWebhookSecretEncrypted)
  );
  return NextResponse.json(status);
}

const WEBHOOK_EVENTS = ["email.opened", "email.clicked", "email.bounced"] as const;

// Turns tracking ON for the empresa's sending domain, in whichever account
// holds it: enables open/click, gives the domain a tracking subdomain, and
// makes sure a webhook points back here.
//
// Two shapes, because the webhook secret lives in a different place in each:
//   • Empresa with its OWN Resend account → create the webhook and store its
//     signing secret encrypted on the empresa row.
//   • Shared Grillo account → the webhook is shared and its secret lives in
//     SVIX_SECRET (env), which this process cannot write. So here we only
//     VERIFY the webhook exists and is subscribed, and report if it isn't;
//     creating one would silently produce events we could never verify.
//
// What it deliberately does NOT do in either case is finish the job: the
// tracking subdomain's CNAME/CAA live in the customer's DNS zone, so this
// returns the pending records for a human to add. Until those verify, Resend
// keeps reporting open_tracking=true while injecting no pixel — see lib/resend-status.ts.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(session)) {
    return NextResponse.json({ error: "Solo el super admin puede configurar el seguimiento" }, { status: 403 });
  }

  const { id } = await params;
  const empresa = await prisma.empresa.findUnique({ where: { id } });
  if (!empresa) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!empresa.resendFromEmail) {
    return NextResponse.json({ error: "Falta el email del remitente para saber qué dominio configurar." }, { status: 400 });
  }

  const sender = resolveEmpresaSender(empresa);
  const sharedAccount = sender.apiKey === null;
  if (sharedAccount && !process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Esta empresa usa la cuenta compartida de Grillo, pero falta RESEND_API_KEY en el entorno." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const wantedSubdomain = (body.trackingSubdomain?.toString().trim() || "links").toLowerCase();

  const domainName = domainFromSender(empresa.resendFromEmail);
  if (!domainName) {
    return NextResponse.json({ error: `El email del remitente "${empresa.resendFromEmail}" no tiene dominio.` }, { status: 400 });
  }

  const resend = sender.resend;
  const accountLabel = sharedAccount ? "la cuenta compartida de Grillo" : "la cuenta propia de esta empresa";
  const steps: string[] = [];

  // ── Domain: open/click flags + tracking subdomain ──────────────────────────
  const list = await resend.domains.list();
  const domain = (list.data?.data ?? []).find((d) => d.name.toLowerCase() === domainName);
  if (!domain) {
    return NextResponse.json(
      { error: `El dominio "${domainName}" no está verificado en ${accountLabel}. Agrégalo primero en Resend y verifica sus registros SPF/DKIM.` },
      { status: 400 }
    );
  }

  const before = await resend.domains.get(domain.id);
  const hadSubdomain = before.data?.tracking_subdomain || null;

  // Only assign a subdomain when there is none: overwriting an existing one
  // invalidates DNS records the customer may have already verified.
  const upd = await resend.domains.update({
    id: domain.id,
    openTracking: true,
    clickTracking: true,
    ...(hadSubdomain ? {} : { trackingSubdomain: wantedSubdomain }),
  });
  if (upd.error) {
    return NextResponse.json({ error: `Resend rechazó la actualización del dominio: ${upd.error.message}` }, { status: 502 });
  }
  steps.push(
    `Seguimiento de aperturas y clics activado en "${domainName}" (${accountLabel})` +
      (hadSubdomain ? ` — ya tenía el subdominio "${hadSubdomain}"` : ` con el subdominio "${wantedSubdomain}"`)
  );

  // ── Webhook ────────────────────────────────────────────────────────────────
  const endpoint = `${BASE_URL}/api/webhooks/resend`;
  const whList = await resend.webhooks.list();
  const ours = (whList.data?.data ?? []).find((w) => w.endpoint === endpoint);
  const missingEvents = WEBHOOK_EVENTS.filter((e) => !(ours?.events ?? []).includes(e));

  let webhookSecretSet: boolean;
  if (sharedAccount) {
    // Shared webhook: verify only. Its secret is SVIX_SECRET, set at deploy time.
    webhookSecretSet = !!process.env.SVIX_SECRET;
    if (!ours) {
      steps.push(`⚠️ La cuenta compartida no tiene webhook en ${endpoint} — créalo en el panel de Resend y pon su signing secret en SVIX_SECRET.`);
    } else {
      steps.push(
        `Webhook compartido encontrado en ${endpoint} (${ours.status})` +
          (missingEvents.length ? ` — ⚠️ le faltan eventos: ${missingEvents.join(", ")}` : "")
      );
      if (!webhookSecretSet) steps.push("⚠️ Falta SVIX_SECRET en el entorno: los eventos llegarán pero no se podrán verificar.");
    }
  } else {
    let signingSecret: string | undefined;
    if (!ours) {
      const created = await resend.webhooks.create({ endpoint, events: [...WEBHOOK_EVENTS] });
      if (created.error) {
        return NextResponse.json({ error: `No se pudo crear el webhook: ${created.error.message}` }, { status: 502 });
      }
      signingSecret = created.data?.signing_secret;
      steps.push(`Webhook creado en ${endpoint} (${WEBHOOK_EVENTS.join(", ")})`);
    } else {
      const full = await resend.webhooks.get(ours.id);
      signingSecret = full.data?.signing_secret;
      steps.push(
        `Webhook ya existía en ${endpoint} (${ours.status})` +
          (missingEvents.length ? ` — ⚠️ le faltan eventos: ${missingEvents.join(", ")}, agrégalos en el panel de Resend` : "")
      );
    }

    if (signingSecret) {
      await prisma.empresa.update({
        where: { id },
        data: { resendWebhookSecretEncrypted: encrypt(signingSecret) },
      });
      steps.push("Signing secret del webhook guardado (cifrado) en la empresa");
    } else {
      steps.push("⚠️ Resend no devolvió el signing secret — pégalo a mano en el campo de arriba");
    }
    webhookSecretSet = !!signingSecret;
  }

  // Re-read so the DNS records we hand back reflect the subdomain just set.
  const after = await resend.domains.get(domain.id);
  const pendingTrackingRecords = (after.data?.records ?? [])
    .filter((r) => (r.record === "Tracking" || r.record === "TrackingCAA") && r.status !== "verified")
    .map((r) => ({ record: r.record, type: r.type, name: r.name, value: r.value, status: r.status }));

  const status = await getTrackingStatus(trackingOverridesFor(sender, webhookSecretSet));

  return NextResponse.json({ ok: true, steps, pendingTrackingRecords, status });
}
