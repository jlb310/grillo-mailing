import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { buildEmailHtml } from "../lib/email-builder";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash("digitals2024", 12);

  await prisma.adminUser.upsert({
    where: { email: "admin@digitals.cl" },
    update: {},
    create: { email: "admin@digitals.cl", password: hash, name: "Admin Digitals" },
  });
  console.log("✓ Admin: admin@digitals.cl / digitals2024");

  const event = await prisma.event.upsert({
    where: { id: "demo-evento-1" },
    update: {},
    create: {
      id: "demo-evento-1",
      title: "Jornada de Actualización en Medicina Interna 2026",
      description: "Jornada anual de actualización médica organizada por Clínica Alemana de Santiago, orientada a médicos internistas y especialistas afines.",
      date: new Date("2026-06-20T09:00:00"),
      location: "Auditorio Central — Clínica Alemana de Santiago",
      horasLectivas: 8,
      status: "ACTIVE",
    },
  });
  console.log("✓ Evento:", event.title);

  const doctores = [
    { email: "dr.ramirez@medicina.cl", name: "Dr. Rodrigo Ramírez" },
    { email: "dra.valdes@medicina.cl", name: "Dra. Patricia Valdés" },
    { email: "dr.morales@medicina.cl", name: "Dr. Sebastián Morales" },
    { email: "dra.soto@medicina.cl", name: "Dra. Verónica Soto" },
    { email: "dr.fuentes@medicina.cl", name: "Dr. Andrés Fuentes" },
    { email: "dra.bravo@medicina.cl", name: "Dra. Claudia Bravo" },
    { email: "dr.herrera@medicina.cl", name: "Dr. Felipe Herrera" },
    { email: "dra.diaz@medicina.cl", name: "Dra. Carolina Díaz" },
    { email: "dr.castillo@medicina.cl", name: "Dr. Ignacio Castillo" },
    { email: "dra.gonzalez@medicina.cl", name: "Dra. Javiera González" },
    { email: "dr.silva@medicina.cl", name: "Dr. Marcelo Silva" },
    { email: "dra.pena@medicina.cl", name: "Dra. Lorena Peña" },
  ];

  await prisma.contact.createMany({
    data: doctores.map((d) => ({ eventId: event.id, ...d })),
    skipDuplicates: true,
  });
  console.log(`✓ Contactos: ${doctores.length} médicos cargados`);

  const emailFields = {
    emailTitle: "Jornada de Actualización en Medicina Interna 2026",
    emailSubtitle: "Lo invitamos a participar en nuestra jornada anual de actualización",
    emailDate: "Sábado 20 de junio de 2026, 9:00 – 17:30 hrs",
    emailLocation: "Auditorio Central, Clínica Alemana de Santiago",
    emailBody:
      "Estimado/a colega,\n\nNos complace invitarle a la Jornada de Actualización en Medicina Interna 2026, instancia de encuentro y formación continua organizada por el equipo de Medicina Interna de Clínica Alemana de Santiago.\n\nEl programa contempla conferencias magistrales, paneles de discusión clínica y talleres prácticos a cargo de destacados especialistas nacionales e internacionales. Al finalizar, se otorgará diploma de participación con 8 horas lectivas acreditadas.",
    ctaText: "Confirmar asistencia",
    ctaUrl: "https://clinicaalemana.cl/jornada-medicina-interna-2026",
  };

  const htmlBody = buildEmailHtml(emailFields);

  await prisma.campaign.upsert({
    where: { id: "demo-campana-1" },
    update: {},
    create: {
      id: "demo-campana-1",
      eventId: event.id,
      subject: "Invitación — Jornada de Actualización en Medicina Interna 2026",
      ...emailFields,
      htmlBody,
      status: "DRAFT",
    },
  });
  console.log("✓ Campaña demo cargada (DRAFT)");

  await prisma.survey.upsert({
    where: { id: "demo-survey-1" },
    update: {},
    create: {
      id: "demo-survey-1",
      eventId: event.id,
      title: "Encuesta de satisfacción — Jornada Medicina Interna 2026",
      questions: {
        create: [
          { text: "¿Cómo evaluaría el contenido de las presentaciones?", type: "rating", order: 1 },
          { text: "¿Cómo evaluaría la organización general del evento?", type: "rating", order: 2 },
          { text: "¿Los temas tratados fueron relevantes para su práctica clínica?", type: "yesno", order: 3 },
          { text: "¿Recomendaría esta jornada a un colega?", type: "yesno", order: 4 },
          { text: "Comentarios o sugerencias para futuras ediciones", type: "text", order: 5 },
        ],
      },
    },
  });
  console.log("✓ Encuesta de satisfacción creada");

  console.log("\n✅ Seed completado. Credenciales: admin@digitals.cl / digitals2024");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
