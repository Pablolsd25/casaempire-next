-- ============================================================
-- 20260531_reviews.sql
-- Tabla de reseñas de productos
-- Aplicar en: https://supabase.com/dashboard/project/frrdwgcycoeueavqhhqz/sql/new
-- ============================================================

create table if not exists reviews (
  id              uuid        primary key default uuid_generate_v4(),
  product_id      uuid        references products(id) on delete cascade,
  wix_review_id   text        unique,
  reviewer_name   text,
  reviewer_email  text,
  rating          integer     not null check (rating between 1 and 5),
  title           text,
  comment         text,
  is_approved     boolean     not null default false,
  wix_created_date timestamptz,
  created_at      timestamptz default now()
);

create index if not exists reviews_product_id_idx  on reviews (product_id);
create index if not exists reviews_is_approved_idx on reviews (is_approved);
create index if not exists reviews_rating_idx      on reviews (rating);
