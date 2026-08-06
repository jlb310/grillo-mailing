import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Schedules the 3 sends of the "XI Jornadas de Investigación CAS-UDD" mailing
// (brief de Karina Cerda): reprograms the base campaign (created DRAFT by
// seed-jornada-investigacion.ts) for the first date and clones it once per
// remaining date. Idempotent — a clone is only created if one with the same
// (subject, scheduledAt) does not already exist, and the base is only
// rescheduled if it isn't already set — so it is safe on every deploy (same
// pattern as schedule-digestiva-sends.ts).
//
// Times: 08:00 CLT (America/Santiago, UTC-4 until 6-Sep-2026) = 12:00 UTC.
const CAMPAIGN_ID = "cmrtmoqfh02r8joqn93qtjqxh"; // base creado por el seed (Asunto A, DRAFT)

const SUBJECT_A =
  '¡Inscripciones Abiertas! XI Jornadas de Investigación CAS-UDD, “Conectando Conocimiento: Comunicando Investigación que Transforma”';
const SUBJECT_B =
  '¡Últimos cupos! XI Jornadas de Investigación CAS-UDD, “Conectando Conocimiento: Comunicando Investigación que Transforma”';

// Inicial: reschedule the base campaign itself (not a clone).
const INITIAL = {
  whenUTC: "2026-07-23T12:00:00.000Z",
  subject: SUBJECT_A,
  labelCL: "Jue 23 jul 08:00 — inicial",
};

const SENDS: { whenUTC: string; subject: string; labelCL: string }[] = [
  { whenUTC: "2026-08-03T12:00:00.000Z", subject: SUBJECT_A, labelCL: "Lun 3 ago 08:00 — 1ª repetición" },
  { whenUTC: "2026-08-10T12:00:00.000Z", subject: SUBJECT_B, labelCL: "Lun 10 ago 08:00 — últimos cupos" },
];

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const base = await prisma.campaign.findUnique({
    where: { id: CAMPAIGN_ID },
    include: { contactGroups: { select: { id: true } } },
  });

  if (!base) {
    console.log(`[schedule-jornada-investigacion] Base campaign ${CAMPAIGN_ID} not found. Skipping.`);
    return;
  }

  // Reschedule the inicial send (the base campaign), unless it already went out.
  const initialWhen = new Date(INITIAL.whenUTC);
  if (base.status === "SENT" || base.status === "SENDING") {
    console.log(`[schedule-jornada-investigacion] Inicial already ${base.status} (${base.id}). Not rescheduling.`);
  } else if (base.subject === INITIAL.subject && base.scheduledAt?.getTime() === initialWhen.getTime() && base.status === "SCHEDULED") {
    console.log(`[schedule-jornada-investigacion] Inicial already set to ${INITIAL.labelCL}. Skipping.`);
  } else {
    await prisma.campaign.update({
      where: { id: base.id },
      data: { subject: INITIAL.subject, status: "SCHEDULED", scheduledAt: initialWhen },
    });
    console.log(`[schedule-jornada-investigacion] ✔ Programado inicial → ${INITIAL.labelCL} (${INITIAL.whenUTC}) — campaign ${base.id}`);
  }

  for (const s of SENDS) {
    const when = new Date(s.whenUTC);

    const existing = await prisma.campaign.findFirst({
      where: { subject: s.subject, scheduledAt: when },
    });
    if (existing) {
      // Self-heal: keep the clone's htmlBody in sync with the base so template
      // fixes reach already-created clones too.
      if (existing.htmlBody !== base.htmlBody && existing.status !== "SENT" && existing.status !== "SENDING") {
        await prisma.campaign.update({ where: { id: existing.id }, data: { htmlBody: base.htmlBody } });
        console.log(`[schedule-jornada-investigacion] ↻ Re-synced htmlBody for ${s.labelCL} (${existing.id}).`);
      } else {
        console.log(`[schedule-jornada-investigacion] ${s.labelCL} already scheduled & in sync (${existing.id}). Skipping.`);
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

    console.log(`[schedule-jornada-investigacion] ✔ Scheduled "${s.subject}" for ${s.labelCL} (${s.whenUTC}) — campaign ${clone.id}`);
  }
}

main()
  .catch((e) => { console.error("[schedule-jornada-investigacion]", e); process.exit(0); /* non-fatal */ })
  .finally(() => prisma.$disconnect());
