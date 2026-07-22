-- 05_product_decision.sql
-- Produces evidence tables for prioritization. Final prioritization still requires product judgment.

-- A. Segment gaps with a minimum denominator
with device_metrics as (
    select
        coalesce(device_type, 'unknown') as segment,
        count(*) filter (where quiz_started) as started_sessions,
        count(*) filter (where quiz_completed) as completed_sessions,
        count(*) filter (where meaningful_exploration) as meaningful_sessions,
        count(*) filter (where accuracy_rating is not null) as rating_responses,
        avg(accuracy_rating) as average_accuracy_rating
    from analytics_analysis.fct_sessions
    group by coalesce(device_type, 'unknown')
)
select
    segment,
    started_sessions,
    completed_sessions,
    meaningful_sessions,
    round(
        completed_sessions::numeric / nullif(started_sessions, 0),
        4
    ) as quiz_completion_rate,
    round(
        meaningful_sessions::numeric / nullif(completed_sessions, 0),
        4
    ) as meaningful_exploration_rate,
    rating_responses,
    round(average_accuracy_rating::numeric, 3) as average_accuracy_rating
from device_metrics
where started_sessions >= 5
order by started_sessions desc;

-- B. Product opportunity candidates
with base as (
    select
        count(*) filter (where landed) as landing_sessions,
        count(*) filter (where quiz_started) as started_sessions,
        count(*) filter (where quiz_completed) as completed_sessions,
        count(*) filter (where result_viewed) as result_sessions,
        count(*) filter (where meaningful_exploration) as meaningful_sessions,
        count(*) filter (where job_explored) as job_sessions,
        count(*) filter (where external_job_clicked) as external_click_sessions,
        count(*) filter (where accuracy_rating is not null) as rating_responses,
        avg(accuracy_rating) as average_accuracy_rating,
        count(*) filter (
            where clarity_before is not null and clarity_after is not null
        ) as paired_clarity_responses,
        avg(clarity_uplift) filter (
            where clarity_uplift is not null
        ) as average_clarity_uplift
    from analytics_analysis.fct_sessions
)
select *
from (
    select
        'Landing comprehension / quiz entry' as opportunity,
        landing_sessions as eligible_sessions,
        started_sessions as successful_sessions,
        round(started_sessions::numeric / nullif(landing_sessions, 0), 4) as current_rate,
        'Improve quiz-start rate' as decision_metric
    from base

    union all

    select
        'Quiz friction' as opportunity,
        started_sessions,
        completed_sessions,
        round(completed_sessions::numeric / nullif(started_sessions, 0), 4),
        'Improve quiz-completion rate'
    from base

    union all

    select
        'Result-page actionability' as opportunity,
        completed_sessions,
        meaningful_sessions,
        round(meaningful_sessions::numeric / nullif(completed_sessions, 0), 4),
        'Improve meaningful-exploration rate'
    from base

    union all

    select
        'Job transition' as opportunity,
        result_sessions,
        job_sessions,
        round(job_sessions::numeric / nullif(result_sessions, 0), 4),
        'Improve job-exploration rate'
    from base

    union all

    select
        'External job intent' as opportunity,
        job_sessions,
        external_click_sessions,
        round(external_click_sessions::numeric / nullif(job_sessions, 0), 4),
        'Improve external-job CTR conditional on job exploration'
    from base
) opportunities
order by eligible_sessions desc;

-- C. Evidence-readiness summary
select
    count(*) filter (where result_viewed) as result_sessions,
    count(*) filter (where accuracy_rating is not null) as rating_responses,
    count(*) filter (
        where clarity_before is not null and clarity_after is not null
    ) as paired_clarity_responses,
    case
        when count(*) filter (where result_viewed) = 0 then 'No result sessions'
        when count(*) filter (where accuracy_rating is not null) < 20
            then 'Accuracy evidence is exploratory'
        else 'Accuracy evidence has basic descriptive coverage'
    end as accuracy_readiness,
    case
        when count(*) filter (
            where clarity_before is not null and clarity_after is not null
        ) < 20 then 'Clarity evidence is exploratory'
        else 'Clarity evidence has basic descriptive coverage'
    end as clarity_readiness
from analytics_analysis.fct_sessions;
