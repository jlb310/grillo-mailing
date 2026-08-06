import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Schedules the sends of the "II Simposio de Actualización en Demencias y
// Trastornos del Movimiento" mailing (brief de Rosa Cordero, 31-jul-2026):
// clones the base campaign (created DRAFT by seed-simposio-demencias.ts) once
// per date. Idempotent — a clone is only created if one with the same
// (subject, scheduledAt) does not already exist, and already-created clones get
// their htmlBody re-synced from the base, so it is safe on every deploy (same
// pattern as schedule-jornada-investigacion-sends.ts).
//
// El primer envío del brief se corrió un día: Rosa lo pidió para el martes 4 de
// agosto a las 09:00 CLT, pero esa hora ya había pasado cuando la campaña quedó
// lista (el scheduler dispara todo lo que tenga scheduledAt <= now, así que
// dejarlo con la fecha original lo habría enviado de inmediato). Por decisión de
// Jaime queda el miércoles 5 de agosto a las 09:00 CLT, misma hora del brief.
// Va sobre la campaña base (no un clon), igual que en
// schedule-jornada-investigacion-sends.ts.
//
// Horas en CLT (America/Santiago). Ojo con el cambio de hora: Chile pasa a
// UTC-3 el domingo 6-sep-2026, así que el 5-ago, el 17-ago y el 2-sep son
// UTC-4 y los tres últimos UTC-3.
const CAMPAIGN_ID = "cmsdjngrh02fvnnlhih74lz60"; // base creado por el seed (Asunto A, DRAFT)

// Asunto A: el brief decía "Inscripciones abiertas a la II Simposio"; se corrige
// la concordancia a "al II Simposio" (decisión de Jaime, avisada a Rosa en la
// muestra). Asunto B va textual como lo pidió Rosa.
const SUBJECT_A =
  "Inscripciones abiertas al II Simposio de Actualización en Demencias y Trastornos del Movimiento";
const SUBJECT_B =
  "Reserva tu cupo II Simposio de Actualización en Demencias y Trastornos del Movimiento";

// Inicial: se reprograma la campaña base en sí (no un clon).
const INITIAL = {
  whenUTC: "2026-08-05T13:00:00.000Z",
  subject: SUBJECT_A,
  labelCL: "Mié 5 ago 09:00 — inicial",
};

const SENDS: { whenUTC: string; subject: string; labelCL: string }[] = [
  { whenUTC: "2026-08-17T12:30:00.000Z", subject: SUBJECT_A, labelCL: "Lun 17 ago 08:30 — 1ª repetición" },
  { whenUTC: "2026-09-02T14:00:00.000Z", subject: SUBJECT_A, labelCL: "Mié 2 sep 10:00 — 2ª repetición" },
  { whenUTC: "2026-09-14T16:00:00.000Z", subject: SUBJECT_B, labelCL: "Lun 14 sep 13:00 — reserva tu cupo" },
  { whenUTC: "2026-10-07T12:00:00.000Z", subject: SUBJECT_B, labelCL: "Mié 7 oct 09:00 — reserva tu cupo" },
  { whenUTC: "2026-10-29T11:00:00.000Z", subject: SUBJECT_B, labelCL: "Mié 29 oct 08:00 — último recordatorio" },
];

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const base = await prisma.campaign.findUnique({
    where: { id: CAMPAIGN_ID },
    include: { contactGroups: { select: { id: true } } },
  });

  if (!base) {
    console.log(`[schedule-simposio-demencias] Base campaign ${CAMPAIGN_ID} not found. Skipping.`);
    return;
  }

  // Reprograma el envío inicial (la campaña base), salvo que ya haya salido.
  const initialWhen = new Date(INITIAL.whenUTC);
  if (base.status === "SENT" || base.status === "SENDING") {
    console.log(`[schedule-simposio-demencias] Inicial already ${base.status} (${base.id}). Not rescheduling.`);
  } else if (base.subject === INITIAL.subject && base.scheduledAt?.getTime() === initialWhen.getTime() && base.status === "SCHEDULED") {
    console.log(`[schedule-simposio-demencias] Inicial already set to ${INITIAL.labelCL}. Skipping.`);
  } else {
    await prisma.campaign.update({
      where: { id: base.id },
      data: { subject: INITIAL.subject, status: "SCHEDULED", scheduledAt: initialWhen },
    });
    console.log(`[schedule-simposio-demencias] ✔ Programado inicial → ${INITIAL.labelCL} (${INITIAL.whenUTC}) — campaign ${base.id}`);
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
        console.log(`[schedule-simposio-demencias] ↻ Re-synced htmlBody for ${s.labelCL} (${existing.id}).`);
      } else {
        console.log(`[schedule-simposio-demencias] ${s.labelCL} already scheduled & in sync (${existing.id}). Skipping.`);
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

    console.log(`[schedule-simposio-demencias] ✔ Scheduled "${s.subject}" for ${s.labelCL} (${s.whenUTC}) — campaign ${clone.id}`);
  }
}

main()
  .catch((e) => { console.error("[schedule-simposio-demencias]", e); process.exit(0); /* non-fatal */ })
  .finally(() => prisma.$disconnect());
