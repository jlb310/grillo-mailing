// Single source of truth for the shared Grillo sender (the account/domain every
// empresa WITHOUT its own Resend account sends from). lib/resend.ts, the
// tracking diagnosis (lib/resend-status.ts) and the deploy-time setup script
// (scripts/setup-resend-tracking.ts) must agree on this: sends fall back to
// DEFAULT_FROM when RESEND_FROM is unset, so the diagnosis must too, or it will
// report "cannot determine sending domain" for an account that actually sends.
//
// No imports on purpose: scripts run via `npx tsx` in the Docker image where the
// `@/` alias is not guaranteed to resolve, so this module stays dependency-free.

export const DEFAULT_FROM = "Grillo <no-reply@grillo.click>";

/** The shared Grillo sender address: RESEND_FROM or DEFAULT_FROM. */
export function senderAddress(): string {
  return process.env.RESEND_FROM ?? DEFAULT_FROM;
}

/**
 * Extract the sending domain from a From string like `"Clínica Alemana
 * <eventos@clinicaalemana.cl>"` or a bare `no-reply@grillo.click`.
 * Returns null when there is no `@domain` to extract.
 */
export function domainFromSender(from: string): string | null {
  const m = from.match(/@([^\s>]+)/);
  return m ? m[1].toLowerCase() : null;
}
