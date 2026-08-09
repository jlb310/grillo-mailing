import { prisma } from "@/lib/prisma";
import { runSend } from "@/lib/send-campaign";
import { checkStatsReports } from "@/lib/stats-report";

let started = false;

export function startScheduler() {
  if (started) return;
  started = true;
  console.log("[scheduler] Started — polling every 60s for scheduled campaigns");

  // Check immediately on boot (catches missed schedules from deploys/restarts)
  checkScheduled();

  setInterval(checkScheduled, 60_000);
}

async function checkScheduled() {
  try {
    const due = await prisma.campaign.findMany({
      where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
      select: { id: true, subject: true },
    });

    for (const campaign of due) {
      console.log(`[scheduler] Triggering campaign "${campaign.subject}" (${campaign.id})`);
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "SENDING" },
      });
      runSend(campaign.id); // fire and forget — same as manual send
    }
  } catch (err) {
    console.error("[scheduler] Error checking scheduled campaigns:", err);
  }

  // 24h post-send stats reports (opens/clicks) to notifyEmails.
  await checkStatsReports();
}
