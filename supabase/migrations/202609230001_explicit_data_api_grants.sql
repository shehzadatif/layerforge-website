begin;

-- Supabase no longer automatically grants Data API access to new public
-- tables. Keep these grants explicit so production, preview branches, and
-- local database resets behave consistently.
grant usage on schema public to anon, authenticated, service_role;

-- The application reads an authenticated user's profile in middleware to
-- authorize access to the admin area. Row-level security remains responsible
-- for limiting which profile rows that user can read.
grant select on table public.profiles to authenticated;

-- All application data access is performed by trusted server-side code using
-- the service-role client. Anonymous visitors never need direct table access.
grant all privileges on table
  public.categories,
  public.materials,
  public.order_items,
  public.orders,
  public.product_images,
  public.product_materials,
  public.product_variants,
  public.products,
  public.profiles,
  public.quote_items,
  public.quotes,
  public.settings
to service_role;

-- SKU generation uses these sequences. UPDATE is required by nextval(), while
-- SELECT supports sequence inspection and setval() in trusted maintenance.
grant usage, select, update on sequence
  public.product_sku_seq,
  public.product_variant_sku_seq
to service_role;

-- Defence in depth for tables and sequences created by the postgres migration
-- role. Future migrations must still include object-specific grants so their
-- intended API surface is visible during review.
alter default privileges for role postgres in schema public
  grant all privileges on tables to service_role;

alter default privileges for role postgres in schema public
  grant usage, select, update on sequences to service_role;

commit;
