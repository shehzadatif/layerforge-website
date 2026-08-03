alter table public.products
  add column if not exists bulk_discount_eligible boolean not null default false,
  add column if not exists allow_bulk_discount_on_sale boolean not null default false;

insert into public.settings (setting_key, setting_value, updated_at)
values
  ('bulk_discount_enabled', 'true', now()),
  ('bulk_discount_tier_1_minimum_quantity', '5', now()),
  ('bulk_discount_tier_1_percentage', '5', now()),
  ('bulk_discount_tier_2_minimum_quantity', '10', now()),
  ('bulk_discount_tier_2_percentage', '10', now()),
  ('bulk_discount_tier_3_minimum_quantity', '20', now()),
  ('bulk_discount_tier_3_percentage', '15', now())
on conflict (setting_key) do nothing;
