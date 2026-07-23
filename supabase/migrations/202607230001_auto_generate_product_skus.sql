create sequence if not exists public.product_sku_seq;
create sequence if not exists public.product_variant_sku_seq;

select setval(
  'public.product_sku_seq',
  greatest(
    coalesce(
      (
        select max(
          substring(sku from '^LF-P-([0-9]+)$')::bigint
        )
        from public.products
        where sku ~ '^LF-P-[0-9]+$'
      ),
      0
    ) + 1,
    1
  ),
  false
);

select setval(
  'public.product_variant_sku_seq',
  greatest(
    coalesce(
      (
        select max(
          substring(sku from '^LF-V-([0-9]+)$')::bigint
        )
        from public.product_variants
        where sku ~ '^LF-V-[0-9]+$'
      ),
      0
    ) + 1,
    1
  ),
  false
);

create or replace function public.next_product_sku()
returns text
language sql
security definer
set search_path = public, pg_temp
as $$
  select 'LF-P-' || lpad(nextval('public.product_sku_seq')::text, 6, '0');
$$;

create or replace function public.next_product_variant_sku()
returns text
language sql
security definer
set search_path = public, pg_temp
as $$
  select 'LF-V-' || lpad(
    nextval('public.product_variant_sku_seq')::text,
    6,
    '0'
  );
$$;

update public.products
set sku = public.next_product_sku()
where sku is null or btrim(sku) = '';

update public.product_variants
set sku = public.next_product_variant_sku()
where sku is null or btrim(sku) = '';

create unique index if not exists products_sku_unique_idx
  on public.products (sku);

create unique index if not exists product_variants_sku_unique_idx
  on public.product_variants (sku);

alter table public.products
  alter column sku set not null;

alter table public.product_variants
  alter column sku set not null;

create or replace function public.assign_product_sku()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' then
    new.sku := old.sku;
  elsif new.sku is null or btrim(new.sku) = '' then
    new.sku := public.next_product_sku();
  end if;

  return new;
end;
$$;

create or replace function public.assign_product_variant_sku()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' then
    new.sku := old.sku;
  elsif new.sku is null or btrim(new.sku) = '' then
    new.sku := public.next_product_variant_sku();
  end if;

  return new;
end;
$$;

drop trigger if exists products_assign_sku on public.products;
create trigger products_assign_sku
before insert or update of sku on public.products
for each row
execute function public.assign_product_sku();

drop trigger if exists product_variants_assign_sku
  on public.product_variants;
create trigger product_variants_assign_sku
before insert or update of sku on public.product_variants
for each row
execute function public.assign_product_variant_sku();

comment on column public.products.sku is
  'Stable, automatically generated Layer Forge base-product SKU.';

comment on column public.product_variants.sku is
  'Stable, automatically generated Layer Forge product-variant SKU.';
