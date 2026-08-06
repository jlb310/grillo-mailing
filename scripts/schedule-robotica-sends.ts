import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Schedules the "I Simposio Internacional de Cirugía Robótica y Nuevas
// Tecnologías en Cadera y Rodilla" reminder drip by cloning the base campaign
// once per send date. Idempotent: a clone is only created if one with the same
// (subject, scheduledAt) does not already exist, so it is safe to run on every
// deploy (same pattern as schedule-simposio-sends.ts).
//
// The base campaign is the "inicial" send (originally scheduled Thu 11/06 but
// never sent); it is reprogrammed below to Mon 15/06 14:00 Chile. The 6 SENDS
// are the repeticiones, created as clones. Clones copy htmlBody verbatim, so
// they inherit the Alemana corporate footer applied by apply-robotica-footer.ts
// (which runs before this script in docker-entrypoint.sh).
//
// Times are UTC. Chile (America/Santiago) is UTC-4 through 5 Sep 2026 (DST
// starts 6 Sep 2026): 18:00 UTC = 14:00 Chile, 13:00 UTC = 09:00 Chile.
const CAMPAIGN_ID = "cmq9k5hvg000101peril4ity3";

// Inicial: reschedule the base campaign itself (not a clone).
const INITIAL = {
  whenUTC: "2026-06-15T18:00:00.000Z",
  subject:
    "¡Nueva Jornada de Educación Continua! | I Simposio Internacional de Cirugía Robótica y Nuevas Tecnologías en Cadera y Rodilla",
  labelCL: "Lun 15 jun 14:00 — inicial (reprogramado de jue 11)",
};

const SENDS: { whenUTC: string; subject: string; labelCL: string }[] = [
  {
    whenUTC: "2026-06-25T13:00:00.000Z",
    subject:
      "Te invitamos a inscribirte en el en I Simposio Internacional de Cirugía Robótica y Nuevas Tecnologías en Cadera y Rodilla Sept. 2026",
    labelCL: "Jue 25 jun 09:00 — 1ª repetición",
  },
  {
    whenUTC: "2026-07-30T13:00:00.000Z",
    subject:
      "Actualiza tus conocimientos en en I Simposio Internacional de Cirugía Robótica y Nuevas Tecnologías en Cadera y Rodilla Sept. 2026",
    labelCL: "Jue 30 jul 09:00 — 2ª repetición",
  },
  {
    whenUTC: "2026-08-06T13:00:00.000Z",
    subject:
      "¡No te lo pierdas! Inscríbete pronto en la en I Simposio Internacional de Cirugía Robótica y Nuevas Tecnologías en Cadera y Rodilla",
    labelCL: "Jue 6 ago 09:00 — 3ª repetición",
  },
  {
    whenUTC: "2026-08-20T13:00:00.000Z",
    subject:
      "Últimos Cupos I Simposio Internacional de Cirugía Robótica y Nuevas Tecnologías en Cadera y Rodilla",
    labelCL: "Jue 20 ago 09:00 — 4ª repetición",
  },
  {
    whenUTC: "2026-08-27T13:00:00.000Z",
    subject:
      "Últimos Cupos I Simposio Internacional de Cirugía Robótica y Nuevas Tecnologías en Cadera y Rodilla",
    labelCL: "Jue 27 ago 09:00 — 5ª repetición",
  },
  {
    whenUTC: "2026-09-01T13:00:00.000Z",
    subject:
      "Últimos días para participar del I Simposio Internacional de Cirugía Robótica y Nuevas Tecnologías en Cadera y Rodilla",
    labelCL: "Mar 1 sep 09:00 — 6ª repetición",
  },
];

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const base = await prisma.campaign.findUnique({ where: { id: CAMPAIGN_ID } });

  if (!base) {
    console.log(`[schedule-robotica-sends] Base campaign ${CAMPAIGN_ID} not found. Skipping.`);
    return;
  }

  // Reschedule the inicial send (the base campaign), unless it already went out.
  const initialWhen = new Date(INITIAL.whenUTC);
  if (base.status === "SENT" || base.status === "SENDING") {
    console.log(`[schedule-robotica-sends] Inicial already ${base.status} (campaign ${base.id}). Not rescheduling.`);
  } else if (base.subject === INITIAL.subject && base.scheduledAt?.getTime() === initialWhen.getTime() && base.status === "SCHEDULED") {
    console.log(`[schedule-robotica-sends] Inicial already set to ${INITIAL.labelCL}. Skipping.`);
  } else {
    await prisma.campaign.update({
      where: { id: base.id },
      data: { subject: INITIAL.subject, status: "SCHEDULED", scheduledAt: initialWhen },
    });
    console.log(`[schedule-robotica-sends] ✔ Reprogramado inicial "${INITIAL.subject}" → ${INITIAL.labelCL} (${INITIAL.whenUTC}) — campaign ${base.id}`);
  }

  for (const s of SENDS) {
    const when = new Date(s.whenUTC);

    const existing = await prisma.campaign.findFirst({
      where: { subject: s.subject, scheduledAt: when },
    });
    if (existing) {
      // Self-heal: keep the clone's htmlBody in sync with the base so template
      // fixes (e.g. the forward-safe button) reach already-created clones too.
      if (existing.htmlBody !== base.htmlBody && existing.status !== "SENT" && existing.status !== "SENDING") {
        await prisma.campaign.update({ where: { id: existing.id }, data: { htmlBody: base.htmlBody } });
        console.log(`[schedule-robotica-sends] ↻ Re-synced htmlBody for ${s.labelCL} (campaign ${existing.id}).`);
      } else {
        console.log(`[schedule-robotica-sends] ${s.labelCL} already scheduled & in sync (campaign ${existing.id}). Skipping.`);
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
        useAlemanaFooter: base.useAlemanaFooter,
        eventInfoButtons: base.eventInfoButtons,
        notifyEmails: base.notifyEmails,
        status: "SCHEDULED",
        scheduledAt: when,
      },
    });

    console.log(`[schedule-robotica-sends] ✔ Scheduled "${s.subject}" for ${s.labelCL} (${s.whenUTC}) — campaign ${clone.id}`);
  }
}

main()
  .catch((e) => { console.error("[schedule-robotica-sends]", e); process.exit(0); /* non-fatal */ })
  .finally(() => prisma.$disconnect());
