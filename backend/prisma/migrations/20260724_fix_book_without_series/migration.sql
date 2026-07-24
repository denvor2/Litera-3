-- Fix "Книга без серии" - set isInSeries to false
UPDATE "books"
SET "isInSeries" = false
WHERE "title" = 'Книга без серии';
