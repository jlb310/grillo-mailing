// Analyzes contact email domains and fixes obvious typos.
// Usage:
//   node prisma/fix-email-typos.js          — dry-run (shows what would change)
//   node prisma/fix-email-typos.js --fix    — applies corrections
//   node prisma/fix-email-typos.js --backfill-bounced  — marks contacts bounced from SendLog history
const { Client } = require("pg");

const FIX = process.argv.includes("--fix");
const BACKFILL = process.argv.includes("--backfill-bounced");

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

// Known valid domains ordered by expected prevalence
const VALID_DOMAINS = [
  "alemana.cl",
  "clinicaalemana.cl",
  "alemanatemuco.cl",
  "alemanavaldivia.cl",
  "gmail.com",
  "hotmail.com",
  "yahoo.com",
  "outlook.com",
];

function suggestFix(domain) {
  // Single-char or two-char TLD — almost certainly truncated
  const tld = domain.split(".").pop();
  if (tld && tld.length === 1) {
    // e.g. alemanac.l → try appending char to domain before dot
    const parts = domain.split(".");
    const candidate = parts.slice(0, -1).join(".") + tld; // alemanac + l → alemanacl
    // Check if that's close to a valid domain
    for (const valid of VALID_DOMAINS) {
      if (levenshtein(candidate, valid) <= 2) return valid;
    }
  }

  for (const valid of VALID_DOMAINS) {
    const dist = levenshtein(domain, valid);
    if (dist > 0 && dist <= 2) return valid;
  }
  return null;
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // ── Backfill bounced contacts from SendLog history ──────────────────────
  if (BACKFILL) {
    console.log("\n── Backfill: marking contacts bounced from SendLog history ──");
    const { rows: bounced } = await client.query(`
      SELECT DISTINCT c.id, c.email
      FROM "Contact" c
      JOIN "SendLog" sl ON sl."contactId" = c.id
      WHERE sl."bouncedAt" IS NOT NULL AND c.bounced = false
    `);
    console.log(`Found ${bounced.length} contacts with historical bounces not yet marked.`);
    if (bounced.length > 0) {
      const ids = bounced.map(r => r.id);
      await client.query(`UPDATE "Contact" SET bounced = true WHERE id = ANY($1)`, [ids]);
      console.log(`✅ Marked ${ids.length} contacts as bounced.`);
      bounced.slice(0, 10).forEach(r => console.log(`  ${r.email}`));
      if (bounced.length > 10) console.log(`  ... and ${bounced.length - 10} more`);
    }
    await client.end();
    return;
  }

  // ── Domain analysis ──────────────────────────────────────────────────────
  const { rows: domainRows } = await client.query(`
    SELECT
      LOWER(SPLIT_PART(email, '@', 2)) AS domain,
      COUNT(*) AS count
    FROM "Contact"
    GROUP BY domain
    ORDER BY count DESC
  `);

  console.log("\n── Email domain breakdown ──────────────────────────────────");
  console.log(`${"Domain".padEnd(40)} ${"Count".padStart(6)}`);
  console.log("─".repeat(48));
  domainRows.forEach(r => console.log(`${r.domain.padEnd(40)} ${String(r.count).padStart(6)}`));

  // ── Find typos ────────────────────────────────────────────────────────────
  const fixes = [];
  for (const { domain, count } of domainRows) {
    if (VALID_DOMAINS.includes(domain)) continue;
    const suggestion = suggestFix(domain);
    if (suggestion) {
      fixes.push({ domain, suggestion, count: Number(count) });
    }
  }

  if (fixes.length === 0) {
    console.log("\n✅ No obvious typos found.");
    await client.end();
    return;
  }

  console.log("\n── Detected typos ───────────────────────────────────────────");
  fixes.forEach(f => console.log(`  ${String(f.count).padStart(4)} contactos: @${f.domain}  →  @${f.suggestion}`));

  if (!FIX) {
    console.log(`\nDry-run. Run with --fix to apply corrections.`);
    await client.end();
    return;
  }

  // ── Apply fixes ───────────────────────────────────────────────────────────
  console.log("\n── Applying fixes ───────────────────────────────────────────");
  let totalFixed = 0;
  for (const { domain, suggestion } of fixes) {
    // Fetch affected contacts
    const { rows: contacts } = await client.query(
      `SELECT id, email FROM "Contact" WHERE LOWER(SPLIT_PART(email, '@', 2)) = $1`,
      [domain]
    );
    for (const c of contacts) {
      const newEmail = c.email.replace(new RegExp(`@${domain.replace(/\./g, "\\.")}$`, "i"), `@${suggestion}`);
      // Check if new email already exists for same event (unique constraint)
      const { rows: existing } = await client.query(
        `SELECT id FROM "Contact" WHERE "eventId" = (SELECT "eventId" FROM "Contact" WHERE id = $1) AND LOWER(email) = LOWER($2) AND id != $1`,
        [c.id, newEmail]
      );
      if (existing.length > 0) {
        console.log(`  SKIP (duplicate): ${c.email} → ${newEmail}`);
        continue;
      }
      await client.query(`UPDATE "Contact" SET email = $1 WHERE id = $2`, [newEmail, c.id]);
      console.log(`  FIXED: ${c.email} → ${newEmail}`);
      totalFixed++;
    }
  }
  console.log(`\n✅ Fixed ${totalFixed} contacts.`);
  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
