-- Add the SCHEDULED value to BatchStatus, in its own migration so it commits
-- before any later migration uses it (PostgreSQL forbids using a freshly added
-- enum value within the same transaction that added it).
ALTER TYPE "BatchStatus" ADD VALUE 'SCHEDULED';
