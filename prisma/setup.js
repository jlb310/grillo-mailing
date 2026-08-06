// Creates default admin user if none exists. Uses pg directly — no Prisma client needed.
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const { rows } = await client.query('SELECT id FROM "AdminUser" LIMIT 1');
  if (rows.length === 0) {
    const hash = await bcrypt.hash("digitals2024", 12);
    await client.query(
      'INSERT INTO "AdminUser" (id, email, name, password, "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())',
      ["admin@digitals.cl", "Admin Digitals", hash]
    );
    console.log("Admin user created: admin@digitals.cl / digitals2024");
  } else {
    console.log("Admin user already exists, skipping.");
  }

  await client.end();
}

main().catch((e) => { console.error("Setup error:", e.message); process.exit(0); });
