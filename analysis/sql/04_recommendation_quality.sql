-- 04_recommendation_quality.sql

-- A. Outcome by recommended role
select
    top_role_id,
    count(*) as result_sessions,
    count(*) filter (where accuracy_rating is not null) as rating_responses,
    round(avg(accuracy_rating)::numeric, 3) as average_accuracy_rating,
    count(*) filter (
        where clarity_before is not null and clarity_after is not null
    ) as paired_clarity_responses,
    round((avg(clarity_uplift) filter (
        where clarity_uplift is not null
    ))::numeric, 3) as average_clarity_uplift,
    round(avg(role_explored::int)::numeric, 4) as role_exploration_rate,
    round(avg(role_compared::int)::numeric, 4) as role_comparison_rate,
    round(avg(job_explored::int)::numeric, 4) as job_exploration_rate,
    round(avg(external_job_clicked::int)::numeric, 4) as external_job_click_rate,
    round(avg(meaningful_exploration::int)::numeric, 4) as meaningful_exploration_rate
from analytics_analysis.fct_recommendation_outcomes
where result_viewed
group by top_role_id
order by result_sessions desc;

-- B. Match-level calibration
select
    coalesce(match_level, '<missing>') as match_level,
    count(*) as result_sessions,
    count(*) filter (where accuracy_rating is not null) as rating_responses,
    round(avg(accuracy_rating)::numeric, 3) as average_accuracy_rating,
    round((avg(clarity_uplift) filter (
        where clarity_uplift is not null
    ))::numeric, 3) as average_clarity_uplift,
    round(avg(role_explored::int)::numeric, 4) as role_exploration_rate,
    round(avg(meaningful_exploration::int)::numeric, 4) as meaningful_exploration_rate
from analytics_analysis.fct_recommendation_outcomes
where result_viewed
group by coalesce(match_level, '<missing>')
order by result_sessions desc;

-- C. Preferred-role agreement
select
    count(*) filter (where preferred_role_id is not null) as preference_responses,
    count(*) filter (
        where preferred_role_id is not null
          and preferred_role_was_top_1
    ) as preferred_role_top_1,
    count(*) filter (
        where preferred_role_id is not null
          and preferred_role_was_top_3
    ) as preferred_role_top_3,
    round(
        (count(*) filter (
            where preferred_role_id is not null
              and preferred_role_was_top_1
        ))::numeric
        / nullif(count(*) filter (where preferred_role_id is not null), 0),
        4
    ) as top_1_match_rate,
    round(
        (count(*) filter (
            where preferred_role_id is not null
              and preferred_role_was_top_3
        ))::numeric
        / nullif(count(*) filter (where preferred_role_id is not null), 0),
        4
    ) as top_3_match_rate
from analytics_analysis.fct_recommendation_outcomes;

-- D. Recommended role versus preferred role
select
    top_role_id,
    preferred_role_id,
    count(*) as sessions,
    round(avg(accuracy_rating)::numeric, 3) as average_accuracy_rating,
    round((avg(clarity_uplift) filter (
        where clarity_uplift is not null
    ))::numeric, 3) as average_clarity_uplift
from analytics_analysis.fct_recommendation_outcomes
where preferred_role_id is not null
group by top_role_id, preferred_role_id
order by sessions desc, top_role_id, preferred_role_id;

-- E. Low-rating diagnostic role pairs
select
    top_role_id,
    second_role_id,
    count(*) as rated_sessions,
    round(avg(accuracy_rating)::numeric, 3) as average_accuracy_rating,
    round(avg(role_explored::int)::numeric, 4) as role_exploration_rate,
    round(avg(role_compared::int)::numeric, 4) as role_comparison_rate
from analytics_analysis.fct_recommendation_outcomes
where accuracy_rating is not null
group by top_role_id, second_role_id
having count(*) >= 3
order by average_accuracy_rating asc, rated_sessions desc;

-- F. Measurement gap: score-margin calibration is not yet possible
-- The current event payload does not store top_score, second_score or score_margin_1_2.
-- Add these as allowlisted numeric properties before claiming recommendation calibration.
select
    'score_margin_1_2 is not currently available in tracked properties' as data_gap,
    'Add top_score, second_score and score_margin_1_2 to result_viewed or quiz_completed' as recommended_fix;
