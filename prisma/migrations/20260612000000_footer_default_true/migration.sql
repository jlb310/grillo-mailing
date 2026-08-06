-- The Clínica Alemana corporate footer is now part of the general template and
-- on by default for every campaign.
ALTER TABLE "Campaign" ALTER COLUMN "useAlemanaFooter" SET DEFAULT true;
