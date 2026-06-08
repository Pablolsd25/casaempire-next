-- Marca si ya se envió la confirmación al cliente (evita duplicados y permite reintento vía webhook)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmation_email_sent_at timestamptz;
