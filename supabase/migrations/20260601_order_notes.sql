-- Agregar columna de nota interna en órdenes
-- Aplicar en: Supabase Dashboard → SQL Editor
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes text;
