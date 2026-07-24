-- Final cleanup: soft delete ALL projects except Серия 2 and Серия 3
-- This will cascade delete all scenes, chapters, books, codex entries, notes in those projects

WITH projects_to_delete AS (
  SELECT id FROM "projects"
  WHERE "deletedAt" IS NULL
    AND "title" NOT IN ('Серия 2', 'Серия 3')
)
UPDATE "projects"
SET "deletedAt" = NOW()
WHERE id IN (SELECT id FROM projects_to_delete);
