-- Final comprehensive cleanup: hard delete ALL test series and their data
-- Keep only: Серия 2, Серия 3
-- Using hard delete (actual DELETE, not soft delete) for test cleanup

-- Delete scenes in test projects
DELETE FROM "scenes"
WHERE "chapterId" IN (
  SELECT "chapters"."id" FROM "chapters"
  JOIN "books" ON "chapters"."bookId" = "books"."id"
  WHERE "books"."projectId" NOT IN (
    SELECT id FROM "projects" WHERE "title" IN ('Серия 2', 'Серия 3')
  )
);

-- Delete chapters in test projects
DELETE FROM "chapters"
WHERE "bookId" IN (
  SELECT "books"."id" FROM "books"
  WHERE "projectId" NOT IN (
    SELECT id FROM "projects" WHERE "title" IN ('Серия 2', 'Серия 3')
  )
);

-- Delete books in test projects
DELETE FROM "books"
WHERE "projectId" NOT IN (
  SELECT id FROM "projects" WHERE "title" IN ('Серия 2', 'Серия 3')
);

-- Delete codex entries in test projects
DELETE FROM "codex_entries"
WHERE "projectId" NOT IN (
  SELECT id FROM "projects" WHERE "title" IN ('Серия 2', 'Серия 3')
);

-- Delete notes in test projects
DELETE FROM "notes"
WHERE "projectId" NOT IN (
  SELECT id FROM "projects" WHERE "title" IN ('Серия 2', 'Серия 3')
);

-- Delete AI roles in test projects
DELETE FROM "ai_roles"
WHERE "projectId" NOT IN (
  SELECT id FROM "projects" WHERE "title" IN ('Серия 2', 'Серия 3')
);

-- Delete AI field prompts in test projects
DELETE FROM "ai_field_prompts"
WHERE "projectId" NOT IN (
  SELECT id FROM "projects" WHERE "title" IN ('Серия 2', 'Серия 3')
);

-- Delete test projects themselves
DELETE FROM "projects"
WHERE "title" NOT IN ('Серия 2', 'Серия 3');
