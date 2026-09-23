# Supabase migration permissions

Supabase Data API permissions must be declared explicitly for every new table.
Add grants in the same migration that creates the object; do not rely only on
project-level default privileges.

Layer Forge's database access model is:

- `service_role`: trusted server-side application access.
- `authenticated`: authentication and the user's own `profiles` row only.
- `anon`: no direct application-table access. Public storefront data is loaded
  by Astro on the server.

Row-level security policies and SQL grants are separate controls. A role needs
both an applicable grant and an applicable RLS policy unless it bypasses RLS.

## New server-only table

```sql
create table public.example (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.example enable row level security;

grant all privileges on table public.example to service_role;
```

## New authenticated table

Grant only the operations the browser client genuinely needs, then add a
matching RLS policy. Do not copy broad CRUD grants by default.

```sql
create table public.example_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preference text not null
);

alter table public.example_preferences enable row level security;

grant select, insert, update, delete
  on table public.example_preferences
  to service_role;

grant select, insert, update
  on table public.example_preferences
  to authenticated;

create policy "Users manage their own preferences"
  on public.example_preferences
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

If a table uses a standalone or serial sequence through the Data API, grant the
required sequence privileges explicitly as well:

```sql
grant usage, select, update
  on sequence public.example_id_seq
  to service_role;
```

Never grant `anon` or `authenticated` access to orders, quotes, pricing
settings, administrative data, or other private tables merely to satisfy a
permission error. Route those operations through the existing server-side
service-role client.
