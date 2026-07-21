alter table public.product_variants
  add column if not exists image_url text;

comment on column public.product_variants.image_url is
  'Storage path for the image displayed when this product variant is selected.';
