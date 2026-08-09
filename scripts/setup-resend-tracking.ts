import { Resend } from "resend";
import { senderAddress, domainFromSender } from "../lib/sender";

// Idempotent Resend configuration for open/click tracking.
//
// Why this exists: open/click tracking in Resend is NOT a per-message option —
// it's enabled per sending DOMAIN, and the resulting email.opened/email.clicked
// events only reach us if a webhook is registered. The app already stores
// resendId per SendLog, has the webhook handler (/api/webhooks/resend) and the
// stats UI — the only missing pieces were these two Resend-side settings.
//
// On every deploy this script:
//   1. Ensures open + click tracking are ON for the sending domain (idempotent).
//   2. Diagnoses the webhook + SVIX_SECRET and prints a clear report.
//
// Set CREATE_RESEND_WEBHOOK=1 to also CREATE the webhook if none points at our
// URL — it prints the signing secret once so you can store it as SVIX_SECRET.

const LOG = "[setup-resend-tracking]";

function webhookUrl(): string {
  const base = process.env.NEXTAUTH_URL ?? "https://calemana.digitalsagencia.cl";
  return `${base.replace(/\/$/, "")}/api/webhooks/resend`;
}

const REQUIRED_EVENTS = ["email.opened", "email.clicked", "email.bounced"] as const;

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`${LOG} RESEND_API_KEY not set. Skipping.`);
    return;
  }
  const resend = new Resend(apiKey);

  // ── 1. Domain open/click tracking ──────────────────────────────────────────
  const domainName = domainFromSender(senderAddress());
  if (!domainName) {
    console.log(`${LOG} Could not parse a domain from the shared sender ("${senderAddress()}"). Skipping domain step.`);
  } else {
    const list = await resend.domains.list();
    const domains = list.data?.data ?? [];
    const domain = domains.find((d) => d.name.toLowerCase() === domainName);

    if (!domain) {
      console.log(`${LOG} Domain "${domainName}" not found in this Resend account. Verify RESEND_FROM / API key. Known domains: ${domains.map((d) => d.name).join(", ") || "(none)"}`);
    } else {
      const full = await resend.domains.get(domain.id);
      const openOn = full.data?.open_tracking === true;
      const clickOn = full.data?.click_tracking === true;

      if (openOn && clickOn) {
        console.log(`${LOG} Domain "${domainName}" (${domain.status}) already has open + click tracking ON.`);
      } else {
        const upd = await resend.domains.update({ id: domain.id, openTracking: true, clickTracking: true });
        if (upd.error) console.log(`${LOG} Failed to enable tracking on "${domainName}": ${upd.error.message}`);
        else console.log(`${LOG} Enabled open + click tracking on "${domainName}" (was open=${openOn} click=${clickOn}). Applies to emails sent from now on.`);
      }

      // The flags above are NOT enough: Resend only applies them when the domain
      // also has a tracking subdomain whose DNS is verified. Without it the flags
      // stay true while the open pixel is never injected and links are never
      // rewritten — every campaign reports 0 opens / 0 clicks. Don't auto-create
      // it: the CNAME lives in the customer's DNS zone, so picking a subdomain
      // here would just park an unverifiable record. Report loudly instead.
      const trackingSubdomain = full.data?.tracking_subdomain || null;
      const trackingRecords = (full.data?.records ?? []).filter(
        (r) => r.record === "Tracking" || r.record === "TrackingCAA"
      );
      const pending = trackingRecords.filter((r) => r.status !== "verified");

      if (!trackingSubdomain) {
        console.log(`${LOG} ⚠️  Domain "${domainName}" has NO tracking subdomain — opens/clicks CANNOT be measured, regardless of the flags above.`);
        console.log(`${LOG}    Fix: set one (domains.update({ id, trackingSubdomain: "links" })), then have the DNS admin of "${domainName}" add the CNAME/CAA records Resend returns.`);
      } else if (pending.length) {
        console.log(`${LOG} ⚠️  Tracking subdomain "${trackingSubdomain}" is set but its DNS is NOT verified yet — opens/clicks are still not measured.`);
        for (const r of pending) console.log(`${LOG}    pending ${r.record}: ${r.type} ${r.name} → ${r.value} (status=${r.status})`);
      } else {
        console.log(`${LOG} Tracking subdomain "${trackingSubdomain}" is configured and its DNS is verified.`);
      }
    }
  }

  // ── 2. Webhook diagnosis (+ optional creation) ──────────────────────────────
  const url = webhookUrl();
  const whList = await resend.webhooks.list();
  const webhooks = whList.data?.data ?? [];
  const ours = webhooks.find((w) => w.endpoint === url);

  if (ours) {
    const events = ours.events ?? [];
    const missing = REQUIRED_EVENTS.filter((e) => !events.includes(e));
    console.log(`${LOG} Webhook found for ${url} — status=${ours.status}, events=[${events.join(", ")}].`);
    if (ours.status !== "enabled") console.log(`${LOG} ⚠️  Webhook is NOT enabled — enable it in the Resend dashboard.`);
    if (missing.length) console.log(`${LOG} ⚠️  Webhook is missing events: [${missing.join(", ")}] — add them in the dashboard.`);

    // Verify SVIX_SECRET matches THIS webhook's signing secret. A mismatch means
    // every delivery fails signature verification (400) and is silently dropped,
    // so opens/clicks never get recorded. We never print the secret values.
    const envSecret = process.env.SVIX_SECRET;
    if (!envSecret) {
      console.log(`${LOG} ⚠️  SVIX_SECRET is NOT set — webhook deliveries cannot be verified.`);
    } else {
      const full = await resend.webhooks.get(ours.id);
      const realSecret = full.data?.signing_secret;
      if (!realSecret) {
        console.log(`${LOG} Could not read the webhook's signing secret to compare (API returned none).`);
      } else {
        const norm = (s: string) => s.replace(/^whsec_/, "").trim();
        const match = norm(envSecret) === norm(realSecret);
        console.log(`${LOG} SVIX_SECRET vs webhook signing secret: ${match ? "✅ MATCH" : "❌ MISMATCH — update SVIX_SECRET in Dokploy to this webhook's signing secret (Resend dashboard → Webhooks → this endpoint → Signing Secret)"}.`);
      }
    }
  } else if (process.env.CREATE_RESEND_WEBHOOK === "1") {
    const created = await resend.webhooks.create({ endpoint: url, events: [...REQUIRED_EVENTS] });
    if (created.error) {
      console.log(`${LOG} Failed to create webhook: ${created.error.message}`);
    } else {
      console.log(`${LOG} ✅ Created webhook for ${url}.`);
      console.log(`${LOG} 🔑 SIGNING SECRET (store this as SVIX_SECRET in Dokploy, then remove CREATE_RESEND_WEBHOOK):`);
      console.log(`${LOG}    ${created.data?.signing_secret}`);
    }
  } else {
    console.log(`${LOG} ⚠️  No webhook points at ${url}.`);
    console.log(`${LOG}    Either create it in the Resend dashboard (events: ${REQUIRED_EVENTS.join(", ")}) and store its signing secret as SVIX_SECRET,`);
    console.log(`${LOG}    or redeploy once with CREATE_RESEND_WEBHOOK=1 to create it via API (it will print the secret).`);
  }

  console.log(`${LOG} SVIX_SECRET is ${process.env.SVIX_SECRET ? "SET" : "NOT set"} in this environment.`);
  console.log(`${LOG} Done.`);
}

main().catch((err) => {
  console.error(`${LOG} Error:`, err);
});
