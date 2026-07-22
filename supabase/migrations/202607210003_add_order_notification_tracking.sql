alter table public.orders
  add column if not exists payment_confirmation_sent_at timestamptz;

alter table public.orders
  add column if not exists admin_notification_sent_at timestamptz;
