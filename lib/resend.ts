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
  /** null when this empresa has no Resend account of its own (using the shared Grillo one). */
  apiKey: string | null;
}

// Resolves which Resend account + From address to send an empresa's campaigns
// with: its own account when configured (resendApiKeyEncrypted + resendFromEmail),
// falling back to the shared Grillo account/domain otherwise. Not cached —
// custom clients are cheap to construct and this only runs per send, not per email.
export function resolveEmpresaSender(empresa: EmpresaResendFields): EmpresaSender {
  if (empresa.resendApiKeyEncrypted && empresa.resendFromEmail) {
    const apiKey = decrypt(empresa.resendApiKeyEncrypted);
    const name = (empresa.resendFromName ?? "").trim();
    const from = name ? `${name} <${empresa.resendFromEmail}>` : empresa.resendFromEmail;
    return { resend: new Resend(apiKey), from, apiKey };
  }
  return { resend: getResend(), from: FROM(), apiKey: null };
}
