alter table public.orders
  add column if not exists shipping_service text,
  add column if not exists shipping_service_name text,
  add column if not exists stallion_shipment_id text,
  add column if not exists stallion_ship_code text,
  add column if not exists stallion_label_path text,
  add column if not exists stallion_label_cost numeric(12, 2),
  add column if not exists stallion_label_currency text,
  add column if not exists stallion_label_created_at timestamptz,
  add column if not exists package_weight_lbs numeric(10, 2),
  add column if not exists package_length_in numeric(10, 2),
  add column if not exists package_width_in numeric(10, 2),
  add column if not exists package_height_in numeric(10, 2);

comment on column public.orders.shipping_service is
  'Stallion V5 carrier.service_code selected and paid for at checkout.';

comment on column public.orders.stallion_label_path is
  'Private Supabase Storage object path for the purchased PDF label.';

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'shipping-labels',
  'shipping-labels',
  false,
  5242880,
  array['application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
