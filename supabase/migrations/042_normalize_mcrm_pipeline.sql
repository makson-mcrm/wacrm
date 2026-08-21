-- Convert every existing WaCRM starter pipeline to the approved mCRM 4.0 layout.
-- Existing deals keep their stage ids and therefore remain attached to the
-- corresponding renamed stage. Two missing stages are appended.
BEGIN;

UPDATE accounts SET default_currency = 'PLN' WHERE default_currency = 'USD';
UPDATE deals SET currency = 'PLN' WHERE currency = 'USD' AND value = 0;

UPDATE pipelines SET name = 'mFinanse' WHERE name = 'Sales Pipeline';

UPDATE pipeline_stages SET name = '1. LEAD / KONTAKT', color = '#3b82f6' WHERE position = 0;
UPDATE pipeline_stages SET name = '2. SPOTKANIE / AUDYT', color = '#06b6d4' WHERE position = 1;
UPDATE pipeline_stages SET name = '3. POCZEKALNIA', color = '#eab308' WHERE position = 2;
UPDATE pipeline_stages SET name = '4. OFERTA / ANALIZA', color = '#f97316' WHERE position = 3;
UPDATE pipeline_stages SET name = '5. WNIOSKI — moje / banki', color = '#8b5cf6' WHERE position = 4;

INSERT INTO pipeline_stages (pipeline_id, name, color, position)
SELECT p.id, '6. SPRZEDAŻ / URUCHOMIENIE / FV', '#22c55e', 5
FROM pipelines p
WHERE NOT EXISTS (
  SELECT 1 FROM pipeline_stages s WHERE s.pipeline_id = p.id AND s.position = 5
);

INSERT INTO pipeline_stages (pipeline_id, name, color, position)
SELECT p.id, '7. ARCHIWUM / ROZLICZONE', '#64748b', 6
FROM pipelines p
WHERE NOT EXISTS (
  SELECT 1 FROM pipeline_stages s WHERE s.pipeline_id = p.id AND s.position = 6
);

COMMIT;
