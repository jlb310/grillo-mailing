import { readFileSync } from "node:fs";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildEmailHtml, renderButton } from "../lib/email-builder";

// Seeds the "Confirma tu asistencia — III Jornada Internacional en Docencia
// Clínica" email (brief de Karina Cerda, 20-jul-2026). NOT a difusión: for this
// activity difusión was suspended; this is a confirmation email to the people
// already inscritos. Idempotent — safe on every deploy (same pattern as
// seed-jornada-investigacion.ts).
//
// Karina asked for the brochure PDF "en el correo"; the mailer doesn't attach
// files, so (decisión de Jaime, 21-jul) it goes as a "Descargar brochure"
// button linking to the self-hosted PDF under /public.
//
// Left in DRAFT: a test goes out for Karina's VB, then it is sent (NOT
// scheduled — the confirmation deadline is 24-jul, so it ships on VB).
const BASE = "https://calemana.digitalsagencia.cl";

const EVENT_TITLE = "III Jornada Internacional en Docencia Clínica — Confirmación de asistencia";
const EVENT_DATE_UTC = "2026-08-05T12:00:00.000Z"; // 5 ago 08:00 CLT
const GROUP_NAME = "Inscritos Jornada Docencia Clínica";
const SUBJECT = "Confirma tu asistencia a la III Jornada Internacional en Docencia Clínica";

const FORM_URL = "https://forms.cloud.microsoft/r/9FnWAh56z3";
const BROCHURE_URL = `${BASE}/jornada-docencia-confirmacion/brochure.pdf`;

// Cuerpo exacto redactado por Karina, con los dos botones intercalados donde el
// texto los menciona (formulario de confirmación y brochure).
// Versión corta (formal, en "usted") solicitada por Karina el 21-jul tras la 1ª
// prueba ("el texto era muy extenso").
const EMAIL_BODY = `
<p>Estimada/o:</p>
<p>Agradecemos su inscripción en la III Jornada Internacional en Docencia Clínica: <strong>“Liderazgo académico en formación en salud: innovación, impacto y colaboración”</strong>, que se realizará el miércoles 5 de agosto de 2026, de 08:00 a 13:30 horas, en el Aula Magna de Clínica Alemana Santiago.</p>
<p>Para facilitar la organización de la actividad, le solicitamos <strong>confirmar su asistencia hasta el 24 de julio</strong> completando el siguiente formulario:</p>
${renderButton("Confirmar asistencia", FORM_URL, "#00A99D")}
<p>Agradeceremos responder incluso si no podrá asistir, con el fin de liberar oportunamente los cupos disponibles.</p>
<p>Se adjunta el brochure con los objetivos y el programa de la jornada.</p>
${renderButton("Descargar brochure", BROCHURE_URL, "#374151")}
<p>Para consultas, puede comunicarse con Karina Cerda, email: <a href="mailto:kcerdac@alemana.cl">kcerdac@alemana.cl</a></p>
<p>Saludos cordiales,</p>
<p><strong>Equipo organizador</strong><br />III Jornada Internacional en Docencia Clínica</p>
`;

const BUILDER_FIELDS = {
  logoUrl: `${BASE}/jornada-docencia-confirmacion/logo-izq.png`,
  logoAlt: "Clínica Alemana — Departamento de Desarrollo Académico e Investigación",
  logoHeight: "48",
  logoAlign: "left" as const,
  logoRightUrl: `${BASE}/jornada-docencia-confirmacion/logo-der.png`,
  logoRightHeight: "48",
  // Logo Facultad de Medicina CAS-UDD / Centro de Desarrollo Educacional, al
  // medio de los otros dos (pedido de Karina, 21-jul, tras la 2ª prueba).
  logoCenterUrl: `${BASE}/jornada-docencia-confirmacion/logo-centro.png`,
  logoCenterHeight: "48",
  emailBody: EMAIL_BODY,
  useAlemanaFooter: true,
};

// logoAlt / logoCenter* are not Campaign columns — strip before writing to the DB.
const { logoAlt: _logoAlt, logoCenterUrl: _lcu, logoCenterHeight: _lch, ...CAMPAIGN_FIELDS } = BUILDER_FIELDS;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function loadEmails(): string[] {
  const list = JSON.parse(readFileSync("scripts/jornada-docencia-confirmacion-emails.json", "utf-8")) as string[];
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
  console.log(`[seed-jornada-docencia-confirmacion] ${emails.length} inscritos.`);

  let event = await prisma.event.findFirst({ where: { title: EVENT_TITLE } });
  if (!event) {
    event = await prisma.event.create({
      data: {
        title: EVENT_TITLE,
        description: "Liderazgo académico en formación en salud: Innovación, impacto y colaboración",
        date: new Date(EVENT_DATE_UTC),
        location: "Aula Magna, Clínica Alemana de Santiago",
        status: "ACTIVE",
      },
    });
    console.log(`[seed-jornada-docencia-confirmacion] ✔ Event creado (${event.id}).`);
  } else {
    console.log(`[seed-jornada-docencia-confirmacion] Event ya existe (${event.id}).`);
  }

  await prisma.contact.createMany({
    data: emails.map((email) => ({ eventId: event!.id, email, name: "" })),
    skipDuplicates: true,
  });
  const contacts = await prisma.contact.findMany({
    where: { eventId: event.id, email: { in: emails } },
    select: { id: true },
  });
  console.log(`[seed-jornada-docencia-confirmacion] ${contacts.length} contactos en el evento.`);

  const group = await prisma.contactGroup.upsert({
    where: { eventId_name: { eventId: event.id, name: GROUP_NAME } },
    create: { eventId: event.id, name: GROUP_NAME },
    update: {},
  });
  await prisma.contactGroup.update({
    where: { id: group.id },
    data: { contacts: { set: contacts.map((c) => ({ id: c.id })) } },
  });
  console.log(`[seed-jornada-docencia-confirmacion] Grupo "${GROUP_NAME}" con ${contacts.length} contactos (${group.id}).`);

  const htmlBody = buildEmailHtml(BUILDER_FIELDS);
  const existing = await prisma.campaign.findFirst({
    where: { eventId: event.id, subject: SUBJECT },
  });

  if (existing) {
    if (existing.status === "DRAFT" || existing.status === "SCHEDULED") {
      await prisma.campaign.update({
        where: { id: existing.id },
        data: { htmlBody, ...CAMPAIGN_FIELDS, contactGroups: { connect: [{ id: group.id }] } },
      });
      console.log(`[seed-jornada-docencia-confirmacion] ↻ Campaña re-sincronizada (${existing.id}, ${existing.status}).`);
    } else {
      console.log(`[seed-jornada-docencia-confirmacion] Campaña ya ${existing.status} (${existing.id}). No se toca.`);
    }
    return;
  }

  const campaign = await prisma.campaign.create({
    data: {
      eventId: event.id,
      subject: SUBJECT,
      htmlBody,
      ...CAMPAIGN_FIELDS,
      notifyEmails: [], // reporte de ops cae al fallback (jaime+freddy)
      status: "DRAFT",
      contactGroups: { connect: [{ id: group.id }] },
    },
  });
  console.log(`[seed-jornada-docencia-confirmacion] ✔ Campaña DRAFT creada (${campaign.id}) → grupo ${group.id}.`);
}

main()
  .catch((e) => {
    console.error("[seed-jornada-docencia-confirmacion]", e);
    process.exit(0);
  })
  .finally(() => prisma.$disconnect());
