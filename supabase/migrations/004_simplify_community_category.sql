-- Data Matters v3.1: remove category selection from the public Community UI.
-- Keep the column for backward compatibility and use a single default value.

begin;

alter table public.community_posts
  alter column category set default '一般討論';

do $$
declare constraint_name text;
begin
  select c.conname into constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'community_posts'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%category%';

  if constraint_name is not null then
    execute format('alter table public.community_posts drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.community_posts
  add constraint community_posts_category_check
  check (category in ('一般討論','職涯方向','科系與課程','實習與求職','技能學習','網站建議'));

commit;
