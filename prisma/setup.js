// Creates/ensures the default Grillo admin user if none exists. Uses pg directly — no Prisma client needed.
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const email = "admin@grillo.click";
  const name = "Admin Grillo";
  const password = process.env.ADMIN_PASSWORD || "grillo2026";

  const { rows } = await client.query('SELECT id, email FROM "AdminUser" LIMIT 1');
  if (rows.length === 0) {
    const hash = await bcrypt.hash(password, 12);
    await client.query(
      'INSERT INTO "AdminUser" (id, email, name, password, "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())',
      [email, name, hash]
    );
    console.log(`Admin user created: ${email}`);
  } else {
    const existing = rows[0];
    if (existing.email === email) {
      console.log(`Admin user already exists (${email}), skipping.`);
    } else {
      // Migrate a previous default admin (e.g. admin@digitals.cl) to the Grillo admin.
      const hash = await bcrypt.hash(password, 12);
      await client.query(
        'UPDATE "AdminUser" SET email = $1, name = $2, password = $3, "updatedAt" = NOW() WHERE id = $4',
        [email, name, hash, existing.id]
      );
      console.log(`Admin user migrated: ${existing.email} -> ${email}`);
    }
  }

  await client.end();
}

main().catch((e) => { console.error("Setup error:", e.message); process.exit(0); });
