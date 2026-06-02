-- Lista de administradores gestionada desde el panel (JSON array de emails)
INSERT INTO site_settings (key, value)
VALUES (
  'admin_emails',
  '["contacto@casaempire.net","marci_bun@hotmail.com"]'
)
ON CONFLICT (key) DO NOTHING;
