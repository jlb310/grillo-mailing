import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Idempotently reorders the body of the "III Jornada de Cirugía Mínimamente
// Invasiva en Cirugía Digestiva" campaign so the campaign graphic appears
// ABOVE the Fecha/Lugar info box (the builder's fixed order is info box first,
// so this post-processes the stored htmlBody instead of regenerating it).
// Re-applies itself after any editor save or deploy, same pattern as
// apply-robotica-footer.ts but content-order only, for this one campaign.
const CAMPAIGN_ID = "cmrjbud66000107l28h69oxve";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Matches the Fecha/Lugar info box (the only #f0f4ff table the builder emits)
// immediately followed by the first body image — i.e. the builder's default
// order. If the image already precedes the box this never matches.
const INFO_BOX_THEN_IMAGE =
  /(<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">\s*<tr>\s*<td style="background:#f0f4ff;[\s\S]*?<\/table>)(<img[^>]*>)/;

async function main() {
  const c = await prisma.campaign.findUnique({ where: { id: CAMPAIGN_ID } });

  if (!c) {
    console.log(`[apply-digestiva-image-order] Campaign ${CAMPAIGN_ID} not found. Skipping.`);
    return;
  }

  const m = c.htmlBody.match(INFO_BOX_THEN_IMAGE);
  if (!m) {
    console.log(`[apply-digestiva-image-order] Campaign ${c.id} already in desired order (or structure changed). Skipping.`);
    return;
  }

  const [, infoTable, img] = m;
  // The box carried the spacing (margin-bottom:24px); once the image goes
  // first it needs its own bottom margin so it doesn't sit flush on the box.
  const imgWithMargin = img.includes("margin:0 0 24px;")
    ? img
    : img.replace('style="display:block;', 'style="display:block;margin:0 0 24px;');

  const htmlBody = c.htmlBody.replace(INFO_BOX_THEN_IMAGE, imgWithMargin + infoTable);

  await prisma.campaign.update({
    where: { id: c.id },
    data: { htmlBody },
  });

  console.log(`[apply-digestiva-image-order] ✔ Updated campaign ${c.id} — ${c.subject}`);
}

main()
  .catch((e) => { console.error("[apply-digestiva-image-order]", e); process.exit(0); /* non-fatal */ })
  .finally(() => prisma.$disconnect());
