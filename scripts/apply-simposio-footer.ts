import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildEmailHtml, type EmailBuilderFields } from "../lib/email-builder";

// Idempotently enables the Clínica Alemana corporate footer + round
// date/location buttons on the "V Simposio Salud de la Mujer" campaign and
// regenerates its htmlBody, so the features stay active across deploys without
// touching the editor (same pattern as apply-jornada-logos.ts).
//
// The builder fields are reconstructed EXACTLY as the campaign editor builds
// them (app/admin/campanas/nueva/page.tsx), so the regenerated htmlBody is
// identical to what toggling the two checkboxes in the editor would produce.
const TITLE_FRAGMENTS = ["Simposio", "Mujer"];

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type CtaButton = { id: string; text: string; url: string; color: string };

async function main() {
  const campaigns = await prisma.campaign.findMany();
  const targets = campaigns.filter((c) => {
    const hay = `${c.subject ?? ""} ${c.emailTitle ?? ""}`.toLowerCase();
    return TITLE_FRAGMENTS.every((f) => hay.includes(f.toLowerCase()));
  });

  if (targets.length === 0) {
    console.log(`[apply-simposio-footer] No campaign matched ${JSON.stringify(TITLE_FRAGMENTS)}. Skipping.`);
    return;
  }

  for (const c of targets) {
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

    const htmlBody = buildEmailHtml({ ...baseFields, useAlemanaFooter: true, eventInfoButtons: true });

    if (c.htmlBody === htmlBody && c.useAlemanaFooter && c.eventInfoButtons) {
      console.log(`[apply-simposio-footer] Campaign ${c.id} already in sync. Skipping.`);
      continue;
    }

    await prisma.campaign.update({
      where: { id: c.id },
      data: { useAlemanaFooter: true, eventInfoButtons: true, htmlBody },
    });

    console.log(`[apply-simposio-footer] ✔ Updated campaign ${c.id} — ${c.subject}`);
  }
}

main()
  .catch((e) => { console.error("[apply-simposio-footer]", e); process.exit(0); /* non-fatal */ })
  .finally(() => prisma.$disconnect());
