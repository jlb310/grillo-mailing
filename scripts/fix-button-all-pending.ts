import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { renderButton } from "../lib/email-builder";

// Backfills the forward-safe CTA button into every PENDING campaign's stored
// htmlBody (status DRAFT or SCHEDULED). SENT/SENDING are left untouched: an
// already-delivered email is immutable and an in-flight send must not change.
//
// Surgical, not a full rebuild: it only swaps the old VML roundrect button
// block for the new <td bgcolor> + <a> button via renderButton(), leaving the
// rest of each email byte-identical. This avoids re-deriving builder fields
// (and risking default re-injection) for campaigns we don't otherwise manage.
//
// Idempotent: the new button contains no VML, so re-runs match nothing and are
// a no-op. Safe to run on every deploy (same convention as the apply-* scripts).
//
// Matches the old machine-generated button block:
//   <table ... style="margin:12px auto;"> ... <v:roundrect ...> ...
//   <a href="URL" ... background:COLOR; ...>TEXT</a> ... </table>
// Capture groups: 1 = url (raw, re-escaped by renderButton), 2 = color, 3 = text.
const OLD_VML_BUTTON =
  /<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:12px auto;">[\s\S]*?<v:roundrect[\s\S]*?<a href="([^"]*)"[\s\S]*?background:([^;]+);[\s\S]*?>\s*([\s\S]*?)\s*<\/a>[\s\S]*?<\/table>/g;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const pending = await prisma.campaign.findMany({
    where: { status: { in: ["DRAFT", "SCHEDULED"] } },
    select: { id: true, subject: true, status: true, htmlBody: true },
  });

  let fixed = 0;
  let buttons = 0;

  for (const c of pending) {
    if (!c.htmlBody || !c.htmlBody.includes("v:roundrect")) continue;

    let count = 0;
    const next = c.htmlBody.replace(OLD_VML_BUTTON, (_m, url, color, text) => {
      count++;
      return renderButton(String(text).trim(), String(url), String(color).trim());
    });

    if (count === 0 || next === c.htmlBody) {
      // Had a roundrect but the pattern didn't match — flag for manual review.
      console.log(`[fix-button-all-pending] ⚠ ${c.id} (${c.status}) "${c.subject}" still contains VML but no button matched. Skipping.`);
      continue;
    }

    await prisma.campaign.update({ where: { id: c.id }, data: { htmlBody: next } });
    fixed++;
    buttons += count;
    console.log(`[fix-button-all-pending] ✔ ${c.id} (${c.status}) "${c.subject}" — ${count} button(s) fixed.`);
  }

  console.log(`[fix-button-all-pending] Done. Scanned ${pending.length} pending campaigns, fixed ${fixed} (${buttons} buttons).`);
}

main()
  .catch((e) => { console.error("[fix-button-all-pending]", e); process.exit(0); /* non-fatal */ })
  .finally(() => prisma.$disconnect());
