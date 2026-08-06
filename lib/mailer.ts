import { getResend, FROM } from "@/lib/resend";
import { buildCertificateEmailHtml } from "@/lib/certificate-template";

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

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}
