alter table public.products
  add column if not exists apparel_designer_enabled boolean not null default false,
  add column if not exists apparel_back_print_price numeric(10, 2) not null default 8.00;

alter table public.products
  drop constraint if exists products_apparel_back_print_price_check;

alter table public.products
  add constraint products_apparel_back_print_price_check
  check (apparel_back_print_price >= 0 and apparel_back_print_price <= 500);

alter table public.order_items
  add column if not exists design_data jsonb;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'customer-artwork',
  'customer-artwork',
  false,
  20971520,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on column public.products.apparel_designer_enabled is
  'Enables the interactive front/back apparel designer on the storefront product page.';

comment on column public.products.apparel_back_print_price is
  'Additional unit price charged when both front and back artwork are selected.';

comment on column public.order_items.design_data is
  'Private production metadata for customer-designed apparel, including artwork paths and placement.';
