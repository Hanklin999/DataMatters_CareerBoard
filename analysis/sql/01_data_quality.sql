-- 01_data_quality.sql
-- Review every result before interpreting product metrics.

-- A. Coverage overview
select
    count(*) as deduplicated_events,
    count(distinct session_id) as sessions,
    min(occurred_at) as first_event_at,
    max(occurred_at) as last_event_at,
    count(*) filter (where environment = 'production') as production_events,
    count(*) filter (where environment is null) as events_missing_environment
from analytics_analysis.stg_events;

-- B. Event volume and session coverage
select
    event_name,
    count(*) as events,
    count(distinct session_id) as sessions,
    min(occurred_at) as first_seen_at,
    max(occurred_at) as last_seen_at
from analytics_analysis.stg_events
group by event_name
order by events desc, event_name;

-- C. Duplicate client_event_id audit
select
    properties ->> 'client_event_id' as client_event_id,
    count(*) as row_count,
    min(occurred_at) as first_seen_at,
    max(occurred_at) as last_seen_at
from public.analytics_events
where nullif(properties ->> 'client_event_id', '') is not null
group by properties ->> 'client_event_id'
having count(*) > 1
order by row_count desc, first_seen_at;

-- D. Required identifier problems
select
    count(*) filter (where session_id is null) as missing_session_id,
    count(*) filter (where event_name is null or event_name = '') as missing_event_name,
    count(*) filter (where occurred_at is null) as missing_occurred_at,
    count(*) filter (where properties is null) as missing_properties
from public.analytics_events;

-- E. Environment contamination
select
    coalesce(environment, '<missing>') as environment,
    count(*) as events,
    count(distinct session_id) as sessions
from analytics_analysis.stg_events
group by coalesce(environment, '<missing>')
order by events desc;

-- F. Impossible or suspicious session sequences
select
    session_id,
    landed,
    quiz_started,
    first_step_completed,
    quiz_completed,
    result_viewed,
    session_started_at,
    session_ended_at,
    observed_session_duration_sec
from analytics_analysis.fct_sessions
where
       (quiz_completed and not quiz_started)
    or (result_viewed and not quiz_completed)
    or (first_step_completed and not quiz_started)
    or observed_session_duration_sec < 0
    or observed_session_duration_sec > 86400
order by session_started_at desc;

-- G. Question-event validity
select
    count(*) as question_events,
    count(*) filter (where question_id is null) as missing_question_id,
    count(*) filter (where selected_option is null) as missing_selected_option,
    count(*) filter (where response_time_ms is null) as missing_or_non_numeric_response_time,
    count(*) filter (where response_time_ms < 100) as under_100ms,
    count(*) filter (where response_time_ms > 600000) as over_10min,
    count(*) filter (where changed_answer is null) as missing_changed_answer
from analytics_analysis.fct_question_responses
where environment = 'production';

-- H. Result-event role coverage
select
    event_name,
    count(*) as events,
    count(*) filter (
        where coalesce(top_role_id_property, role_id) is null
    ) as missing_role_identifier
from analytics_analysis.stg_events
where environment = 'production'
  and event_name in (
      'quiz_completed',
      'result_viewed',
      'result_hero_viewed'
  )
group by event_name
order by event_name;

-- I. Feedback response coverage
select
    count(*) filter (where result_viewed) as result_sessions,
    count(*) filter (where accuracy_rating is not null) as accuracy_responses,
    count(*) filter (
        where clarity_before is not null and clarity_after is not null
    ) as paired_clarity_responses,
    round(
        (count(*) filter (where accuracy_rating is not null))::numeric
        / nullif(count(*) filter (where result_viewed), 0),
        4
    ) as accuracy_response_coverage,
    round(
        (count(*) filter (
            where clarity_before is not null and clarity_after is not null
        ))::numeric
        / nullif(count(*) filter (where result_viewed), 0),
        4
    ) as paired_clarity_coverage
from analytics_analysis.fct_sessions;
