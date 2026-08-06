import { readFileSync } from "node:fs";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildEmailHtml } from "../lib/email-builder";

// Seeds the "XI Jornadas de Investigación CAS-UDD" mailing (brief de Karina
// Cerda, 20-jul-2026). Idempotent — safe to run on every deploy:
//   • Event: created once (matched by title).
//   • Contacts: createMany skipDuplicates (unique eventId+email); the BBDD has
//     only emails, no names, so name is "".
//   • ContactGroup: upserted and re-synced with the full email list each run.
//   • Campaign: created once as DRAFT (matched by eventId+subject). If it exists
//     and is still editable, its htmlBody is re-synced so template fixes reach it.
//
// The campaign is left in DRAFT on purpose: the client asked for a test send +
// VB before scheduling. The scheduler only fires SCHEDULED campaigns, so this
// deploy never sends anything. The 3 real sends (2 asuntos) get scheduled after
// Karina's VB. Times will be 08:00 CLT (UTC-4) = 12:00 UTC.
const BASE = "https://calemana.digitalsagencia.cl";

const EVENT_TITLE = "XI Jornadas de Investigación CAS-UDD";
const EVENT_DATE_UTC = "2026-08-13T12:00:00.000Z"; // 13 ago 08:00 CLT
const GROUP_NAME = "BBDD Jornada Investigación 2026";

const SUBJECT_A =
  '¡Inscripciones Abiertas! XI Jornadas de Investigación CAS-UDD, “Conectando Conocimiento: Comunicando Investigación que Transforma”';

// Fields for buildEmailHtml (includes logoAlt, which is a rendering-only field).
const BUILDER_FIELDS = {
  logoUrl: `${BASE}/jornada-investigacion/logo-izq.png`,
  logoAlt: "Clínica Alemana — Departamento de Desarrollo Académico e Investigación",
  logoHeight: "48",
  logoAlign: "left" as const,
  logoRightUrl: `${BASE}/jornada-investigacion/logo-der.png`,
  logoRightHeight: "48",
  // Hero graphic full width; date/programa render as circular icon badges below
  // it, then the inscripción CTA — the gráfica → iconos → inscripción order.
  emailBody: `<p><img src="${BASE}/jornada-investigacion/hero.jpg" alt="XI Jornadas de Investigación CAS-UDD — Conectando Conocimiento: Comunicando Investigación que Transforma" /></p>`,
  iconDate: "13 de agosto · 08:00 a 14:10 hrs",
  iconLinkText: "Revisa el programa",
  iconLinkUrl: "https://www.alemanacursos.cl/XI-Jornada-Investigacion-CAS-UDD.php",
  ctaText: "Inscríbete aquí",
  ctaUrl: "https://forms.cloud.microsoft/r/p4K3be9hk2?origin=lprLink",
  useAlemanaFooter: true,
};

// logoAlt is not a Campaign column — strip it before writing to the DB.
const { logoAlt: _logoAlt, ...CAMPAIGN_FIELDS } = BUILDER_FIELDS;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function loadEmails(): string[] {
  const raw = readFileSync("scripts/jornada-investigacion-emails.json", "utf-8");
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
  console.log(`[seed-jornada-investigacion] ${emails.length} emails in BBDD.`);

  // ── Event ──────────────────────────────────────────────────────────────────
  let event = await prisma.event.findFirst({ where: { title: EVENT_TITLE } });
  if (!event) {
    event = await prisma.event.create({
      data: {
        title: EVENT_TITLE,
        description: "Conectando Conocimiento: Comunicando Investigación que Transforma",
        date: new Date(EVENT_DATE_UTC),
        location: "Clínica Alemana de Santiago",
        status: "ACTIVE",
      },
    });
    console.log(`[seed-jornada-investigacion] ✔ Event creado (${event.id}).`);
  } else {
    console.log(`[seed-jornada-investigacion] Event ya existe (${event.id}).`);
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
  console.log(`[seed-jornada-investigacion] ${contacts.length} contactos en el evento.`);

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
  console.log(`[seed-jornada-investigacion] Grupo "${GROUP_NAME}" con ${contacts.length} contactos (${group.id}).`);

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
      console.log(`[seed-jornada-investigacion] ↻ Campaña re-sincronizada (${existing.id}, ${existing.status}).`);
    } else {
      console.log(`[seed-jornada-investigacion] Campaña ya ${existing.status} (${existing.id}). No se toca.`);
    }
    return;
  }

  const campaign = await prisma.campaign.create({
    data: {
      eventId: event.id,
      subject: SUBJECT_A,
      htmlBody,
      ...CAMPAIGN_FIELDS,
      notifyEmails: [], // reporte de ops cae al fallback (jaime+freddy); Karina no lo recibe
      status: "DRAFT",
      contactGroups: { connect: [{ id: group.id }] },
    },
  });
  console.log(`[seed-jornada-investigacion] ✔ Campaña DRAFT creada (${campaign.id}) → grupo ${group.id}.`);
}

main()
  .catch((e) => {
    console.error("[seed-jornada-investigacion]", e);
    process.exit(0); // non-fatal: never block the deploy
  })
  .finally(() => prisma.$disconnect());
