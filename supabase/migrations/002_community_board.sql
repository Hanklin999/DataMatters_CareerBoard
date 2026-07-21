-- Data Matters community board
-- Run after 001_create_analytics_events.sql.
create extension if not exists pgcrypto;

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  nickname text not null check (char_length(btrim(nickname)) between 2 and 20),
  user_type text check (user_type is null or user_type in ('高中生','大學生','研究生','轉職中','在職','其他')),
  category text not null check (category in ('職涯方向','科系與課程','實習與求職','技能學習','網站建議')),
  content text not null check (char_length(btrim(content)) between 10 and 500),
  status text not null default 'visible' check (status in ('visible','pending','hidden','deleted')),
  reply_count integer not null default 0 check (reply_count >= 0),
  session_id uuid,
  fingerprint_hash text,
  ip_hash text,
  user_agent_hash text,
  moderation_reason text,
  is_pinned boolean not null default false
);

create table if not exists public.community_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  nickname text not null check (char_length(btrim(nickname)) between 2 and 20),
  user_type text check (user_type is null or user_type in ('高中生','大學生','研究生','轉職中','在職','其他')),
  content text not null check (char_length(btrim(content)) between 2 and 300),
  status text not null default 'visible' check (status in ('visible','pending','hidden','deleted')),
  session_id uuid,
  fingerprint_hash text,
  ip_hash text,
  moderation_reason text
);

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  target_type text not null check (target_type in ('post','reply')),
  target_id uuid not null,
  reason text not null check (reason in ('垃圾訊息','不當內容','人身攻擊','洩露個人資料','廣告或詐騙','其他')),
  detail text check (detail is null or char_length(detail) <= 200),
  session_id uuid,
  fingerprint_hash text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed'))
);

create index if not exists community_posts_visible_created_idx on public.community_posts(status, created_at desc);
create index if not exists community_posts_category_idx on public.community_posts(category, status, created_at desc);
create index if not exists community_posts_fingerprint_idx on public.community_posts(fingerprint_hash, created_at desc);
create index if not exists community_replies_post_idx on public.community_replies(post_id, status, created_at);
create index if not exists community_replies_fingerprint_idx on public.community_replies(fingerprint_hash, created_at desc);
create index if not exists community_reports_open_idx on public.community_reports(status, created_at desc);
create unique index if not exists community_reports_one_per_session_idx
  on public.community_reports(target_type, target_id, session_id)
  where session_id is not null;

create or replace function public.set_community_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists community_posts_set_updated_at on public.community_posts;
create trigger community_posts_set_updated_at before update on public.community_posts
for each row execute function public.set_community_updated_at();

create or replace function public.sync_community_reply_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'visible' then update community_posts set reply_count = reply_count + 1 where id = new.post_id; end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if old.status <> 'visible' and new.status = 'visible' then update community_posts set reply_count = reply_count + 1 where id = new.post_id;
    elsif old.status = 'visible' and new.status <> 'visible' then update community_posts set reply_count = greatest(reply_count - 1, 0) where id = new.post_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.status = 'visible' then update community_posts set reply_count = greatest(reply_count - 1, 0) where id = old.post_id; end if;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists community_replies_sync_count on public.community_replies;
create trigger community_replies_sync_count
after insert or update or delete on public.community_replies
for each row execute function public.sync_community_reply_count();

alter table public.community_posts enable row level security;
alter table public.community_replies enable row level security;
alter table public.community_reports enable row level security;

-- No anon/authenticated table policies are created. Browser writes go through Netlify Functions;
-- moderation uses the service-role key only on the server.
revoke all on public.community_posts from anon, authenticated;
revoke all on public.community_replies from anon, authenticated;
revoke all on public.community_reports from anon, authenticated;

create or replace view public.public_visible_community_posts
with (security_barrier = true) as
select id, created_at, nickname, user_type, category, content, reply_count, is_pinned
from public.community_posts
where status = 'visible'
order by is_pinned desc, created_at desc;

create or replace view public.public_visible_community_replies
with (security_barrier = true) as
select id, post_id, created_at, nickname, user_type, content
from public.community_replies
where status = 'visible';

revoke all on public.public_visible_community_posts from public;
revoke all on public.public_visible_community_replies from public;
grant select on public.public_visible_community_posts to anon, authenticated;
grant select on public.public_visible_community_replies to anon, authenticated;

comment on view public.public_visible_community_posts is 'Public-only community fields; excludes hashes, session IDs and moderation fields.';
comment on view public.public_visible_community_replies is 'Public-only reply fields; excludes hashes, session IDs and moderation fields.';
