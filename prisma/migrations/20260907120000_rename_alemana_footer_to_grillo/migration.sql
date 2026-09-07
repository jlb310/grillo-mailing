-- Renombra el flag del footer institucional: el nombre venía del primer cliente
-- (Clínica Alemana), pero desde 20260612000000_footer_default_true la columna
-- controla el footer corporativo de GRILLO, que es lo que realmente renderiza
-- lib/email-builder.ts. El nombre viejo ya no describía lo que hace.
--
-- RENAME COLUMN conserva los valores existentes: ninguna campaña cambia de
-- aspecto con esta migración.
ALTER TABLE "Campaign" RENAME COLUMN "useAlemanaFooter" TO "useGrilloFooter";
