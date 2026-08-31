-- HOTFIX A3: shared, ordered source/product catalogs. Additive only.
BEGIN;

INSERT INTO crm_catalog_options (account_id, catalog_type, value, position, active)
SELECT a.id, 'source', option.value, option.position, TRUE
FROM accounts a
CROSS JOIN (VALUES
  ('PODAJNIK do mbank', 1), ('Własny Kontakt', 2), ('FLASH podajnik', 3),
  ('LEAD / DK', 4), ('WKO mbank CRM', 5), ('www.makson.space/formularz', 6),
  ('TARGI / KONFERENCJE', 7), ('Pośrednik PRZEKAZAŁ', 8), ('REKOMENDACJA', 9),
  ('Partner', 10), ('zimna rozmowa', 11), ('Reklama FB', 12)
) AS option(value, position)
ON CONFLICT (account_id, catalog_type, value)
DO UPDATE SET position = EXCLUDED.position, active = TRUE, updated_at = NOW();

INSERT INTO crm_catalog_options (account_id, catalog_type, value, position, active)
SELECT a.id, 'product_group', option.value, option.position, TRUE
FROM accounts a
CROSS JOIN (VALUES
  ('1_HIPO_OF_ML', 1), ('2_FIRMA_BC_ML', 2), ('3_FIRMA_BC_NML', 3),
  ('4_GOTÓWKA_OF_NML', 4), ('5_LEASING_BC_ML', 5)
) AS option(value, position)
ON CONFLICT (account_id, catalog_type, value)
DO UPDATE SET position = EXCLUDED.position, active = TRUE, updated_at = NOW();

COMMIT;

