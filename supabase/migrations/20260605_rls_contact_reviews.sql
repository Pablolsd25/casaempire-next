-- RLS para tablas sin políticas: solo service_role (backend) puede acceder.
-- El cliente anon/authenticated no tiene políticas → acceso denegado por defecto.

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Revocar acceso directo de roles públicos si existiera por grants heredados
REVOKE ALL ON contact_submissions FROM anon, authenticated;
REVOKE ALL ON contacts FROM anon, authenticated;
REVOKE ALL ON reviews FROM anon, authenticated;

-- service_role omite RLS; estas políticas documentan la intención
CREATE POLICY service_role_contact_submissions ON contact_submissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_contacts ON contacts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_role_reviews ON reviews
  FOR ALL TO service_role USING (true) WITH CHECK (true);
