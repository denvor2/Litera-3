-- Cleanup test projects that pollute the series dropdown
-- Exclude real projects: Серия 2, Серия 3, Книги без серии system entry

-- Soft delete test projects (mark with deletedAt)
UPDATE "projects"
SET "deletedAt" = NOW()
WHERE "title" = 'Test Project'
   OR "title" IN ('Проект корзины', 'Проект экспорта', 'Сид-проект', 'Книги без серии')
   OR "title" LIKE '%Test%'
   AND "title" NOT IN ('Серия 2', 'Серия 3');

-- Optional: show what was deleted
SELECT id, title, "deletedAt" FROM "projects" WHERE "deletedAt" IS NOT NULL ORDER BY title;
