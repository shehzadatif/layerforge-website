create table if not exists public.team_chat_conversations (
  id uuid primary key default gen_random_uuid(),
  public_token_hash text not null unique,
  visitor_name text not null default '',
  visitor_email text not null default '',
  source_page text not null default '',
  request_fingerprint text not null default '',
  status text not null default 'open' check (status in ('open', 'closed')),
  admin_seen_at timestamptz,
  last_visitor_message_at timestamptz not null default now(),
  last_team_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.team_chat_conversations(id) on delete cascade,
  sender text not null check (sender in ('visitor', 'team')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  last_success_at timestamptz,
  failure_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_chat_conversations_recent_idx
  on public.team_chat_conversations (updated_at desc);

create index if not exists team_chat_conversations_fingerprint_idx
  on public.team_chat_conversations (request_fingerprint, created_at desc);

create index if not exists team_chat_messages_conversation_idx
  on public.team_chat_messages (conversation_id, created_at);

alter table public.team_chat_conversations enable row level security;
alter table public.team_chat_messages enable row level security;
alter table public.admin_push_subscriptions enable row level security;

grant select, insert, update, delete
  on table public.team_chat_conversations,
  public.team_chat_messages,
  public.admin_push_subscriptions
  to service_role;

