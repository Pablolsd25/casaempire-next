-- Añade columna cost (costo de la mercancía) a products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost numeric(10,2) DEFAULT NULL;
