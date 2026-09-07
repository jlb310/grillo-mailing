import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { buildEmailHtml } from "../lib/email-builder";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const empresa = await prisma.empresa.upsert({
    where: { slug: "lenyes" },
    update: {},
    create: {
      name: "Lenyes",
      slug: "lenyes",
      description: "Empresa piloto de Grillo Mailing",
    },
  });
  console.log("✓ Empresa:", empresa.name);

  const hash = await bcrypt.hash("lenyes2026", 12);
  await prisma.adminUser.upsert({
    where: { email: "admin@lenyes.cl" },
    update: { empresaId: empresa.id, role: "ADMIN" },
    create: { email: "admin@lenyes.cl", password: hash, name: "Admin Lenyes", role: "ADMIN", empresaId: empresa.id },
  });
  console.log("✓ Admin Lenyes: admin@lenyes.cl / lenyes2026");

  const demoPassword = "DemoGrillo2026!";
  const demoHash = await bcrypt.hash(demoPassword, 12);
  await prisma.adminUser.upsert({
    where: { email: "demo@grillo.click" },
    update: {
      empresaId: empresa.id,
      name: "Demo Grillo",
      password: demoHash,
      role: "ADMIN",
    },
    create: {
      email: "demo@grillo.click",
      password: demoHash,
      name: "Demo Grillo",
      role: "ADMIN",
      empresaId: empresa.id,
    },
  });
  console.log(`✓ Demo: demo@grillo.click / ${demoPassword}`);

  const doctores = [
    { email: "dr.ramirez@medicina.cl", name: "Dr. Rodrigo Ramírez" },
    { email: "dra.valdes@medicina.cl", name: "Dra. Patricia Valdés" },
    { email: "dr.morales@medicina.cl", name: "Dr. Sebastián Morales" },
    { email: "dra.soto@medicina.cl", name: "Dra. Verónica Soto" },
    { email: "dr.fuentes@medicina.cl", name: "Dr. Andrés Fuentes" },
    { email: "dra.bravo@medicina.cl", name: "Dra. Claudia Bravo" },
  ];

  await prisma.contact.createMany({
    data: doctores.map((d) => ({ empresaId: empresa.id, ...d })),
    skipDuplicates: true,
  });
  console.log(`✓ Contactos: ${doctores.length} cargados`);

  const demoContacts = [
    "Antonia Silva", "Benjamín Torres", "Camila Rojas", "Diego Muñoz",
    "Emilia Contreras", "Felipe Soto", "Gabriela Reyes", "Hugo Morales",
    "Isidora Pérez", "Joaquín Fuentes", "Karen Vidal", "Lucas Herrera",
    "Martina Castro", "Nicolás Valdés", "Olivia Ramírez", "Pablo Sepúlveda",
    "Renata Araya", "Sebastián Núñez",
  ].map((name, index) => ({
    empresaId: empresa.id,
    name,
    // example.com evita envíos accidentales a personas reales.
    email: `contacto${String(index + 1).padStart(2, "0")}@example.com`,
  }));

  await prisma.contact.createMany({ data: demoContacts, skipDuplicates: true });
  const seededContacts = await prisma.contact.findMany({
    where: { empresaId: empresa.id, email: { endsWith: "@example.com" } },
    orderBy: { email: "asc" },
  });

  const group = await prisma.contactGroup.upsert({
    where: { empresaId_name: { empresaId: empresa.id, name: "Profesionales de la salud" } },
    update: {},
    create: { empresaId: empresa.id, name: "Profesionales de la salud" },
  });
  await prisma.contactGroup.update({
    where: { id: group.id },
    data: { contacts: { set: seededContacts.map(({ id }) => ({ id })) } },
  });
  console.log(`✓ Grupo demo: ${group.name} (${seededContacts.length} contactos)`);

  const emailFields = {
    emailTitle: "Jornada de Actualización en Medicina Interna 2026",
    emailSubtitle: "Lo invitamos a participar en nuestra jornada anual de actualización",
    emailDate: "Sábado 20 de junio de 2026, 9:00 – 17:30 hrs",
    emailLocation: "Auditorio Central, Centro Médico Aurora",
    emailBody:
      "Estimado/a colega,\n\nNos complace invitarle a la Jornada de Actualización en Medicina Interna 2026, instancia de encuentro y formación continua organizada por el equipo de Medicina Interna del Centro Médico Aurora.\n\nEl programa contempla conferencias magistrales, paneles de discusión clínica y talleres prácticos a cargo de destacados especialistas nacionales e internacionales.",
    ctaText: "Confirmar asistencia",
    ctaUrl: "https://example.com/jornada-medicina-interna-2026",
  };

  const htmlBody = buildEmailHtml(emailFields);

  const draftCampaign = await prisma.campaign.upsert({
    where: { id: "demo-campana-1" },
    update: {
      empresaId: empresa.id,
      subject: "Invitación — Jornada de Actualización en Medicina Interna 2026",
      ...emailFields,
      htmlBody,
      status: "DRAFT",
      scheduledAt: null,
      sentAt: null,
      contactGroups: { set: [{ id: group.id }] },
    },
    create: {
      id: "demo-campana-1",
      empresaId: empresa.id,
      subject: "Invitación — Jornada de Actualización en Medicina Interna 2026",
      ...emailFields,
      htmlBody,
      status: "DRAFT",
      contactGroups: { connect: [{ id: group.id }] },
    },
  });

  const newsletterFields = {
    emailTitle: "Novedades clínicas · Septiembre 2026",
    emailSubtitle: "Investigación, docencia y nuevos tratamientos para nuestros pacientes",
    emailBody:
      "Este mes destacamos la apertura de nuevas horas de telemedicina, los resultados de nuestro programa de prevención cardiovascular y las próximas actividades para profesionales de la salud.",
    ctaText: "Conocer las novedades",
    ctaUrl: "https://grillo.click/demo/newsletter",
  };
  const sentAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const sentCampaign = await prisma.campaign.upsert({
    where: { id: "demo-campana-enviada" },
    update: {
      empresaId: empresa.id,
      subject: "Novedades clínicas · Septiembre 2026",
      ...newsletterFields,
      htmlBody: buildEmailHtml(newsletterFields),
      status: "SENT",
      scheduledAt: sentAt,
      sentAt,
      openTrackingAtSend: true,
      clickTrackingAtSend: true,
      notifyEmails: ["demo@grillo.click"],
      contactGroups: { set: [{ id: group.id }] },
    },
    create: {
      id: "demo-campana-enviada",
      empresaId: empresa.id,
      subject: "Novedades clínicas · Septiembre 2026",
      ...newsletterFields,
      htmlBody: buildEmailHtml(newsletterFields),
      status: "SENT",
      scheduledAt: sentAt,
      sentAt,
      openTrackingAtSend: true,
      clickTrackingAtSend: true,
      notifyEmails: ["demo@grillo.click"],
      contactGroups: { connect: [{ id: group.id }] },
    },
  });

  const scheduledFields = {
    emailTitle: "Encuentro de Innovación en Salud 2026",
    emailSubtitle: "Una mañana para conectar ideas, tecnología y mejores experiencias de atención",
    emailDate: "Jueves 15 de octubre de 2026, 9:00 hrs",
    emailLocation: "Centro de Convenciones Santiago",
    emailBody: "Reserva la fecha para conocer casos, herramientas y tendencias que están transformando la salud.",
    ctaText: "Ver programa",
    ctaUrl: "https://grillo.click/demo/innovacion",
  };
  await prisma.campaign.upsert({
    where: { id: "demo-campana-programada" },
    update: {
      empresaId: empresa.id,
      subject: "Reserva la fecha — Encuentro de Innovación en Salud",
      ...scheduledFields,
      htmlBody: buildEmailHtml(scheduledFields),
      status: "SCHEDULED",
      // Fecha lejana para que el scheduler nunca envíe los contactos ficticios.
      scheduledAt: new Date("2099-10-15T12:00:00.000Z"),
      contactGroups: { set: [{ id: group.id }] },
    },
    create: {
      id: "demo-campana-programada",
      empresaId: empresa.id,
      subject: "Reserva la fecha — Encuentro de Innovación en Salud",
      ...scheduledFields,
      htmlBody: buildEmailHtml(scheduledFields),
      status: "SCHEDULED",
      scheduledAt: new Date("2099-10-15T12:00:00.000Z"),
      contactGroups: { connect: [{ id: group.id }] },
    },
  });

  await prisma.sendLog.deleteMany({ where: { campaignId: sentCampaign.id } });
  await prisma.sendLog.createMany({
    data: seededContacts.map((contact, index) => ({
      campaignId: sentCampaign.id,
      contactId: contact.id,
      resendId: `demo-resend-${String(index + 1).padStart(2, "0")}`,
      status: index === 17 ? "bounced" : "delivered",
      openedAt: index < 13 ? new Date(+sentAt + (index + 1) * 37 * 60 * 1000) : null,
      clickedAt: index < 6 ? new Date(+sentAt + (index + 2) * 71 * 60 * 1000) : null,
      bouncedAt: index === 17 ? new Date(+sentAt + 8 * 60 * 1000) : null,
      createdAt: sentAt,
    })),
  });

  console.log(`✓ Campañas demo: ${draftCampaign.status}, SENT y SCHEDULED`);

  console.log("\n✅ Seed completado. Demo: demo@grillo.click / DemoGrillo2026!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
