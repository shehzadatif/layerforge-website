begin;

do $$
declare
  category_id_type text;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'categories'
      and column_name = 'parent_id'
  ) then
    select format_type(attribute.atttypid, attribute.atttypmod)
    into category_id_type
    from pg_attribute attribute
    join pg_class relation
      on relation.oid = attribute.attrelid
    join pg_namespace namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'categories'
      and attribute.attname = 'id'
      and attribute.attnum > 0
      and not attribute.attisdropped;

    if category_id_type is null then
      raise exception 'Unable to determine the categories.id column type.';
    end if;

    execute format(
      'alter table public.categories add column parent_id %s',
      category_id_type
    );
  end if;
end;
$$;

alter table public.categories
  drop constraint if exists categories_parent_id_fkey;

alter table public.categories
  add constraint categories_parent_id_fkey
  foreign key (parent_id)
  references public.categories(id)
  on delete restrict;

create index if not exists categories_parent_id_idx
  on public.categories(parent_id);

do $$
declare
  three_d_printing public.categories%rowtype;
begin
  select *
  into three_d_printing
  from public.categories
  where lower(btrim(name)) = '3d printing'
  limit 1;

  if three_d_printing.id is null then
    raise exception
      'The 3D Printing category must exist before adding its subcategories.';
  end if;

  insert into public.categories (name, slug, parent_id)
  select subcategory.name, subcategory.slug, three_d_printing.id
  from (
    values
      ('Tool Management', 'tool-management'),
      ('Desk & Office', 'desk-office'),
      ('Automotive', 'automotive'),
      ('Home & Organization', 'home-organization'),
      ('Replacement Parts', 'replacement-parts'),
      ('Accessories', 'accessories'),
      ('Other 3D-Printed Products', 'other-3d-printed-products')
  ) as subcategory(name, slug)
  where not exists (
    select 1
    from public.categories existing
    where existing.parent_id = three_d_printing.id
      and lower(btrim(existing.name)) = lower(subcategory.name)
  );
end;
$$;

comment on column public.categories.parent_id is
  'Optional parent category used to group storefront product categories.';

commit;
