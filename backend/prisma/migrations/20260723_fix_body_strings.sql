-- Миграция: конвертация body-строк в JSONB объекты
-- Проблема: старые сцены хранят body как JSON-строку вместо нативного JSONB
-- Решение: парсить строку и сохранить как объект

UPDATE "Scene"
SET body =
  CASE
    WHEN body::text LIKE '{%' THEN body::jsonb
    ELSE ('{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":""}]}]}'::jsonb)
  END
WHERE body::text LIKE '{%' AND body::text NOT LIKE 'dbtype%';

-- Конвертация attributes для CodexEntry
UPDATE "CodexEntry"
SET attributes =
  CASE
    WHEN attributes::text LIKE '{%' THEN attributes::jsonb
    ELSE attributes
  END
WHERE attributes::text LIKE '{%' AND attributes::text NOT LIKE 'dbtype%';

-- Конвертация snapshot для Version
UPDATE "Version"
SET snapshot =
  CASE
    WHEN snapshot::text LIKE '{%' THEN snapshot::jsonb
    ELSE snapshot
  END
WHERE snapshot::text LIKE '{%' AND snapshot::text NOT LIKE 'dbtype%';
