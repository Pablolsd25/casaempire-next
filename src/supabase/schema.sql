-- =============================================
-- Casa Empire — Schema de Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =============================================

-- Extensiones
create extension if not exists "uuid-ossp";

-- =============================================
-- CATEGORÍAS
-- =============================================
create table if not exists categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text not null unique,
  description text,
  image_url   text,
  created_at  timestamptz default now()
);

-- =============================================
-- PRODUCTOS
-- =============================================
create table if not exists products (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  slug             text not null unique,
  description      text,
  price            numeric(10,2) not null,
  compare_at_price numeric(10,2),
  stock            integer not null default 0,
  manage_stock     boolean not null default false,
  category_id      uuid references categories(id) on delete set null,
  images           text[] default '{}',
  tags             text[] default '{}',
  is_active        boolean default true,
  sort_order       integer default 0,
  created_at       timestamptz default now()
);

-- =============================================
-- PERFILES (extiende auth.users de Supabase)
-- =============================================
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text,
  phone      text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Trigger para crear perfil automáticamente al registrarse
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================
-- DIRECCIONES
-- =============================================
create table if not exists addresses (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid references profiles(id) on delete cascade,
  alias       text not null default 'Casa',
  street      text not null,
  city        text not null,
  state       text not null,
  zip_code    text not null,
  country     text not null default 'México',
  is_default  boolean default false,
  created_at  timestamptz default now()
);

-- =============================================
-- ÓRDENES
-- =============================================
create table if not exists orders (
  id                      uuid primary key default uuid_generate_v4(),
  profile_id              uuid references profiles(id) on delete set null,
  status                  text not null default 'pending'
                          check (status in ('pending','paid','shipped','delivered','cancelled')),
  subtotal                numeric(10,2) not null,
  shipping_cost           numeric(10,2) not null default 99,
  total                   numeric(10,2) not null,
  openpay_transaction_id  text,
  shipping_address        jsonb,
  customer_email          text,
  created_at              timestamptz default now()
);

-- =============================================
-- ITEMS DE ÓRDENES
-- =============================================
create table if not exists order_items (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid references orders(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  quantity    integer not null,
  unit_price  numeric(10,2) not null
);

-- =============================================
-- BLOG
-- =============================================
create table if not exists blog_posts (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  slug         text not null unique,
  excerpt      text,
  content      text not null default '',
  cover_image  text,
  is_published boolean default false,
  published_at timestamptz,
  created_at   timestamptz default now()
);

-- =============================================
-- RLS (Row Level Security)
-- =============================================
alter table categories  enable row level security;
alter table products    enable row level security;
alter table profiles    enable row level security;
alter table addresses   enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;
alter table blog_posts  enable row level security;

-- Lectura pública: categorías, productos activos, blog publicado
create policy "Categorias publicas" on categories for select using (true);
create policy "Productos activos publicos" on products for select using (is_active = true);
create policy "Blog publicado publico" on blog_posts for select using (is_published = true);

-- Perfiles: cada usuario solo ve y edita el suyo
create policy "Perfil propio" on profiles for all using (auth.uid() = id);

-- Direcciones: solo el dueño
create policy "Direcciones propias" on addresses for all using (auth.uid() = profile_id);

-- Órdenes: solo el dueño
create policy "Ordenes propias" on orders for select using (auth.uid() = profile_id);
create policy "Crear orden autenticado" on orders for insert with check (auth.uid() = profile_id);

-- Order items: visibles si la orden es del usuario
create policy "Items de orden propios" on order_items for select
  using (exists (
    select 1 from orders where orders.id = order_items.order_id and orders.profile_id = auth.uid()
  ));

-- =============================================
-- DATOS DE EJEMPLO (categorías)
-- =============================================
insert into categories (name, slug, description) values
  ('Nutrición Hombre', 'hombres',  'Suplementos y nutrición para hombres'),
  ('Nutrición Mujer',  'mujeres',  'Suplementos y nutrición para mujeres'),
  ('Ofertas',          'ofertas',  'Productos en oferta')
on conflict (slug) do nothing;
