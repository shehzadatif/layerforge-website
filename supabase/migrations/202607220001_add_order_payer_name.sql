alter table public.orders
add column if not exists payer_name text;

comment on column public.orders.payer_name is
  'Name supplied by Stripe Checkout for the payer; distinct from the quoted customer shown in Bill To.';
