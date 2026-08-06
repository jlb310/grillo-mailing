import { readFileSync } from "node:fs";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildEmailHtml } from "../lib/email-builder";

// Seeds the "II Simposio de Actualización en Demencias y Trastornos del
// Movimiento" mailing (brief de Rosa Cordero, 31-jul-2026). Idempotent — safe
// to run on every deploy:
//   • Event: created once (matched by title).
//   • Contacts: createMany skipDuplicates (unique eventId+email); the BBDD has
//     only emails, no names, so name is "".
//   • ContactGroup: upserted and re-synced with the full email list each run.
//   • Campaign: created once as DRAFT (matched by eventId+subject). If it exists
//     and is still editable, its htmlBody is re-synced so template fixes reach it.
//
// The campaign is left in DRAFT on purpose: Rosa pidió la muestra + VB antes de
// programar. The scheduler only fires SCHEDULED campaigns, so this deploy never
// sends anything. Los 6 envíos reales (2 asuntos) se programan después del VB,
// en un script aparte (mismo patrón que schedule-jornada-investigacion-sends.ts):
//   ASUNTO A — 4-ago 09:00 CLT (13:00Z) · 17-ago 08:30 (12:30Z) · 2-sep 10:00 (14:00Z)
//   ASUNTO B — 14-sep 13:00 CLT (16:00Z) · 7-oct 09:00 (12:00Z) · 29-oct 08:00 (11:00Z)
// Ojo con el cambio de hora: Chile pasa a UTC-3 el 6-sep-2026, así que los tres
// primeros envíos son UTC-4 y los tres últimos UTC-3.
const BASE = "https://calemana.digitalsagencia.cl";

const EVENT_TITLE = "II Simposio de Actualización en Demencias y Trastornos del Movimiento";
const EVENT_DATE_UTC = "2026-11-11T12:00:00.000Z"; // 11 nov 09:00 CLT (UTC-3)
const GROUP_NAME = "BBDD II Simposio Demencias 2026";

// Asunto A del brief. Rosa lo escribió "Inscripciones abiertas a la II
// Simposio"; se corrige la concordancia a "al II Simposio" y se le avisa en el
// correo de la muestra para que lo apruebe o lo revierta.
const SUBJECT_A =
  "Inscripciones abiertas al II Simposio de Actualización en Demencias y Trastornos del Movimiento";

// Fields for buildEmailHtml (includes logoAlt, which is a rendering-only field).
const BUILDER_FIELDS = {
  logoUrl: `${BASE}/simposio-demencias/logo-izq.png`,
  logoAlt: "Clínica Alemana — Departamento de Desarrollo Académico e Investigación",
  logoHeight: "48",
  logoAlign: "left" as const,
  logoRightUrl: `${BASE}/simposio-demencias/logo-der.png`,
  logoRightHeight: "48",
  // Gráfica del curso a todo el ancho; la fecha y el link al programa bajan como
  // badges circulares, y al final el CTA de inscripción — orden gráfica →
  // iconos → inscripción, igual que XI Jornadas de Investigación.
  emailBody: `<p><img src="${BASE}/simposio-demencias/hero.jpg" alt="II Simposio de Actualización en Demencias y Trastornos del Movimiento" /></p>`,
  iconDate: "11 y 12 de noviembre de 2026",
  iconLinkText: "Revisa el programa",
  iconLinkUrl:
    "https://www.alemanacursos.cl/2026-II-Simposio-Actualizacion-Demencias-Trastornos-Movimiento.php",
  ctaText: "Inscríbete aquí",
  ctaUrl:
    "https://massoeventos.com/ii-simposio-de-actualizacion-en-demencias-y-trastornos-del-movimiento-217",
  useAlemanaFooter: true,
};

// logoAlt is not a Campaign column — strip it before writing to the DB.
const { logoAlt: _logoAlt, ...CAMPAIGN_FIELDS } = BUILDER_FIELDS;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function loadEmails(): string[] {
  const raw = readFileSync("scripts/simposio-demencias-emails.json", "utf-8");
  const list = JSON.parse(raw) as string[];
  // De-dupe case-insensitively, keep first spelling.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of list) {
    const k = e.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

async function main() {
  const emails = loadEmails();
  console.log(`[seed-simposio-demencias] ${emails.length} emails in BBDD.`);

  // ── Event ──────────────────────────────────────────────────────────────────
  let event = await prisma.event.findFirst({ where: { title: EVENT_TITLE } });
  if (!event) {
    event = await prisma.event.create({
      data: {
        title: EVENT_TITLE,
        date: new Date(EVENT_DATE_UTC),
        location: "Clínica Alemana de Santiago",
        status: "ACTIVE",
      },
    });
    console.log(`[seed-simposio-demencias] ✔ Event creado (${event.id}).`);
  } else {
    console.log(`[seed-simposio-demencias] Event ya existe (${event.id}).`);
  }

  // ── Contacts ─────────────────────────────────────────────────────────────
  await prisma.contact.createMany({
    data: emails.map((email) => ({ eventId: event!.id, email, name: "" })),
    skipDuplicates: true,
  });
  const contacts = await prisma.contact.findMany({
    where: { eventId: event.id, email: { in: emails } },
    select: { id: true },
  });
  console.log(`[seed-simposio-demencias] ${contacts.length} contactos en el evento.`);

  // ── ContactGroup ───────────────────────────────────────────────────────────
  const group = await prisma.contactGroup.upsert({
    where: { eventId_name: { eventId: event.id, name: GROUP_NAME } },
    create: { eventId: event.id, name: GROUP_NAME },
    update: {},
  });
  await prisma.contactGroup.update({
    where: { id: group.id },
    data: { contacts: { set: contacts.map((c) => ({ id: c.id })) } },
  });
  console.log(`[seed-simposio-demencias] Grupo "${GROUP_NAME}" con ${contacts.length} contactos (${group.id}).`);

  // ── Campaign (DRAFT) ───────────────────────────────────────────────────────
  const htmlBody = buildEmailHtml(BUILDER_FIELDS);
  const existing = await prisma.campaign.findFirst({
    where: { eventId: event.id, subject: SUBJECT_A },
  });

  if (existing) {
    // Self-heal the htmlBody while still editable, so asset/template tweaks land.
    if (existing.status === "DRAFT" || existing.status === "SCHEDULED") {
      await prisma.campaign.update({
        where: { id: existing.id },
        data: { htmlBody, ...CAMPAIGN_FIELDS, contactGroups: { connect: [{ id: group.id }] } },
      });
      console.log(`[seed-simposio-demencias] ↻ Campaña re-sincronizada (${existing.id}, ${existing.status}).`);
    } else {
      console.log(`[seed-simposio-demencias] Campaña ya ${existing.status} (${existing.id}). No se toca.`);
    }
    return;
  }

  const campaign = await prisma.campaign.create({
    data: {
      eventId: event.id,
      subject: SUBJECT_A,
      htmlBody,
      ...CAMPAIGN_FIELDS,
      notifyEmails: [], // reporte de ops cae al fallback (jaime+freddy); Rosa no lo recibe
      status: "DRAFT",
      contactGroups: { connect: [{ id: group.id }] },
    },
  });
  console.log(`[seed-simposio-demencias] ✔ Campaña DRAFT creada (${campaign.id}) → grupo ${group.id}.`);
}

main()
  .catch((e) => {
    console.error("[seed-simposio-demencias]", e);
    process.exit(0); // non-fatal: never block the deploy
  })
  .finally(() => prisma.$disconnect());
