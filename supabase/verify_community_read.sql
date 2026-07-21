-- Data Matters v3.2 Community read verification.
select
  to_regclass('public.community_posts') as posts_table,
  to_regclass('public.community_replies') as replies_table,
  to_regclass('public.community_reports') as reports_table,
  to_regclass('public.public_visible_community_posts') as posts_view,
  to_regclass('public.public_visible_community_replies') as replies_view;

select
  grantee,
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'service_role'
  and table_name in (
    'community_posts',
    'community_replies',
    'community_reports',
    'public_visible_community_posts',
    'public_visible_community_replies'
  )
order by table_name, privilege_type;

select * from public.public_visible_community_posts limit 5;
select * from public.public_visible_community_replies limit 5;
