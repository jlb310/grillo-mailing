import { getResend, FROM } from "@/lib/resend";

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

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}
