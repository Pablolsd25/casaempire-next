-- ─────────────────────────────────────────────────────────────────────────────
-- Migración: Sistema de cupones
-- Cómo ejecutar: Supabase Dashboard → SQL Editor → pegar y Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Tabla coupons ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text UNIQUE NOT NULL,
  type         text NOT NULL CHECK (type IN ('percentage', 'fixed', 'free_shipping')),
  value        numeric(10,2) NOT NULL DEFAULT 0,   -- % (0-100) o monto $; ignorado en free_shipping
  min_purchase numeric(10,2) NOT NULL DEFAULT 0,   -- compra mínima (subtotal) para aplicar
  max_uses     int,                                -- NULL = ilimitado
  used_count   int NOT NULL DEFAULT 0,
  expires_at   timestamptz,                        -- NULL = sin expiración
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Búsqueda case-insensitive por código
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code_lower ON coupons (lower(code));

-- RLS: la validación corre 100% server-side con service_role, así que
-- bloqueamos todo acceso público. service_role omite RLS por defecto.
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- ── 2. Columnas de descuento en orders ────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount    numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code text;

-- ── 3. Incremento atómico de uso ──────────────────────────────────────────────
-- Devuelve true si pudo incrementar (cupón válido y bajo el límite), false si no.
CREATE OR REPLACE FUNCTION increment_coupon_usage(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected int;
BEGIN
  UPDATE coupons
  SET used_count = used_count + 1
  WHERE lower(code) = lower(p_code)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR used_count < max_uses);
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_coupon_usage(text) TO service_role;
