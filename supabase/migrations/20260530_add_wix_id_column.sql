-- Añade columna wix_id a products para poder linkear órdenes históricas de Wix
-- a los productos migrados en Supabase.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS wix_id text;

-- Índice para búsqueda rápida por wix_id (usado en migrate-orders.ts)
CREATE INDEX IF NOT EXISTS idx_products_wix_id ON products (wix_id);
