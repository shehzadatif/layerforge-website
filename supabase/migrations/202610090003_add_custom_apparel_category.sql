begin;

insert into public.categories (name, slug, parent_id)
select 'Custom Apparel', 'custom-apparel', null
where not exists (
  select 1
  from public.categories
  where slug = 'custom-apparel'
);

update public.products
set category_id = (
  select id
  from public.categories
  where slug = 'custom-apparel'
  limit 1
)
where apparel_designer_enabled = true;

commit;
