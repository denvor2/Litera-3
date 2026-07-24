-- Cleanup corrupted data from before UTF-8 charset fix
-- These records have "????????" (mojibake) in their titles from old runs
-- They were soft-deleted but remain in database

-- Find and soft-delete (or hard-delete) any records with mojibake patterns
DELETE FROM "Project" WHERE title LIKE '%???%' OR title LIKE '%' || chr(63) || '%';
DELETE FROM "Book" WHERE title LIKE '%???%' OR title LIKE '%' || chr(63) || '%';
DELETE FROM "Chapter" WHERE title LIKE '%???%' OR title LIKE '%' || chr(63) || '%';
DELETE FROM "Scene" WHERE title LIKE '%???%' OR title LIKE '%' || chr(63) || '%';

-- Alternative: if you want to soft-delete instead of hard-delete:
-- UPDATE "Project" SET "deletedAt" = NOW() WHERE title LIKE '%???%';
-- UPDATE "Book" SET "deletedAt" = NOW() WHERE title LIKE '%???%';
-- UPDATE "Chapter" SET "deletedAt" = NOW() WHERE title LIKE '%???%';
-- UPDATE "Scene" SET "deletedAt" = NOW() WHERE title LIKE '%???%';
