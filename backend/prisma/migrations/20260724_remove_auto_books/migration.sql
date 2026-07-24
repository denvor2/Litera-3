-- Soft delete auto-generated "Первая книга" books from all projects except Серия 2 and Серия 3
UPDATE "books"
SET "deletedAt" = NOW()
WHERE "title" = 'Первая книга'
  AND "projectId" NOT IN (
    SELECT id FROM "projects"
    WHERE "title" IN ('Серия 2', 'Серия 3')
  );
