import { prisma } from "@/lib/prisma";
import { getResend, FROM, REPORT_RECIPIENTS, resolveEmpresaSender } from "@/lib/resend";
import { getTrackingStatus } from "@/lib/resend-status";
import { BASE_URL } from "@/lib/base-url";

const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 5 * 60 * 1000;
// Resend caps at 5 requests/second. The individual retry loop fires one request
// per email, so pace it to stay under that limit (200ms = 5/s; 250ms has margin).
const SEND_DELAY_MS = 250;
const INTERNAL_RECIPIENTS = ["hola@grillo.click"];

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(res => setTimeout(res, ms));
}

function toAddress(name: string, email: string): string {
  const clean = (name ?? "").trim().replace(/[,;<>"]/g, " ").replace(/\s+/g, " ").trim();
  return clean ? `${clean} <${email}>` : email;
}

// Daily quota stops the run partway through. Leaving the campaign in DRAFT would
// strand the remaining recipients (the scheduler only triggers SCHEDULED), so we
// re-schedule for ~24h later. The next run resumes only the still-pending logs
// (resendId === null), so nobody gets a duplicate.
async function rescheduleForTomorrow(campaignId: string) {
  const resumeAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "SCHEDULED", scheduledAt: resumeAt },
  });
  return resumeAt;
}

type SingleResult = "sent" | "invalid" | "ratelimit" | "quota";

// Send one email, classifying the outcome instead of treating every failure as a
// bad address. 429/rate_limit is transient (back off and retry); daily quota stops
// the run; only a genuine rejection (e.g. 422) counts as an invalid address.
async function sendOne(
  resend: ReturnType<typeof getResend>,
  from: string,
  subject: string,
  e: { to: string; name: string; logId: string; html: string }
): Promise<SingleResult> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const single = await resend.emails.send({
      from,
      to: [toAddress(e.name, e.to)],
      subject,
      html: e.html,
    });

    if (single.data?.id) {
      await prisma.sendLog.update({ where: { id: e.logId }, data: { resendId: single.data.id } });
      return "sent";
    }

    const err = (single.error ?? {}) as { statusCode?: number; name?: string };
    if (err.name === "daily_quota_exceeded") return "quota";
    if (err.statusCode === 429 || err.name === "rate_limit_exceeded") {
      await sleep(1000 * (attempt + 1)); // linear backoff: 1s, 2s, 3s
      continue;
    }
    // Genuine rejection (malformed/undeliverable address) — skip permanently.
    console.error(`[send] Skipping bad address: "${toAddress(e.name, e.to)}" — ${JSON.stringify(single.error)}`);
    return "invalid";
  }
  // Exhausted retries while rate-limited: leave the log pending (resendId stays
  // null) so it is retried on the next run instead of being lost.
  console.warn(`[send] Rate-limited after retries, leaving pending for next run: ${e.to}`);
  return "ratelimit";
}

async function sendNotifySummary(
  campaign: { id: string; subject: string; notifyEmails: string[] },
  stats: { sent: number; skipped: number; total: number }
) {
  // Fall back to the ops inbox when the campaign has no notifyEmails set, so the
  // completion notice always goes somewhere instead of silently vanishing.
  const recipients = campaign.notifyEmails.length ? campaign.notifyEmails : REPORT_RECIPIENTS();
  if (recipients.length === 0) return;
  const resend = getResend();
  const { sent, skipped, total } = stats;
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px">
      <h2 style="color:#00A99D;margin:0 0 8px">Envío completado</h2>
      <p style="color:#555;margin:0 0 24px">Campaña: <strong>${campaign.subject}</strong></p>
      <table style="width:100%;border-collapse:collapse;font-size:15px">
        <tr style="background:#f9f9f9"><td style="padding:10px 14px;color:#444">Total en lista</td><td style="padding:10px 14px;text-align:right;font-weight:600">${total.toLocaleString("es-CL")}</td></tr>
        <tr><td style="padding:10px 14px;color:#444">Enviados a Resend</td><td style="padding:10px 14px;text-align:right;font-weight:600;color:#00A99D">${sent.toLocaleString("es-CL")}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:10px 14px;color:#444">Omitidos (email inválido)</td><td style="padding:10px 14px;text-align:right;font-weight:600;color:#888">${skipped.toLocaleString("es-CL")}</td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:13px;color:#888">📊 En 24 h recibirás un segundo correo con las estadísticas de este envío (aperturas, clics y rebotes).</p>
      <p style="margin:8px 0 0;font-size:13px;color:#aaa">${new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" })}</p>
    </div>`;

  await resend.batch.send(
    recipients.map(to => ({
      from: FROM(),
      to: [to],
      subject: `✅ Envío completado: ${campaign.subject}`,
      html,
    }))
  );
}

export async function runSend(campaignId: string) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        empresa: { include: { contacts: { where: { unsubscribed: false, bounced: false } } } },
        contactGroups: { include: { contacts: { where: { unsubscribed: false, bounced: false } } } },
      },
    });
    if (!campaign) return;

    // Own Resend account/domain when the empresa has one configured, else the
    // shared Grillo account — this is what actually sends to real recipients.
    const sender = resolveEmpresaSender(campaign.empresa);

    // Snapshot whether Resend open/click tracking is active at send time, so the
    // metrics UI can distinguish "0 opens because untracked" from "0 opens for
    // real" per campaign. Diagnose whichever account is actually sending. Never
    // let a diagnosis failure block the actual send.
    const tracking = await getTrackingStatus(
      sender.apiKey ? { apiKey: sender.apiKey, fromEmail: sender.from, webhookSecretSet: !!campaign.empresa.resendWebhookSecretEncrypted } : {}
    ).catch(() => null);
    const trackingData = {
      openTrackingAtSend: tracking ? tracking.active && tracking.domainOpenTracking : false,
      clickTrackingAtSend: tracking ? tracking.active && tracking.domainClickTracking : false,
    };

    const allContacts = campaign.contactGroups.length > 0
      ? Array.from(new Map(campaign.contactGroups.flatMap(g => g.contacts).map(c => [c.id, c])).values())
      : campaign.empresa.contacts;

    await prisma.sendLog.createMany({
      data: allContacts.map(c => ({ campaignId, contactId: c.id })),
      skipDuplicates: true,
    });

    const pendingLogs = await prisma.sendLog.findMany({
      where: { campaignId, resendId: null },
      select: { id: true, contactId: true },
    });

    if (pendingLogs.length === 0) {
      console.log(`[send] Campaign ${campaignId}: nothing pending, marking SENT.`);
      await prisma.campaign.update({ where: { id: campaignId }, data: { status: "SENT", sentAt: new Date(), ...trackingData } });
      return;
    }

    const contactById = new Map(allContacts.map(c => [c.id, c]));
    const viewUrl = `${BASE_URL}/email/${campaignId}`;

    let skippedCount = 0;
    const emails = pendingLogs
      .map(log => {
        const c = contactById.get(log.contactId);
        if (!c) return null;
        if (!/^[\x20-\x7E]+$/.test(c.email)) {
          console.log(`[send] Skipping non-ASCII email: ${c.email}`);
          skippedCount++;
          return null;
        }
        if (!/^[^\s@,]+@[^\s@,]+\.[^\s@,]{2,}$/.test(c.email)) {
          console.log(`[send] Skipping invalid email format: ${c.email}`);
          skippedCount++;
          return null;
        }
        const html = campaign.htmlBody
          .replace(/\{\{UNSUBSCRIBE_URL\}\}/g, `${BASE_URL}/api/unsubscribe?token=${log.id}`)
          .replace(/\{\{VIEW_URL\}\}/g, viewUrl);
        return { to: c.email, name: c.name, logId: log.id, html };
      })
      .filter(Boolean) as { to: string; name: string; logId: string; html: string }[];

    const resend = sender.resend;
    const batches = chunk(emails, BATCH_SIZE);

    console.log(`[send] Campaign ${campaignId}: ${emails.length} pending, ${batches.length} batches, from ${sender.from}`);

    const internalHtml = campaign.htmlBody
      .replace(/\{\{UNSUBSCRIBE_URL\}\}/g, "#")
      .replace(/\{\{VIEW_URL\}\}/g, viewUrl);
    const internalResult = await resend.batch.send(
      INTERNAL_RECIPIENTS.map(to => ({
        from: sender.from,
        to: [to],
        subject: campaign.subject,
        html: internalHtml,
      }))
    );
    if (internalResult.error) {
      console.warn(`[send] Internal recipients send failed:`, internalResult.error);
    } else {
      console.log(`[send] Internal recipients sent: ${INTERNAL_RECIPIENTS.length}`);
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`[send] Batch ${i + 1}/${batches.length} — ${batch.length} emails`);

      const result = await resend.batch.send(
        batch.map(e => ({
          from: sender.from,
          to: [toAddress(e.name, e.to)],
          subject: campaign.subject,
          html: e.html,
        }))
      );

      if (result.error) {
        const err = result.error as { statusCode?: number; name?: string };
        // A batch.send is a single request, so a per-second rate limit here is
        // rare — but if it happens, wait and retry the same batch (don't stop).
        if (err.name === "rate_limit_exceeded") {
          console.warn(`[send] Rate limit en batch ${i + 1} — esperando 2s y reintentando...`);
          await sleep(2000);
          i--;
          continue;
        }
        if (err.statusCode === 429 || err.name === "daily_quota_exceeded") {
          const resumeAt = await rescheduleForTomorrow(campaignId);
          console.warn(`[send] Quota diaria alcanzada en batch ${i + 1}. Reanudando ${resumeAt.toISOString()}.`);
          return;
        }
        if (err.statusCode === 422) {
          console.warn(`[send] Batch ${i + 1} 422 — retrying individually`);
          let batchSent = 0;
          let batchSkipped = 0;
          for (const e of batch) {
            const outcome = await sendOne(resend, sender.from, campaign.subject, e);
            if (outcome === "sent") {
              batchSent++;
            } else if (outcome === "invalid") {
              skippedCount++;
              batchSkipped++;
            } else if (outcome === "quota") {
              // Daily quota hit mid-retry: stop and resume tomorrow. Emails already
              // sent in this batch kept their resendId; the rest stay pending.
              const resumeAt = await rescheduleForTomorrow(campaignId);
              console.warn(`[send] Quota diaria alcanzada durante el batch ${i + 1}. Reanudando ${resumeAt.toISOString()}.`);
              return;
            }
            // "ratelimit" → left pending, retried next run; no delay needed after it.
            if (outcome !== "ratelimit") await sleep(SEND_DELAY_MS);
          }
          console.log(`[send] Batch ${i + 1} individual retry done: ${batchSent} sent, ${batchSkipped} invalid skipped`);
          continue;
        }
        throw new Error(`Resend batch ${i + 1} error: ${JSON.stringify(result.error)}`);
      }

      const sentData = result.data as unknown as { data?: Array<{ id?: string }> } | Array<{ id?: string }> | null;
      const sent = Array.isArray(sentData) ? sentData : (sentData as { data?: Array<{ id?: string }> })?.data ?? null;
      if (sent) {
        await Promise.all(
          sent.map((r, j) =>
            r?.id
              ? prisma.sendLog.update({ where: { id: batch[j].logId }, data: { resendId: r.id } })
              : Promise.resolve()
          )
        );
      }

      if (i < batches.length - 1) {
        console.log(`[send] Waiting 5 min before batch ${i + 2}...`);
        await new Promise(res => setTimeout(res, BATCH_DELAY_MS));
      }
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "SENT", sentAt: new Date(), ...trackingData },
    });

    console.log(`[send] Campaign ${campaignId} completed.`);

    await sendNotifySummary(
      { id: campaignId, subject: campaign.subject, notifyEmails: campaign.notifyEmails },
      { sent: emails.length, skipped: skippedCount, total: allContacts.length }
    );
  } catch (err) {
    console.error("[send] Background send error:", err);
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "DRAFT" },
    }).catch(() => {});
  }
}
