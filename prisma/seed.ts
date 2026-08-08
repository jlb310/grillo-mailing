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

  const equipoLenyes = [
    { email: "pcastillo@lenyes.cl", name: "P. Castillo" },
    { email: "azamora@lenyes.cl", name: "A. Zamora" },
    { email: "jyevenes@lenyes.cl", name: "J. Yevenes" },
    { email: "rmoscoso@lenyes.cl", name: "R. Moscoso" },
    { email: "aarreaza@lenyes.cl", name: "A. Arreaza" },
    { email: "svera@lenyes.cl", name: "S. Vera" },
  ];

  await prisma.contact.createMany({
    data: equipoLenyes.map((c) => ({ empresaId: empresa.id, ...c })),
    skipDuplicates: true,
  });
  console.log(`✓ Equipo Lenyes: ${equipoLenyes.length} contactos cargados`);

  const emailFields = {
    emailTitle: "Jornada de Actualización en Medicina Interna 2026",
    emailSubtitle: "Lo invitamos a participar en nuestra jornada anual de actualización",
    emailDate: "Sábado 20 de junio de 2026, 9:00 – 17:30 hrs",
    emailLocation: "Auditorio Central, Clínica Alemana de Santiago",
    emailBody:
      "Estimado/a colega,\n\nNos complace invitarle a la Jornada de Actualización en Medicina Interna 2026, instancia de encuentro y formación continua organizada por el equipo de Medicina Interna de Clínica Alemana de Santiago.\n\nEl programa contempla conferencias magistrales, paneles de discusión clínica y talleres prácticos a cargo de destacados especialistas nacionales e internacionales.",
    ctaText: "Confirmar asistencia",
    ctaUrl: "https://clinicaalemana.cl/jornada-medicina-interna-2026",
  };

  const htmlBody = buildEmailHtml(emailFields);

  await prisma.campaign.upsert({
    where: { id: "demo-campana-1" },
    update: {},
    create: {
      id: "demo-campana-1",
      empresaId: empresa.id,
      subject: "Invitación — Jornada de Actualización en Medicina Interna 2026",
      ...emailFields,
      htmlBody,
      status: "DRAFT",
    },
  });
  console.log("✓ Campaña demo cargada (DRAFT)");

  console.log("\n✅ Seed completado. Credenciales Lenyes: admin@lenyes.cl / lenyes2026");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
