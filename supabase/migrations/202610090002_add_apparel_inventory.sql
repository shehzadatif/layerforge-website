alter table public.product_variants
  add column if not exists apparel_garment_type text,
  add column if not exists apparel_quality text,
  add column if not exists apparel_color_name text,
  add column if not exists apparel_color_hex text,
  add column if not exists apparel_size text,
  add column if not exists inventory_quantity integer;

alter table public.product_variants
  drop constraint if exists product_variants_apparel_garment_type_check,
  drop constraint if exists product_variants_apparel_color_hex_check,
  drop constraint if exists product_variants_inventory_quantity_check;

alter table public.product_variants
  add constraint product_variants_apparel_garment_type_check
    check (apparel_garment_type is null or apparel_garment_type in ('t-shirt', 'hoodie')),
  add constraint product_variants_apparel_color_hex_check
    check (apparel_color_hex is null or apparel_color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint product_variants_inventory_quantity_check
    check (inventory_quantity is null or inventory_quantity >= 0);

create unique index if not exists product_variants_apparel_combination_unique_idx
  on public.product_variants (
    product_id,
    lower(apparel_quality),
    lower(apparel_color_name),
    upper(apparel_size)
  )
  where apparel_garment_type is not null;

alter table public.orders
  add column if not exists apparel_inventory_deducted_at timestamptz;

create or replace function public.deduct_apparel_inventory_for_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
begin
  perform 1
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.';
  end if;

  if exists (
    select 1
    from public.orders
    where id = p_order_id
      and apparel_inventory_deducted_at is not null
  ) then
    return;
  end if;

  for item in
    select variant_id, quantity
    from public.order_items
    where order_id = p_order_id
      and variant_id is not null
  loop
    update public.product_variants
    set inventory_quantity = inventory_quantity - item.quantity
    where id = item.variant_id
      and inventory_quantity is not null
      and inventory_quantity >= item.quantity;

    if not found and exists (
      select 1
      from public.product_variants
      where id = item.variant_id
        and inventory_quantity is not null
    ) then
      raise exception 'Insufficient apparel inventory for variant %.', item.variant_id;
    end if;
  end loop;

  update public.orders
  set apparel_inventory_deducted_at = now()
  where id = p_order_id;
end;
$$;

revoke all on function public.deduct_apparel_inventory_for_order(uuid) from public;
grant execute on function public.deduct_apparel_inventory_for_order(uuid) to service_role;

comment on column public.product_variants.inventory_quantity is
  'Available on-hand quantity for an apparel size/colour/quality combination. Null means inventory is not tracked.';
