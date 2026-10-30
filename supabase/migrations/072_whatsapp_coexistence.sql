-- Addytywna obsługa Coexistence. Nie usuwa i nie nadpisuje istniejących danych.
BEGIN;
ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS onboarding_mode TEXT DEFAULT 'cloud_api'
    CHECK (onboarding_mode IN ('cloud_api', 'coexistence')),
  ADD COLUMN IF NOT EXISTS coexistence_status TEXT,
  ADD COLUMN IF NOT EXISTS contacts_sync_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS history_sync_requested_at TIMESTAMPTZ;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'api'
    CHECK (origin IN ('api', 'business_app', 'history_sync'));

-- Migracja 037 już zapewnia pełny indeks unikalny dla tej pary.
-- Tutaj sprawdzamy rzeczywisty stan w transakcji, bez kasowania duplikatów.
-- Przy starszej bazie z duplikatami zachowujemy dane i zakładamy zwykły indeks.
-- RPC poniżej serializuje zapis po kluczu i używa ON CONFLICT DO NOTHING;
-- działa również bez indeksu unikalnego (sam ON CONFLICT nie deduplikuje
-- danych przy indeksie nieunikalnym). Nie wywołujemy zdalnej bazy w Codexie.
LOCK TABLE public.messages IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
  -- Odpowiednik już istnieje (np. idx_messages_conversation_message_id) —
  -- nie twórz drugiego indeksu na tych samych kolumnach.
  IF EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class t ON t.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'messages' AND i.indisunique
      AND i.indpred IS NULL
      AND (
        SELECT array_agg(a.attname::text ORDER BY a.attname::text)
        FROM unnest(i.indkey) k
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k
      ) = ARRAY['conversation_id', 'message_id']
  ) THEN
    RAISE NOTICE 'Unikalny indeks (conversation_id, message_id) już istnieje.';
  ELSIF EXISTS (
    SELECT 1 FROM public.messages WHERE message_id IS NOT NULL
    GROUP BY conversation_id, message_id HAVING count(*) > 1
  ) THEN
    CREATE INDEX IF NOT EXISTS ix_messages_conversation_message_id_coexistence
      ON public.messages(conversation_id, message_id) WHERE message_id IS NOT NULL;
    RAISE NOTICE 'Zachowano duplikaty messages; Coexistence używa blokady RPC.';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uq_messages_conversation_message_id
      ON public.messages(conversation_id, message_id) WHERE message_id IS NOT NULL;
  END IF;
END $$;

-- Rezerwacja PRZED wywołaniem Meta: najwyżej jedna próba na numer/typ.
-- Timeout/przerwanie procesu pozostawia *_pending i znacznik; ponowienie
-- wymaga weryfikacji, bo Meta mogła już przyjąć żądanie. Bez ślepego retry.
CREATE OR REPLACE FUNCTION public.claim_whatsapp_coexistence_sync(
  p_account_id UUID, p_phone_number_id TEXT, p_sync_type TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql SET search_path = public AS $$
DECLARE claimed_id UUID;
BEGIN
  IF p_sync_type = 'smb_app_state_sync' THEN
    UPDATE public.whatsapp_config
    SET contacts_sync_requested_at = now(), coexistence_status = 'smb_app_state_sync_pending'
    WHERE account_id = p_account_id AND phone_number_id = p_phone_number_id
      AND onboarding_mode = 'coexistence' AND contacts_sync_requested_at IS NULL
    RETURNING id INTO claimed_id;
  ELSIF p_sync_type = 'history' THEN
    UPDATE public.whatsapp_config
    SET history_sync_requested_at = now(), coexistence_status = 'history_pending'
    WHERE account_id = p_account_id AND phone_number_id = p_phone_number_id
      AND onboarding_mode = 'coexistence' AND history_sync_requested_at IS NULL
    RETURNING id INTO claimed_id;
  ELSE
    RAISE EXCEPTION 'Unsupported sync type';
  END IF;
  RETURN claimed_id IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.claim_whatsapp_coexistence_sync(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_coexistence_sync(UUID, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.store_whatsapp_coexistence_message(
  p_conversation_id UUID, p_message_id TEXT, p_sender_type TEXT,
  p_content_type TEXT, p_content_text TEXT, p_media_url TEXT, p_media_type TEXT,
  p_created_at TIMESTAMPTZ, p_origin TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql SET search_path = public AS $$
DECLARE inserted_id UUID;
BEGIN
  IF p_message_id IS NULL OR p_message_id = ''
    OR p_origin NOT IN ('business_app', 'history_sync') THEN
    RAISE EXCEPTION 'Invalid coexistence message';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_conversation_id::text || ':' || p_message_id, 0));
  IF EXISTS (SELECT 1 FROM public.messages WHERE conversation_id = p_conversation_id AND message_id = p_message_id) THEN
    RETURN false;
  END IF;
  INSERT INTO public.messages(conversation_id, message_id, sender_type, content_type,
    content_text, media_url, media_type, created_at, origin, status)
  VALUES(p_conversation_id, p_message_id, p_sender_type, p_content_type,
    p_content_text, p_media_url, p_media_type, p_created_at, p_origin, 'delivered')
  ON CONFLICT DO NOTHING RETURNING id INTO inserted_id;
  IF inserted_id IS NULL THEN RETURN false; END IF;
  -- Historia może przychodzić w odwrotnej kolejności partii. Nie cofamy
  -- podglądu rozmowy i nie oznaczamy importu jako nowej nieprzeczytanej wiadomości.
  UPDATE public.conversations
  SET last_message_at = p_created_at, last_message_text = p_content_text
  WHERE id = p_conversation_id AND (last_message_at IS NULL OR last_message_at < p_created_at);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.store_whatsapp_coexistence_message(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.store_whatsapp_coexistence_message(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT) TO service_role;

COMMIT;
