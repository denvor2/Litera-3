-- Soft delete test projects from autotests to clean up dropdown
UPDATE "projects"
SET "deletedAt" = NOW()
WHERE "title" = 'Test Project';
