import { prisma } from "@/lib/prisma";
import { getResend, FROM, REPORT_RECIPIENTS } from "@/lib/resend";
import { BASE_URL } from "@/lib/base-url";

// 24h after a campaign is sent, email its tracking stats (opens, clicks,
// bounces, rates) to the same notifyEmails that got the "Envío completado"
// notice. The completion email can't carry these numbers — opens/clicks only
// start arriving after the send — so they get their own follow-up report.
const REPORT_DELAY_MS = 24 * 60 * 60 * 1000;

function pct(part: number, total: number): string {
  return total > 0 ? `${Math.round((part / total) * 100)}%` : "—";
}

function row(label: string, value: string, alt: boolean, color = "#1f2937"): string {
  return `<tr${alt ? ' style="background:#f9f9f9"' : ""}><td style="padding:10px 14px;color:#444">${label}</td><td style="padding:10px 14px;text-align:right;font-weight:600;color:${color}">${value}</td></tr>`;
}

async function sendStatsReport(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { sendLogs: { select: { resendId: true, openedAt: true, clickedAt: true, bouncedAt: true } } },
  });
  if (!campaign) return;
  // Fall back to the ops inbox when the campaign has no notifyEmails set, so a
  // report always goes somewhere instead of silently vanishing.
  const recipients = campaign.notifyEmails.length ? campaign.notifyEmails : REPORT_RECIPIENTS();
  if (recipients.length === 0) return;

  const total   = campaign.sendLogs.length;
  const sent    = campaign.sendLogs.filter(l => l.resendId).length;
  const opens   = campaign.sendLogs.filter(l => l.openedAt).length;
  const clicks  = campaign.sendLogs.filter(l => l.clickedAt).length;
  const bounces = campaign.sendLogs.filter(l => l.bouncedAt).length;

  const untracked = campaign.openTrackingAtSend === false;
  const trackingNote = untracked
    ? `<p style="margin:16px 0 0;font-size:13px;color:#b45309">⚠️ Este envío salió sin seguimiento de aperturas/clics activo, por lo que esos valores no se midieron.</p>`
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px">
      <h2 style="color:#00A99D;margin:0 0 8px">📊 Estadísticas de envío (24 h)</h2>
      <p style="color:#555;margin:0 0 24px">Campaña: <strong>${campaign.subject}</strong></p>
      <table style="width:100%;border-collapse:collapse;font-size:15px">
        ${row("Enviados", sent.toLocaleString("es-CL"), true)}
        ${row("Aperturas", `${opens.toLocaleString("es-CL")} (${pct(opens, sent)})`, false, "#00A99D")}
        ${row("Clics", `${clicks.toLocaleString("es-CL")} (${pct(clicks, sent)})`, true, "#00A99D")}
        ${row("Rebotes", `${bounces.toLocaleString("es-CL")} (${pct(bounces, sent)})`, false, bounces > 0 ? "#dc2626" : "#1f2937")}
      </table>
      ${trackingNote}
      <p style="margin:24px 0 0;font-size:13px;color:#888">Las cifras siguen actualizándose después de este corte — el detalle completo y al día está en <a href="${BASE_URL}/admin/campanas/${campaign.id}" style="color:#00A99D">la plataforma</a>.</p>
      <p style="margin:8px 0 0;font-size:13px;color:#aaa">${new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" })}</p>
    </div>`;

  const resend = getResend();
  await resend.batch.send(
    recipients.map(to => ({
      from: FROM(),
      to: [to],
      subject: `📊 Estadísticas (24 h): ${campaign.subject}`,
      html,
    }))
  );

  console.log(`[stats-report] Sent 24h stats report for campaign ${campaignId} (${sent} sent, ${opens} opens, ${clicks} clicks).`);
}

export async function checkStatsReports() {
  try {
    const due = await prisma.campaign.findMany({
      where: {
        status: "SENT",
        statsReportSentAt: null,
        sentAt: { lte: new Date(Date.now() - REPORT_DELAY_MS) },
      },
      select: { id: true, subject: true },
    });

    for (const campaign of due) {
      // Mark first so a crash mid-send can't loop into duplicate reports; a
      // missed report is recoverable from the admin, a duplicate blast is noise.
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { statsReportSentAt: new Date() },
      });
      await sendStatsReport(campaign.id);
    }
  } catch (err) {
    console.error("[stats-report] Error checking due stats reports:", err);
  }
}
