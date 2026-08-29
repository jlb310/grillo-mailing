import { Resend } from "resend";
import { decrypt } from "@/lib/crypto";
import { senderAddress } from "@/lib/sender";

let _resend: Resend | null = null;

/** The shared Grillo Resend account (default sender for every empresa without its own). */
export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export const FROM = () => senderAddress();

// Recipients for the ops report emails (Envío completado / Estadísticas 24h)
// when a campaign has no notifyEmails set. Without this, a campaign created
// without manually filling notifyEmails sends no report at all. Configurable via
// REPORT_FALLBACK_EMAILS (comma-separated); defaults to the Grillo ops inbox.
export const REPORT_RECIPIENTS = (): string[] =>
  (process.env.REPORT_FALLBACK_EMAILS ?? "hola@grillo.click")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

export interface EmpresaResendFields {
  resendApiKeyEncrypted: string | null;
  resendFromName: string | null;
  resendFromEmail: string | null;
}

export interface EmpresaSender {
  resend: Resend;
  from: string;
  /** null when this send goes through the shared Grillo account. */
  apiKey: string | null;
  /**
   * The empresa sends from its OWN domain, regardless of which account pays for
   * it. Callers that diagnose tracking must look at THIS domain, not Grillo's.
   */
  ownDomain: boolean;
}

function formatFrom(name: string | null, email: string): string {
  const n = (name ?? "").trim();
  return n ? `${n} <${email}>` : email;
}

// Resolves which Resend account + From address an empresa's campaigns go out
// with. The account and the domain are INDEPENDENT — three valid combinations:
//
//   1. own API key + own sender  → own account, own domain (the client pays
//      Resend directly; legacy setup, kept working for clients not migrated yet)
//   2. no API key + own sender   → SHARED Grillo account, client's domain. This
//      is the model Grillo bills for: one Resend subscription, many verified
//      domains, the client only owns the DNS records.
//   3. no API key + no sender    → shared account, shared grillo.click domain.
//
// Case 2 is why this can't be a single `&&`: an empresa with a sender email but
// no key of its own must NOT silently fall back to no-reply@grillo.click — that
// would send a client's campaign from the wrong brand.
//
// Not cached — custom clients are cheap to construct and this only runs per
// send, not per email.
export function resolveEmpresaSender(empresa: EmpresaResendFields): EmpresaSender {
  if (empresa.resendApiKeyEncrypted && empresa.resendFromEmail) {
    const apiKey = decrypt(empresa.resendApiKeyEncrypted);
    return {
      resend: new Resend(apiKey),
      from: formatFrom(empresa.resendFromName, empresa.resendFromEmail),
      apiKey,
      ownDomain: true,
    };
  }
  if (empresa.resendFromEmail) {
    return {
      resend: getResend(),
      from: formatFrom(empresa.resendFromName, empresa.resendFromEmail),
      apiKey: null,
      ownDomain: true,
    };
  }
  return { resend: getResend(), from: FROM(), apiKey: null, ownDomain: false };
}

/**
 * The tracking-diagnosis overrides matching a resolved sender: always diagnose
 * the domain that actually sends, and the webhook secret of the account that
 * actually signs the events (the empresa's own, or the shared SVIX_SECRET).
 */
export function trackingOverridesFor(
  sender: EmpresaSender,
  webhookSecretSet: boolean
): { apiKey?: string; fromEmail?: string; webhookSecretSet?: boolean } {
  if (sender.apiKey) {
    return { apiKey: sender.apiKey, fromEmail: sender.from, webhookSecretSet };
  }
  // Shared account: the key comes from the env, but the domain may still be the
  // empresa's own — pass it so the diagnosis doesn't check grillo.click instead.
  return sender.ownDomain ? { fromEmail: sender.from } : {};
}
