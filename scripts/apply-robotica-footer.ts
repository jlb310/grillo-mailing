import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildEmailHtml, type EmailBuilderFields } from "../lib/email-builder";

// Idempotently enables the Clínica Alemana corporate footer on the
// "I Simposio Internacional de Cirugía Robótica y Nuevas Tecnologías en Cadera
// y Rodilla" campaign and regenerates its htmlBody, so the footer stays active
// across deploys without touching the editor (same pattern as
// apply-simposio-footer.ts). Unlike that one, this only forces the footer and
// preserves the campaign's existing eventInfoButtons setting.
const CAMPAIGN_ID = "cmq9k5hvg000101peril4ity3";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type CtaButton = { id: string; text: string; url: string; color: string };

async function main() {
  const c = await prisma.campaign.findUnique({ where: { id: CAMPAIGN_ID } });

  if (!c) {
    console.log(`[apply-robotica-footer] Campaign ${CAMPAIGN_ID} not found. Skipping.`);
    return;
  }

  // Reconstruct the editor's builderFields (matching its load-time defaults).
  const ctaButtons: CtaButton[] = Array.isArray(c.ctaButtons)
    ? (c.ctaButtons as unknown as CtaButton[])
    : c.ctaText && c.ctaUrl
      ? [{ id: "1", text: c.ctaText, url: c.ctaUrl, color: c.headerColor ?? "#00A99D" }]
      : [];

  const baseFields: EmailBuilderFields = {
    logoUrl: c.logoUrl ?? "",
    logoAlt: "Clínica Alemana",
    logoHeight: c.logoHeight ?? "48px",
    logoAlign: (c.logoAlign as "left" | "center" | "right") ?? "left",
    logoRightUrl: c.logoRightUrl ?? "https://calemana.digitalsagencia.cl/derecha.png",
    logoRightHeight: c.logoRightHeight ?? "48px",
    logoRight2Url: c.logoRight2Url ?? "",
    logoRight2Height: c.logoRight2Height ?? "48px",
    headerColor: c.headerColor ?? "#00A99D",
    emailTitle: c.emailTitle ?? "",
    emailSubtitle: c.emailSubtitle ?? "",
    emailDate: c.emailDate ?? "",
    emailLocation: c.emailLocation ?? "",
    emailBody: c.emailBody ?? "",
    ctaButtons,
    footerText: c.footerText ?? "Clínica Alemana de Santiago — Av. Manquehue Norte 1410, Vitacura",
  };

  const htmlBody = buildEmailHtml({
    ...baseFields,
    useAlemanaFooter: true,
    eventInfoButtons: c.eventInfoButtons, // preserve existing setting
  });

  if (c.htmlBody === htmlBody && c.useAlemanaFooter) {
    console.log(`[apply-robotica-footer] Campaign ${c.id} already in sync. Skipping.`);
    return;
  }

  await prisma.campaign.update({
    where: { id: c.id },
    data: { useAlemanaFooter: true, htmlBody },
  });

  console.log(`[apply-robotica-footer] ✔ Updated campaign ${c.id} — ${c.subject}`);
}

main()
  .catch((e) => { console.error("[apply-robotica-footer]", e); process.exit(0); /* non-fatal */ })
  .finally(() => prisma.$disconnect());
