-- Data Matters v3.2: repair Community public reads and service-role privileges.
-- Safe to run after 002_community_board.sql. Existing posts and replies are preserved.

begin;

-- Fail clearly if the base schema has not been installed.
do $$
begin
  if to_regclass('public.community_posts') is null
     or to_regclass('public.community_replies') is null
     or to_regclass('public.community_reports') is null then
    raise exception 'Community base tables are missing. Run 002_community_board.sql first.';
  end if;
end
$$;

create or replace view public.public_visible_community_posts
with (security_barrier = true) as
select
  id,
  created_at,
  nickname,
  user_type,
  content,
  reply_count,
  is_pinned
from public.community_posts
where status = 'visible';

create or replace view public.public_visible_community_replies
with (security_barrier = true) as
select
  id,
  post_id,
  created_at,
  nickname,
  user_type,
  content
from public.community_replies
where status = 'visible';

revoke all on public.community_posts from anon, authenticated;
revoke all on public.community_replies from anon, authenticated;
revoke all on public.community_reports from anon, authenticated;
revoke all on public.public_visible_community_posts from public, anon, authenticated;
revoke all on public.public_visible_community_replies from public, anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.community_posts to service_role;
grant select, insert, update, delete on public.community_replies to service_role;
grant select, insert, update, delete on public.community_reports to service_role;
grant select on public.public_visible_community_posts to service_role;
grant select on public.public_visible_community_replies to service_role;

commit;

notify pgrst, 'reload schema';
