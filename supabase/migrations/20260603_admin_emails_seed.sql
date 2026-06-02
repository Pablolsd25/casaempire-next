-- Asegura administradores iniciales si la lista está vacía (solo BD, sin variables de entorno)
UPDATE site_settings
SET
  value = '["contacto@casaempire.net","marci_bun@hotmail.com"]',
  updated_at = now()
WHERE key = 'admin_emails'
  AND (value IS NULL OR value = '' OR value = '[]');

INSERT INTO site_settings (key, value)
VALUES (
  'admin_emails',
  '["contacto@casaempire.net","marci_bun@hotmail.com"]'
)
ON CONFLICT (key) DO NOTHING;
