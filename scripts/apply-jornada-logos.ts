import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildEmailHtml } from "../lib/email-builder";

const TITLE_FRAGMENT = "III Jornada Internacional en Docencia Clínica";

const BASE = process.env.PUBLIC_BASE_URL ?? "https://calemana.digitalsagencia.cl";
const LOGO_LEFT   = `${BASE}/jornada-docencia/1-izquierda.png`;
const LOGO_RIGHT  = `${BASE}/jornada-docencia/2-derecha.png`;
const LOGO_RIGHT2 = `${BASE}/jornada-docencia/3-derecha.jpg`;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const campaigns = await prisma.campaign.findMany({
    where: {
      OR: [
        { subject:    { contains: TITLE_FRAGMENT, mode: "insensitive" } },
        { emailTitle: { contains: TITLE_FRAGMENT, mode: "insensitive" } },
      ],
      // El correo de confirmación de asistencia también contiene el fragmento,
      // pero usa sus propios logos (jornada-docencia-confirmacion) — lo maneja
      // seed-jornada-docencia-confirmacion.ts. No tocarlo desde aquí.
      NOT: { subject: { contains: "Confirma tu asistencia", mode: "insensitive" } },
    },
  });

  if (campaigns.length === 0) {
    console.log(`[apply-jornada-logos] No matching campaign for "${TITLE_FRAGMENT}". Skipping.`);
    return;
  }

  for (const c of campaigns) {
    // URLs are forced to the canonical jornada-docencia assets.
    // All three logos are forced to a SINGLE uniform height so they line
    // up at the top of the header (different per-logo heights made the
    // marks look misaligned). The shared height tracks c.logoHeight, so a
    // global size adjustment in the editor still survives deploys.
    const uniformHeight    = c.logoHeight ?? "56px";
    const logoHeight       = uniformHeight;
    const logoRightHeight  = uniformHeight;
    const logoRight2Height = uniformHeight;

    const fields = {
      logoUrl: LOGO_LEFT,
      logoAlt: c.emailTitle ?? "Clínica Alemana",
      logoHeight,
      logoAlign: (c.logoAlign as "left" | "center" | "right") ?? "left",
      logoRightUrl: LOGO_RIGHT,
      logoRightHeight,
      logoRight2Url: LOGO_RIGHT2,
      logoRight2Height,
      headerColor: c.headerColor ?? "#00A99D",
      emailTitle: c.emailTitle ?? undefined,
      emailSubtitle: c.emailSubtitle ?? undefined,
      emailDate: c.emailDate ?? undefined,
      emailLocation: c.emailLocation ?? undefined,
      emailBody: c.emailBody ?? undefined,
      ctaButtons: (c.ctaButtons as unknown as { id: string; text: string; url: string; color: string }[] | null) ?? undefined,
      footerText: c.footerText ?? undefined,
    };

    const htmlBody = buildEmailHtml(fields);

    if (c.htmlBody === htmlBody &&
        c.logoUrl       === LOGO_LEFT &&
        c.logoRightUrl  === LOGO_RIGHT &&
        c.logoRight2Url === LOGO_RIGHT2) {
      console.log(`[apply-jornada-logos] Campaign ${c.id} already in sync. Skipping.`);
      continue;
    }

    await prisma.campaign.update({
      where: { id: c.id },
      data: {
        logoUrl: LOGO_LEFT,
        logoHeight,
        logoRightUrl: LOGO_RIGHT,
        logoRightHeight,
        logoRight2Url: LOGO_RIGHT2,
        logoRight2Height,
        htmlBody,
      },
    });

    console.log(`[apply-jornada-logos] ✔ Updated campaign ${c.id} — ${c.subject}`);
  }
}

main()
  .catch((e) => { console.error("[apply-jornada-logos]", e); process.exit(0); /* non-fatal */ })
  .finally(() => prisma.$disconnect());
