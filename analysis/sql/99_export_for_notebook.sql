-- 99_export_for_notebook.sql
-- Run in Supabase SQL Editor and export the result as:
-- analysis/data/analytics_events.csv
--
-- This is row-level behavioral data. Keep it local and never commit it.

select
    id,
    occurred_at,
    session_id,
    event_name,
    page_path,
    app_version,
    device_type,
    referrer_domain,
    utm_source,
    utm_medium,
    utm_campaign,
    quiz_step,
    role_id,
    recommendation_rank,
    domain_id,
    industry_id,
    job_id,
    company_name,
    accuracy_rating,
    clarity_before,
    clarity_after,
    preferred_role_id,
    properties
from public.analytics_events
where properties ->> 'environment' = 'production'
order by occurred_at;
