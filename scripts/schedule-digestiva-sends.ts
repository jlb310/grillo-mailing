import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Schedules the "III Jornada de Cirugía Mínimamente Invasiva en Cirugía
// Digestiva" drip by reprogramming the base campaign for the first send and
// cloning it once per remaining date. Idempotent: a clone is only created if
// one with the same (subject, scheduledAt) does not already exist, so it is
// safe to run on every deploy (same pattern as schedule-robotica-sends.ts).
//
// Clones copy htmlBody verbatim, so they inherit the image-above-info order
// applied by apply-digestiva-image-order.ts (which runs earlier in
// docker-entrypoint.sh), and connect the base's contact groups (if any) so
// they target the same audience.
//
// The client's brief said "junio" for the first two dates, but 15/06 is a
// Monday and 27/06 a Saturday (both already past); the stated weekdays
// (miércoles 15, lunes 27) only match JULY 2026, so these are scheduled in July.
//
// Times are UTC. Chile (America/Santiago) is UTC-4 through 5 Sep 2026 (DST
// starts 6 Sep 2026, then UTC-3).
const CAMPAIGN_ID = "cmrjbud66000107l28h69oxve";

const SUBJECT_A = "Inscripciones abiertas a la III Jornada de Cirugía Mínimamente Invasiva en Cirugía Digestiva";
const SUBJECT_B = "No te pierdas la III Jornada de Cirugía Mínimamente Invasiva en Cirugía Digestiva";

// Inicial: reschedule the base campaign itself (not a clone).
const INITIAL = {
  whenUTC: "2026-07-15T20:00:00.000Z",
  subject: SUBJECT_A,
  labelCL: "Mié 15 jul 16:00 — inicial",
};

const SENDS: { whenUTC: string; subject: string; labelCL: string }[] = [
  { whenUTC: "2026-07-27T11:30:00.000Z", subject: SUBJECT_A, labelCL: "Lun 27 jul 07:30 — 1ª repetición" },
  { whenUTC: "2026-08-24T12:00:00.000Z", subject: SUBJECT_A, labelCL: "Lun 24 ago 08:00 — 2ª repetición" },
  { whenUTC: "2026-09-10T16:00:00.000Z", subject: SUBJECT_B, labelCL: "Jue 10 sep 13:00 — 3ª repetición" },
  { whenUTC: "2026-09-21T10:00:00.000Z", subject: SUBJECT_B, labelCL: "Lun 21 sep 07:00 — 4ª repetición" },
  { whenUTC: "2026-10-02T11:00:00.000Z", subject: SUBJECT_B, labelCL: "Vie 2 oct 08:00 — 5ª repetición" },
];

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const base = await prisma.campaign.findUnique({
    where: { id: CAMPAIGN_ID },
    include: { contactGroups: { select: { id: true } } },
  });

  if (!base) {
    console.log(`[schedule-digestiva-sends] Base campaign ${CAMPAIGN_ID} not found. Skipping.`);
    return;
  }

  // Reschedule the inicial send (the base campaign), unless it already went out.
  const initialWhen = new Date(INITIAL.whenUTC);
  if (base.status === "SENT" || base.status === "SENDING") {
    console.log(`[schedule-digestiva-sends] Inicial already ${base.status} (campaign ${base.id}). Not rescheduling.`);
  } else if (base.subject === INITIAL.subject && base.scheduledAt?.getTime() === initialWhen.getTime() && base.status === "SCHEDULED") {
    console.log(`[schedule-digestiva-sends] Inicial already set to ${INITIAL.labelCL}. Skipping.`);
  } else {
    await prisma.campaign.update({
      where: { id: base.id },
      data: { subject: INITIAL.subject, status: "SCHEDULED", scheduledAt: initialWhen },
    });
    console.log(`[schedule-digestiva-sends] ✔ Programado inicial "${INITIAL.subject}" → ${INITIAL.labelCL} (${INITIAL.whenUTC}) — campaign ${base.id}`);
  }

  for (const s of SENDS) {
    const when = new Date(s.whenUTC);

    const existing = await prisma.campaign.findFirst({
      where: { subject: s.subject, scheduledAt: when },
    });
    if (existing) {
      // Self-heal: keep the clone's htmlBody in sync with the base so template
      // fixes (e.g. the image-above-info order) reach already-created clones too.
      if (existing.htmlBody !== base.htmlBody && existing.status !== "SENT" && existing.status !== "SENDING") {
        await prisma.campaign.update({ where: { id: existing.id }, data: { htmlBody: base.htmlBody } });
        console.log(`[schedule-digestiva-sends] ↻ Re-synced htmlBody for ${s.labelCL} (campaign ${existing.id}).`);
      } else {
        console.log(`[schedule-digestiva-sends] ${s.labelCL} already scheduled & in sync (campaign ${existing.id}). Skipping.`);
      }
      continue;
    }

    const clone = await prisma.campaign.create({
      data: {
        eventId: base.eventId,
        subject: s.subject,
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
        iconDate: base.iconDate,
        iconLinkText: base.iconLinkText,
        iconLinkUrl: base.iconLinkUrl,
        useAlemanaFooter: base.useAlemanaFooter,
        eventInfoButtons: base.eventInfoButtons,
        notifyEmails: base.notifyEmails,
        contactGroups: base.contactGroups.length > 0
          ? { connect: base.contactGroups.map((g) => ({ id: g.id })) }
          : undefined,
        status: "SCHEDULED",
        scheduledAt: when,
      },
    });

    console.log(`[schedule-digestiva-sends] ✔ Scheduled "${s.subject}" for ${s.labelCL} (${s.whenUTC}) — campaign ${clone.id}`);
  }
}

main()
  .catch((e) => { console.error("[schedule-digestiva-sends]", e); process.exit(0); /* non-fatal */ })
  .finally(() => prisma.$disconnect());
