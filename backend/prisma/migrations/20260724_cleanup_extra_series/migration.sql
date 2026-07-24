-- Soft delete extra/test series, keep only essential ones
UPDATE "projects"
SET "deletedAt" = NOW()
WHERE "deletedAt" IS NULL
  AND "title" NOT IN ('Серия 2', 'Серия 3');
