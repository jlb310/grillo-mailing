import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Schedules the V Simposio Salud de la Mujer reminder drip by cloning the base
// campaign once per send date. Idempotent: a clone is only created if one with
// the same (subject, scheduledAt) does not already exist, so it is safe to run
// on every deploy (same pattern as apply-jornada-logos / apply-simposio-footer).
//
// Times are UTC. Chile (America/Santiago) is UTC-4 in Jun–Jul 2026, so each UTC
// time is the intended Chile local time + 4h.
const TITLE_FRAGMENTS = ["Simposio", "Mujer"];
const ULTIMOS_CUPOS_SUBJECT = "¡Últimos cupos! V Simposio Salud de la Mujer";

const SENDS: { whenUTC: string; subjectMode: "base" | "ultimos"; labelCL: string }[] = [
  { whenUTC: "2026-06-03T13:00:00.000Z", subjectMode: "base",    labelCL: "Mié 3 jun 09:00" },
  { whenUTC: "2026-06-08T12:30:00.000Z", subjectMode: "base",    labelCL: "Lun 8 jun 08:30" },
  { whenUTC: "2026-06-23T14:00:00.000Z", subjectMode: "base",    labelCL: "Mar 23 jun 10:00" },
  { whenUTC: "2026-07-06T14:00:00.000Z", subjectMode: "ultimos", labelCL: "Lun 6 jul 10:00" },
  { whenUTC: "2026-07-14T13:00:00.000Z", subjectMode: "ultimos", labelCL: "Mar 14 jul 09:00" },
  { whenUTC: "2026-07-20T12:00:00.000Z", subjectMode: "ultimos", labelCL: "Lun 20 jul 08:00" },
];

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const all = await prisma.campaign.findMany({ orderBy: { createdAt: "asc" } });
  const matches = all.filter((c) => {
    const hay = `${c.subject ?? ""} ${c.emailTitle ?? ""}`.toLowerCase();
    return TITLE_FRAGMENTS.every((f) => hay.includes(f.toLowerCase()));
  });

  if (matches.length === 0) {
    console.log(`[schedule-simposio-sends] No base campaign matched ${JSON.stringify(TITLE_FRAGMENTS)}. Skipping.`);
    return;
  }

  // Base = earliest-created matching campaign (the original, before any clones).
  const base = matches[0];

  for (const s of SENDS) {
    const when = new Date(s.whenUTC);
    const subject = s.subjectMode === "ultimos" ? ULTIMOS_CUPOS_SUBJECT : base.subject;

    const existing = matches.find(
      (c) => c.subject === subject && c.scheduledAt?.getTime() === when.getTime()
    );
    if (existing) {
      console.log(`[schedule-simposio-sends] ${s.labelCL} already scheduled (campaign ${existing.id}). Skipping.`);
      continue;
    }

    const clone = await prisma.campaign.create({
      data: {
        eventId: base.eventId,
        subject,
        htmlBody: base.htmlBody,
        emailTitle: base.emailTitle,
        emailSubtitle: base.emailSubtitle,
        emailDate: base.emailDate,
        emailLocation: base.emailLocation,
        emailBody: base.emailBody,
        ctaText: base.ctaText,
        ctaUrl: base.ctaUrl,
        logoUrl: base.logoUrl,
        logoHeight: base.logoHeight,
        logoAlign: base.logoAlign,
        logoRightUrl: base.logoRightUrl,
        logoRightHeight: base.logoRightHeight,
        logoRight2Url: base.logoRight2Url,
        logoRight2Height: base.logoRight2Height,
        headerColor: base.headerColor,
        footerText: base.footerText,
        blocks: base.blocks ?? undefined,
        ctaButtons: base.ctaButtons ?? undefined,
        programaUrl: base.programaUrl,
        useAlemanaFooter: base.useAlemanaFooter,
        eventInfoButtons: base.eventInfoButtons,
        notifyEmails: base.notifyEmails,
        status: "SCHEDULED",
        scheduledAt: when,
      },
    });

    console.log(`[schedule-simposio-sends] ✔ Scheduled "${subject}" for ${s.labelCL} (${s.whenUTC}) — campaign ${clone.id}`);
  }
}

main()
  .catch((e) => { console.error("[schedule-simposio-sends]", e); process.exit(0); /* non-fatal */ })
  .finally(() => prisma.$disconnect());
