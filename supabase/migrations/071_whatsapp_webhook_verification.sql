-- Stage 1 WhatsApp Cloud API webhook verification.
-- Only a SHA-256 digest is stored; the real verify token never enters Git.
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_verification (
  account_id uuid PRIMARY KEY REFERENCES public.accounts(id) ON DELETE CASCADE,
  token_sha256 text NOT NULL CHECK (token_sha256 ~ '^[0-9a-f]{64}$'),
  waba_id text NOT NULL,
  phone_number_id text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_webhook_verification ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.whatsapp_webhook_verification FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.whatsapp_webhook_verification TO service_role;

COMMENT ON TABLE public.whatsapp_webhook_verification IS
  'Server-only SHA-256 digests used for Meta webhook GET verification.';

