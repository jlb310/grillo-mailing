import { getResend, FROM } from "@/lib/resend";
import { buildCertificateEmailHtml } from "@/lib/certificate-template";
import { BASE_URL } from "@/lib/base-url";
import fs from "fs/promises";

export async function sendCampaignBatch(
  emails: { to: string; name: string; subject: string; html: string }[]
) {
  const resend = getResend();
  const batches = chunk(emails, 100);
  for (const batch of batches) {
    await resend.batch.send(
      batch.map(({ to, name, subject, html }) => ({
        from: FROM(),
        to: [`${name} <${to}>`],
        subject,
        html,
      }))
    );
  }
}

export async function sendSurveyInvite(
  to: string,
  name: string,
  eventTitle: string,
  token: string
) {
  const resend = getResend();
  const surveyUrl = `${BASE_URL}/encuesta/${token}`;
  await resend.emails.send({
    from: FROM(),
    to: [`${name} <${to}>`],
    subject: `Encuesta de satisfacción — ${eventTitle}`,
    html: `
      <p>Estimado/a ${escapeHtml(name)},</p>
      <p>Gracias por participar en <strong>${escapeHtml(eventTitle)}</strong>.</p>
      <p>Por favor complete la encuesta de satisfacción:</p>
      <p><a href="${surveyUrl}">Completar encuesta</a></p>
      <p>Al finalizar recibirá su diploma de participación.</p>
    `,
  });
}

export async function sendCertificateEmail(
  to: string,
  name: string,
  eventTitle: string,
  pdfPath: string
) {
  const resend = getResend();
  const pdfBuffer = await fs.readFile(pdfPath);
  const pdfBase64 = pdfBuffer.toString("base64");

  await resend.emails.send({
    from: FROM(),
    to: [`${name} <${to}>`],
    subject: `Diploma de participación — ${eventTitle}`,
    html: `
      <p>Estimado/a ${escapeHtml(name)},</p>
      <p>Adjunto encontrará su diploma de participación en <strong>${escapeHtml(eventTitle)}</strong>.</p>
      <p>Saludos,<br>El equipo de Grillo</p>
    `,
    attachments: [
      {
        filename: "diploma.pdf",
        content: pdfBase64,
      },
    ],
  });
}

// Sends a certificate PDF held in memory (no disk round-trip). Used by the
// CSV-driven certificate module, which regenerates PDFs on demand rather than
// storing them on the ephemeral container disk.
export async function sendCertificateBuffer(
  to: string,
  data: { recipientName: string; activityTitle: string; activityDate: string; role: string },
  pdfBuffer: Buffer,
  opts: { filename?: string; subjectPrefix?: string } = {}
) {
  const { filename = "certificado.pdf", subjectPrefix = "" } = opts;
  const resend = getResend();
  const res = await resend.emails.send({
    from: FROM(),
    to: [`${data.recipientName} <${to}>`],
    subject: `${subjectPrefix}Certificado de participación — ${data.activityTitle}`,
    html: buildCertificateEmailHtml(data),
    attachments: [{ filename, content: pdfBuffer.toString("base64") }],
  });
  // The Resend message id lets the webhook match email.opened back to this cert.
  return res.data?.id ?? null;
}

// Escapes values interpolated into email HTML bodies (recipient name, activity
// title) to prevent HTML injection from CSV-supplied data.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}
