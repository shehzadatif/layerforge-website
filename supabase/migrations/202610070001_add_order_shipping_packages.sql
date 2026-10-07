create table if not exists public.order_shipping_packages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  package_number integer not null check (package_number > 0),
  weight_lbs numeric(10, 2) not null check (weight_lbs > 0),
  length_in numeric(10, 2) not null check (length_in > 0),
  width_in numeric(10, 2) not null check (width_in > 0),
  height_in numeric(10, 2) not null check (height_in > 0),
  shipping_service text,
  shipping_service_name text,
  shipping_carrier text,
  tracking_number text,
  stallion_shipment_id text,
  stallion_ship_code text,
  label_path text,
  label_cost numeric(12, 2),
  label_currency text,
  label_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, package_number)
);

create index if not exists order_shipping_packages_order_id_idx
  on public.order_shipping_packages(order_id);

alter table public.order_shipping_packages enable row level security;

revoke all on table public.order_shipping_packages from anon, authenticated;
grant all on table public.order_shipping_packages to service_role;

comment on table public.order_shipping_packages is
  'One row per physical parcel. Each parcel receives its own Stallion shipment, label, and tracking number.';
