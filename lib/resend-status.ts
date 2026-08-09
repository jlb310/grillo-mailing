import { Resend } from "resend";
import { getResend } from "@/lib/resend";
import { BASE_URL } from "@/lib/base-url";
import { senderAddress, domainFromSender } from "@/lib/sender";

// Read-only diagnosis of whether Resend is actually capturing open/click events.
// Mirrors the checks in scripts/setup-resend-tracking.ts but never mutates
// anything — it's meant to be called from the UI (and once per send) so the
// dashboard can show WHY opens/clicks are zero instead of implying nobody engaged.
//
// Bounces reach us regardless of domain tracking (they ride the same webhook),
// so a working bounce count does NOT imply opens/clicks work. Opens/clicks are
// only recorded when ALL of these hold: (1) the sending domain has open/click
// tracking enabled in Resend, (2) the domain has a TRACKING SUBDOMAIN that is
// configured AND DNS-verified, and (3) an enabled webhook subscribes to the
// email.opened / email.clicked events with a matching SVIX_SECRET.
//
// (2) is the easy one to miss and the reason this file exists in its current
// shape: since Resend introduced custom tracking domains, the open/click flags
// are "only applied if a tracking_subdomain is configured and verified". With no
// tracking subdomain Resend keeps reporting open_tracking=true but silently
// stops injecting the open pixel and stops rewriting links — so every campaign
// reports 0 opens / 0 clicks forever while delivered/bounced keep flowing. Never
// call tracking active on the flags alone.

const REQUIRED_OPEN_CLICK = ["email.opened", "email.clicked"] as const;

/** A DNS record Resend still needs before tracking can work. */
export type PendingTrackingRecord = {
  record: string;
  type: string;
  name: string;
  value: string;
  status: string;
};

export type TrackingStatus = {
  /** open/click events are reliably captured right now */
  active: boolean;
  domainName: string | null;
  domainFound: boolean;
  domainOpenTracking: boolean;
  domainClickTracking: boolean;
  /** the configured tracking subdomain, or null when Resend has none */
  trackingSubdomain: string | null;
  /** the tracking CNAME (and CAA, when required) are verified in DNS */
  trackingDnsVerified: boolean;
  /** tracking DNS records that are not verified yet — what to ask DNS admins for */
  pendingTrackingRecords: PendingTrackingRecord[];
  webhookConfigured: boolean;
  webhookEnabled: boolean;
  /** subset of [email.opened, email.clicked] the webhook is NOT subscribed to */
  webhookMissingEvents: string[];
  svixSet: boolean;
  /** short human-readable explanation, in Spanish, for the UI */
  reason: string;
  /** true when we could not query Resend (no API key / API error) */
  unknown: boolean;
};

function webhookUrl(): string {
  return `${BASE_URL}/api/webhooks/resend`;
}

function sendingDomain(fromEmail?: string): string | null {
  // The empresa's OWN domain wins; only fall back to the shared Grillo sender
  // (RESEND_FROM / DEFAULT_FROM) when no empresa-specific email was provided.
  const from = fromEmail ?? senderAddress();
  return domainFromSender(from);
}

function unknownStatus(reason: string, fromEmail?: string, svixSet = !!process.env.SVIX_SECRET): TrackingStatus {
  return {
    active: false,
    domainName: sendingDomain(fromEmail),
    domainFound: false,
    domainOpenTracking: false,
    domainClickTracking: false,
    trackingSubdomain: null,
    trackingDnsVerified: false,
    pendingTrackingRecords: [],
    webhookConfigured: false,
    webhookEnabled: false,
    webhookMissingEvents: [...REQUIRED_OPEN_CLICK],
    svixSet,
    reason,
    unknown: true,
  };
}

// Overrides let a caller diagnose an empresa's OWN Resend account (own
// apiKey/fromEmail/webhookSecret) instead of the shared Grillo one — same
// checks, different account. Omit them to check the shared account.
export interface TrackingStatusOverrides {
  apiKey?: string;
  fromEmail?: string;
  webhookSecretSet?: boolean;
}

export async function getTrackingStatus(overrides: TrackingStatusOverrides = {}): Promise<TrackingStatus> {
  const apiKey = overrides.apiKey ?? process.env.RESEND_API_KEY;
  const svixSet = overrides.apiKey ? !!overrides.webhookSecretSet : !!process.env.SVIX_SECRET;

  if (!apiKey) {
    return unknownStatus("No se pudo verificar: falta RESEND_API_KEY en el entorno.", overrides.fromEmail, svixSet);
  }

  // An empresa with its OWN Resend account is diagnosed against its own domain,
  // never the shared Grillo one. If its sender email is missing from the record,
  // say so instead of silently falling back to RESEND_FROM and reporting the
  // wrong (shared) domain.
  if (overrides.apiKey && !overrides.fromEmail) {
    return {
      active: false,
      domainName: null,
      domainFound: false,
      domainOpenTracking: false,
      domainClickTracking: false,
      trackingSubdomain: null,
      trackingDnsVerified: false,
      pendingTrackingRecords: [],
      webhookConfigured: false,
      webhookEnabled: false,
      webhookMissingEvents: [...REQUIRED_OPEN_CLICK],
      svixSet,
      reason: "Esta empresa tiene su propia cuenta Resend pero falta el email del remitente (resendFromEmail) para determinar su dominio de seguimiento.",
      unknown: false,
    };
  }

  const domainName = sendingDomain(overrides.fromEmail);

  try {
    const resend = overrides.apiKey ? new Resend(overrides.apiKey) : getResend();

    // ── Domain open/click tracking ──────────────────────────────────────────
    let domainFound = false;
    let domainOpenTracking = false;
    let domainClickTracking = false;
    let trackingSubdomain: string | null = null;
    let trackingDnsVerified = false;
    let pendingTrackingRecords: PendingTrackingRecord[] = [];
    if (domainName) {
      const list = await resend.domains.list();
      const domain = (list.data?.data ?? []).find((d) => d.name.toLowerCase() === domainName);
      if (domain) {
        domainFound = true;
        const full = await resend.domains.get(domain.id);
        domainOpenTracking = full.data?.open_tracking === true;
        domainClickTracking = full.data?.click_tracking === true;
        trackingSubdomain = full.data?.tracking_subdomain || null;

        // Resend only returns Tracking/TrackingCAA records once a tracking
        // subdomain exists, so "no records" means "nothing configured", not
        // "nothing left to do". Require every tracking record to be verified.
        const trackingRecords = (full.data?.records ?? []).filter(
          (r) => r.record === "Tracking" || r.record === "TrackingCAA"
        );
        pendingTrackingRecords = trackingRecords
          .filter((r) => r.status !== "verified")
          .map((r) => ({ record: r.record, type: r.type, name: r.name, value: r.value, status: r.status }));
        trackingDnsVerified =
          !!trackingSubdomain && trackingRecords.length > 0 && pendingTrackingRecords.length === 0;
      }
    }

    // ── Webhook subscription ────────────────────────────────────────────────
    const url = webhookUrl();
    const whList = await resend.webhooks.list();
    const ours = (whList.data?.data ?? []).find((w) => w.endpoint === url);
    const webhookConfigured = !!ours;
    const webhookEnabled = ours?.status === "enabled";
    const events = ours?.events ?? [];
    const webhookMissingEvents = REQUIRED_OPEN_CLICK.filter((e) => !events.includes(e));

    const active =
      domainFound &&
      domainOpenTracking &&
      domainClickTracking &&
      trackingDnsVerified &&
      webhookConfigured &&
      webhookEnabled &&
      webhookMissingEvents.length === 0 &&
      svixSet;

    // Build the most relevant reason (first failing check).
    let reason = "El seguimiento de aperturas y clicks está activo.";
    if (!domainName) {
      reason = "No se pudo determinar el dominio de envío del remitente.";
    } else if (!domainFound) {
      reason = `El dominio "${domainName}" no está verificado en la cuenta de Resend.`;
    } else if (!domainOpenTracking || !domainClickTracking) {
      reason = `El seguimiento de aperturas/clicks está apagado en el dominio "${domainName}" en Resend.`;
    } else if (!trackingSubdomain) {
      reason = `El dominio "${domainName}" no tiene subdominio de seguimiento configurado en Resend. Sin él, Resend NO inyecta el pixel de apertura ni reescribe los links, aunque el seguimiento figure activado.`;
    } else if (!trackingDnsVerified) {
      const pending = pendingTrackingRecords.map((r) => `${r.type} ${r.name} → ${r.value} (${r.status})`).join("; ");
      reason = `El subdominio de seguimiento "${trackingSubdomain}" está configurado pero su DNS no está verificado en Resend${pending ? `: falta ${pending}` : ""}. Hasta que se verifique, no se miden aperturas ni clics.`;
    } else if (!webhookConfigured) {
      reason = "No hay un webhook de Resend apuntando a la plataforma.";
    } else if (!webhookEnabled) {
      reason = "El webhook de Resend existe pero está deshabilitado.";
    } else if (webhookMissingEvents.length) {
      reason = `El webhook no está suscrito a: ${webhookMissingEvents.join(", ")}.`;
    } else if (!svixSet) {
      reason = "Falta SVIX_SECRET, por lo que las notificaciones del webhook no se validan.";
    }

    return {
      active,
      domainName,
      domainFound,
      domainOpenTracking,
      domainClickTracking,
      trackingSubdomain,
      trackingDnsVerified,
      pendingTrackingRecords,
      webhookConfigured,
      webhookEnabled,
      webhookMissingEvents,
      svixSet,
      reason,
      unknown: false,
    };
  } catch (err) {
    console.error("[resend-status] Error querying Resend:", err);
    return unknownStatus("No se pudo verificar el estado con Resend en este momento.", overrides.fromEmail, svixSet);
  }
}
