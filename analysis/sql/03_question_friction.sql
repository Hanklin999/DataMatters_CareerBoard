-- 03_question_friction.sql

-- A. Question friction scorecard
with valid as (
    select *
    from analytics_analysis.fct_question_responses
    where environment = 'production'
      and question_id is not null
),
base_metrics as (
    select
        question_id,
        min(quiz_step) as quiz_step,
        count(*) as answer_events,
        count(distinct session_id) as sessions,
        percentile_cont(0.50) within group (order by response_time_ms)
            filter (where response_time_ms between 100 and 600000) as median_response_time_ms,
        percentile_cont(0.90) within group (order by response_time_ms)
            filter (where response_time_ms between 100 and 600000) as p90_response_time_ms,
        avg(changed_answer::int)
            filter (where changed_answer is not null) as answer_change_rate,
        count(distinct selected_option) as distinct_options_selected
    from valid
    group by question_id
),
option_metrics as (
    select
        question_id,
        max(option_sessions)::numeric / nullif(sum(option_sessions), 0)
            as largest_option_share
    from (
        select
            question_id,
            selected_option,
            count(distinct session_id) as option_sessions
        from valid
        where selected_option is not null
        group by question_id, selected_option
    ) options
    group by question_id
),
question_metrics as (
    select
        base_metrics.*,
        option_metrics.largest_option_share
    from base_metrics
    left join option_metrics using (question_id)
)
select
    question_id,
    quiz_step,
    sessions,
    answer_events,
    round(median_response_time_ms::numeric, 0) as median_response_time_ms,
    round(p90_response_time_ms::numeric, 0) as p90_response_time_ms,
    round(answer_change_rate::numeric, 4) as answer_change_rate,
    distinct_options_selected,
    round(largest_option_share::numeric, 4) as largest_option_share
from question_metrics
order by
    median_response_time_ms desc nulls last,
    answer_change_rate desc nulls last;

-- B. Cleaner option-distribution table
select
    question_id,
    selected_option,
    count(distinct session_id) as sessions,
    round(
        count(distinct session_id)::numeric
        / nullif(sum(count(distinct session_id)) over (partition by question_id), 0),
        4
    ) as option_share
from analytics_analysis.fct_question_responses
where environment = 'production'
  and question_id is not null
  and selected_option is not null
group by question_id, selected_option
order by question_id, sessions desc;

-- C. Step-level abandonment
with step_views as (
    select
        quiz_step,
        count(distinct session_id) as viewed_sessions
    from analytics_analysis.stg_events
    where environment = 'production'
      and event_name = 'quiz_step_viewed'
      and quiz_step is not null
    group by quiz_step
),
step_completions as (
    select
        quiz_step,
        count(distinct session_id) as completed_sessions
    from analytics_analysis.stg_events
    where environment = 'production'
      and event_name = 'quiz_step_completed'
      and quiz_step is not null
    group by quiz_step
)
select
    v.quiz_step,
    v.viewed_sessions,
    coalesce(c.completed_sessions, 0) as completed_sessions,
    round(
        1 - coalesce(c.completed_sessions, 0)::numeric
            / nullif(v.viewed_sessions, 0),
        4
    ) as local_abandonment_rate
from step_views v
left join step_completions c using (quiz_step)
order by v.quiz_step;

-- D. Session-level answer-change behavior
select
    question_id,
    count(distinct session_id) as sessions,
    count(distinct session_id) filter (where changed_answer is true)
        as sessions_with_answer_change,
    round(
        (count(distinct session_id) filter (where changed_answer is true))::numeric
        / nullif(count(distinct session_id), 0),
        4
    ) as session_answer_change_rate
from analytics_analysis.fct_question_responses
where environment = 'production'
  and question_id is not null
group by question_id
order by session_answer_change_rate desc, sessions desc;
