drop view if exists public.public_visible_community_replies;
drop view if exists public.public_visible_community_posts;
drop trigger if exists community_replies_sync_count on public.community_replies;
drop trigger if exists community_posts_set_updated_at on public.community_posts;
drop function if exists public.sync_community_reply_count();
drop function if exists public.set_community_updated_at();
drop table if exists public.community_reports;
drop table if exists public.community_replies;
drop table if exists public.community_posts;
