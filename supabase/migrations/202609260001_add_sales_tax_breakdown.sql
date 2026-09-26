alter table public.orders
  add column if not exists gst_rate numeric(7, 4) not null default 0,
  add column if not exists gst_amount numeric(12, 2) not null default 0,
  add column if not exists pst_rate numeric(7, 4) not null default 0,
  add column if not exists pst_amount numeric(12, 2) not null default 0;

comment on column public.orders.gst_rate is
  'GST percentage captured when the order was paid.';

comment on column public.orders.gst_amount is
  'GST amount captured when the order was paid.';

comment on column public.orders.pst_rate is
  'PST percentage captured when the order was paid.';

comment on column public.orders.pst_amount is
  'PST amount captured when the order was paid.';

insert into public.settings (setting_key, setting_value, updated_at)
values
  ('gst_enabled', 'false', now()),
  ('gst_rate', '5', now()),
  ('pst_enabled', 'true', now()),
  ('pst_rate', '7', now())
on conflict (setting_key) do nothing;

-- The previous Stripe automatic-tax webhook stored amount_total for shipping,
-- which already included shipping tax. Correct only internally inconsistent
-- paid orders by deriving pre-tax shipping from the authoritative order total.
update public.orders
set shipping = round(total - subtotal - tax, 2)
where
  payment_status = 'Paid'
  and coalesce(shipping, 0) > 0
  and total >= subtotal + tax
  and abs(shipping - (total - subtotal - tax)) >= 0.01;

-- Existing paid BC orders were created by the previous checkout, which
-- described and charged the combined tax field as BC PST. Preserve that
-- historical meaning while new orders store both components explicitly.
update public.orders
set
  pst_rate = 7,
  pst_amount = tax
where
  coalesce(tax, 0) > 0
  and upper(coalesce(province, '')) = 'BC'
  and coalesce(gst_amount, 0) = 0
  and coalesce(pst_amount, 0) = 0;
