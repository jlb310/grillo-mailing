/* eslint-disable @typescript-eslint/no-require-imports */
// Creates/ensures the super admin and the Lenyes empresa + admin. Uses pg directly — no Prisma client needed.
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const EMPRESA_NAME = "Lenyes";
const EMPRESA_SLUG = "lenyes";
const EMPRESA_DESC = "Empresa piloto de Grillo Mailing";

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // --- Empresa Lenyes ---
  let empresaId = null;
  const empresaRes = await client.query('SELECT id FROM "Empresa" WHERE slug = $1', [EMPRESA_SLUG]);
  if (empresaRes.rows.length > 0) {
    empresaId = empresaRes.rows[0].id;
    console.log(`Empresa "${EMPRESA_NAME}" ya existe (${empresaId}).`);
  } else {
    const ins = await client.query(
      'INSERT INTO "Empresa" (id, name, slug, description, "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW()) RETURNING id',
      [EMPRESA_NAME, EMPRESA_SLUG, EMPRESA_DESC]
    );
    empresaId = ins.rows[0].id;
    console.log(`Empresa "${EMPRESA_NAME}" creada (${empresaId}).`);
  }

  // --- Super admin ---
  const superEmail = "admin@grillo.click";
  const superName = "Admin Grillo";
  const superPassword = process.env.ADMIN_PASSWORD || "grillo2026";

  const superRes = await client.query('SELECT id FROM "AdminUser" WHERE email = $1', [superEmail]);
  if (superRes.rows.length > 0) {
    await client.query(
      'UPDATE "AdminUser" SET role = $1, name = $2, "updatedAt" = NOW() WHERE email = $3',
      ["SUPER_ADMIN", superName, superEmail]
    );
    console.log(`Super admin ${superEmail} actualizado a SUPER_ADMIN.`);
  } else {
    const hash = await bcrypt.hash(superPassword, 12);
    await client.query(
      'INSERT INTO "AdminUser" (id, email, name, password, role, "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())',
      [superEmail, superName, hash, "SUPER_ADMIN"]
    );
    console.log(`Super admin creado: ${superEmail}`);
  }

  // --- Remitente de Lenyes (solo si aún no está configurado, no pisa lo que
  // se haya guardado a mano desde el panel de la empresa) ---
  const LENYES_FROM_NAME = process.env.LENYES_FROM_NAME || "Lenyes";
  const LENYES_FROM_EMAIL = process.env.LENYES_FROM_EMAIL || "pruebas@news.lenyes.cl";
  await client.query(
    'UPDATE "Empresa" SET "resendFromName" = COALESCE("resendFromName", $1), "resendFromEmail" = COALESCE("resendFromEmail", $2), "updatedAt" = NOW() WHERE id = $3',
    [LENYES_FROM_NAME, LENYES_FROM_EMAIL, empresaId]
  );
  console.log(`Remitente Lenyes asegurado (solo si estaba vacío): ${LENYES_FROM_NAME} <${LENYES_FROM_EMAIL}>`);

  // --- Admin de Lenyes (opcional, por env) ---
  const lenyesEmail = process.env.LENYES_ADMIN_EMAIL;
  if (lenyesEmail) {
    const lenyesPassword = process.env.LENYES_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "grillo2026";
    const lenyesName = process.env.LENYES_ADMIN_NAME || "Admin Lenyes";
    const lenyesRes = await client.query('SELECT id FROM "AdminUser" WHERE email = $1', [lenyesEmail]);
    if (lenyesRes.rows.length > 0) {
      await client.query(
        'UPDATE "AdminUser" SET role = $1, "empresaId" = $2, name = $3, "updatedAt" = NOW() WHERE email = $4',
        ["ADMIN", empresaId, lenyesName, lenyesEmail]
      );
      console.log(`Admin Lenyes actualizado: ${lenyesEmail}`);
    } else {
      const hash = await bcrypt.hash(lenyesPassword, 12);
      await client.query(
        'INSERT INTO "AdminUser" (id, email, name, password, role, "empresaId", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())',
        [lenyesEmail, lenyesName, hash, "ADMIN", empresaId]
      );
      console.log(`Admin Lenyes creado: ${lenyesEmail}`);
    }
  } else {
    console.log("LENYES_ADMIN_EMAIL no definido — no se crea admin de Lenyes.");
  }

  await client.end();
}

main().catch((e) => { console.error("Setup error:", e.message); process.exit(0); });
