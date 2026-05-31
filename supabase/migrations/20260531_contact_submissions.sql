-- ============================================================
-- 20260531_contact_submissions.sql
-- Tabla para persistir mensajes del formulario de contacto
-- Aplicar en: https://supabase.com/dashboard/project/frrdwgcycoeueavqhhqz/sql/new
-- ============================================================

create table if not exists contact_submissions (
  id         uuid        primary key default uuid_generate_v4(),
  nombre     text,
  apellido   text,
  email      text        not null,
  whatsapp   text,
  mensaje    text        not null,
  leido      boolean     not null default false,
  created_at timestamptz default now()
);

create index if not exists contact_submissions_leido_idx on contact_submissions (leido);
create index if not exists contact_submissions_created_idx on contact_submissions (created_at desc);
