-- 02_funnel.sql

-- A. Overall funnel
with denominators as (
    select
        count(*) filter (where landed) as landing_sessions,
        count(*) filter (where quiz_started) as started_sessions,
        count(*) filter (where first_step_completed) as first_step_sessions,
        count(*) filter (where quiz_completed) as completed_sessions,
        count(*) filter (where result_viewed) as result_sessions,
        count(*) filter (where meaningful_exploration) as meaningful_sessions
    from analytics_analysis.fct_sessions
),
funnel as (
    select 1 as step_order, 'landing_viewed' as step, landing_sessions as sessions from denominators
    union all
    select 2, 'quiz_started', started_sessions from denominators
    union all
    select 3, 'first_step_completed', first_step_sessions from denominators
    union all
    select 4, 'quiz_completed', completed_sessions from denominators
    union all
    select 5, 'result_viewed', result_sessions from denominators
    union all
    select 6, 'meaningful_exploration', meaningful_sessions from denominators
)
select
    step_order,
    step,
    sessions,
    round(
        sessions::numeric
        / nullif(max(sessions) over (), 0),
        4
    ) as conversion_from_landing,
    round(
        sessions::numeric
        / nullif(lag(sessions) over (order by step_order), 0),
        4
    ) as conversion_from_previous_step
from funnel
order by step_order;

-- B. Funnel by device
select
    coalesce(device_type, 'unknown') as device_type,
    count(*) filter (where landed) as landing_sessions,
    count(*) filter (where quiz_started) as quiz_started_sessions,
    count(*) filter (where quiz_completed) as quiz_completed_sessions,
    count(*) filter (where result_viewed) as result_viewed_sessions,
    count(*) filter (where meaningful_exploration) as meaningful_sessions,
    round(
        (count(*) filter (where quiz_started))::numeric
        / nullif(count(*) filter (where landed), 0),
        4
    ) as quiz_start_rate,
    round(
        (count(*) filter (where quiz_completed))::numeric
        / nullif(count(*) filter (where quiz_started), 0),
        4
    ) as quiz_completion_rate,
    round(
        (count(*) filter (where meaningful_exploration))::numeric
        / nullif(count(*) filter (where quiz_completed), 0),
        4
    ) as meaningful_exploration_rate
from analytics_analysis.fct_sessions
group by coalesce(device_type, 'unknown')
order by landing_sessions desc;

-- C. Funnel by acquisition source
select
    acquisition_source,
    count(*) filter (where landed) as landing_sessions,
    count(*) filter (where quiz_started) as quiz_started_sessions,
    count(*) filter (where quiz_completed) as quiz_completed_sessions,
    count(*) filter (where meaningful_exploration) as meaningful_sessions,
    round(
        (count(*) filter (where quiz_completed))::numeric
        / nullif(count(*) filter (where quiz_started), 0),
        4
    ) as quiz_completion_rate,
    round(
        (count(*) filter (where meaningful_exploration))::numeric
        / nullif(count(*) filter (where quiz_completed), 0),
        4
    ) as meaningful_exploration_rate
from analytics_analysis.fct_sessions
group by acquisition_source
having count(*) filter (where landed) >= 5
order by landing_sessions desc;

-- D. Completion-time distribution
select
    count(*) filter (where quiz_completion_time_sec is not null) as completed_with_time,
    percentile_cont(0.25) within group (order by quiz_completion_time_sec)
        filter (where quiz_completion_time_sec between 10 and 3600) as p25_sec,
    percentile_cont(0.50) within group (order by quiz_completion_time_sec)
        filter (where quiz_completion_time_sec between 10 and 3600) as median_sec,
    percentile_cont(0.75) within group (order by quiz_completion_time_sec)
        filter (where quiz_completion_time_sec between 10 and 3600) as p75_sec,
    percentile_cont(0.90) within group (order by quiz_completion_time_sec)
        filter (where quiz_completion_time_sec between 10 and 3600) as p90_sec
from analytics_analysis.fct_sessions;

-- E. Meaningful action mix among completed sessions
select
    count(*) filter (where quiz_completed) as completed_sessions,
    count(*) filter (where quiz_completed and role_explored) as role_exploration_sessions,
    count(*) filter (where quiz_completed and role_compared) as role_comparison_sessions,
    count(*) filter (where quiz_completed and job_explored) as job_exploration_sessions,
    count(*) filter (where quiz_completed and external_job_clicked) as external_click_sessions,
    count(*) filter (where quiz_completed and share_engaged) as share_sessions,
    count(*) filter (where quiz_completed and meaningful_exploration) as meaningful_sessions
from analytics_analysis.fct_sessions;
