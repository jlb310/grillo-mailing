import { NextResponse } from "next/server";
import { Resend } from "resend";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessEmpresa, isSuperAdmin } from "@/lib/empresa";
import { decrypt, encrypt } from "@/lib/crypto";
import { getTrackingStatus } from "@/lib/resend-status";
import { BASE_URL } from "@/lib/base-url";

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

const WEBHOOK_EVENTS = ["email.opened", "email.clicked", "email.bounced"] as const;

// Turns tracking ON in the empresa's OWN Resend account: enables open/click on
// the sending domain, gives it a tracking subdomain, and registers the webhook
// (storing its signing secret encrypted so /api/webhooks/resend can verify it).
//
// What it deliberately does NOT do is finish the job: the tracking subdomain's
// CNAME/CAA live in the customer's DNS zone, so this returns the pending
// records for a human to add. Until those verify, Resend keeps reporting
// open_tracking=true while injecting no pixel — see lib/resend-status.ts.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(session)) {
    return NextResponse.json({ error: "Solo el super admin puede configurar el seguimiento" }, { status: 403 });
  }

  const { id } = await params;
  const empresa = await prisma.empresa.findUnique({ where: { id } });
  if (!empresa) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Scoped to empresas with their own Resend account on purpose: the shared
  // Grillo account's webhook secret lives in SVIX_SECRET (env), which this
  // process cannot write, so "created a webhook" there would silently produce
  // events we can never verify.
  if (!empresa.resendApiKeyEncrypted) {
    return NextResponse.json(
      { error: "Esta empresa no tiene su propia cuenta de Resend configurada. Guarda su API key primero." },
      { status: 400 }
    );
  }
  if (!empresa.resendFromEmail) {
    return NextResponse.json({ error: "Falta el email del remitente para saber qué dominio configurar." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const wantedSubdomain = (body.trackingSubdomain?.toString().trim() || "links").toLowerCase();

  const domainName = empresa.resendFromEmail.split("@")[1]?.toLowerCase();
  if (!domainName) {
    return NextResponse.json({ error: `El email del remitente "${empresa.resendFromEmail}" no tiene dominio.` }, { status: 400 });
  }

  const resend = new Resend(decrypt(empresa.resendApiKeyEncrypted));
  const steps: string[] = [];

  // ── Domain: open/click flags + tracking subdomain ──────────────────────────
  const list = await resend.domains.list();
  const domain = (list.data?.data ?? []).find((d) => d.name.toLowerCase() === domainName);
  if (!domain) {
    return NextResponse.json(
      { error: `El dominio "${domainName}" no está en la cuenta de Resend de esta empresa.` },
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
    `Seguimiento de aperturas y clics activado en "${domainName}"` +
      (hadSubdomain ? ` (ya tenía el subdominio "${hadSubdomain}")` : ` con el subdominio "${wantedSubdomain}"`)
  );

  // ── Webhook: create if missing, then sync its signing secret into the app ──
  const endpoint = `${BASE_URL}/api/webhooks/resend`;
  const whList = await resend.webhooks.list();
  let ours = (whList.data?.data ?? []).find((w) => w.endpoint === endpoint);

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
    const missing = WEBHOOK_EVENTS.filter((e) => !(ours!.events ?? []).includes(e));
    steps.push(
      `Webhook ya existía en ${endpoint} (${ours.status})` +
        (missing.length ? ` — ⚠️ le faltan eventos: ${missing.join(", ")}, agrégalos en el panel de Resend` : "")
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

  // Re-read so the DNS records we hand back reflect the subdomain just set.
  const after = await resend.domains.get(domain.id);
  const pendingTrackingRecords = (after.data?.records ?? [])
    .filter((r) => (r.record === "Tracking" || r.record === "TrackingCAA") && r.status !== "verified")
    .map((r) => ({ record: r.record, type: r.type, name: r.name, value: r.value, status: r.status }));

  const status = await getTrackingStatus({
    apiKey: decrypt(empresa.resendApiKeyEncrypted),
    fromEmail: empresa.resendFromEmail,
    webhookSecretSet: !!signingSecret,
  });

  return NextResponse.json({ ok: true, steps, pendingTrackingRecords, status });
}
