-- Migration: add videos column to products table
-- Run this once in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/frrdwgcycoeueavqhhqz/sql/new

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS videos text[] DEFAULT '{}';
