-- Migration: Add wix_order_number and customer_name columns to orders table
-- Apply this in: https://supabase.com/dashboard/project/frrdwgcycoeueavqhhqz/sql/new

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS wix_order_number integer,
  ADD COLUMN IF NOT EXISTS customer_name    text;

-- Index for fast sorting by Wix order number
CREATE INDEX IF NOT EXISTS orders_wix_order_number_idx
  ON orders (wix_order_number DESC NULLS LAST);
