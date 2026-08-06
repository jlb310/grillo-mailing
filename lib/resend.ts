import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export const FROM = () => process.env.RESEND_FROM ?? "Grillo <no-reply@grillo.click>";

// Recipients for the ops report emails (Envío completado / Estadísticas 24h)
// when a campaign has no notifyEmails set. Without this, a campaign created
// without manually filling notifyEmails sends no report at all. Configurable via
// REPORT_FALLBACK_EMAILS (comma-separated); defaults to the Grillo ops inbox.
export const REPORT_RECIPIENTS = (): string[] =>
  (process.env.REPORT_FALLBACK_EMAILS ?? "hola@grillo.click")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
