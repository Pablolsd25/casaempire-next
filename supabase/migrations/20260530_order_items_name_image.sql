-- Adds name and product_image to order_items so product details
-- from Wix can be stored and displayed in the admin orders table.
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS name          text,
  ADD COLUMN IF NOT EXISTS product_image text;
