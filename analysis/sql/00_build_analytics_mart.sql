-- Data Matters Product DS analysis mart
-- Safe: creates or replaces read-only views only.
-- Source table: public.analytics_events
-- Run date prepared: 2026-07-22

create schema if not exists analytics_analysis;

create or replace view analytics_analysis.stg_events as
with normalized as (
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
        coalesce(properties, '{}'::jsonb) as properties,
        nullif(properties ->> 'client_event_id', '') as client_event_id,
        nullif(properties ->> 'environment', '') as environment,
        nullif(properties ->> 'question_id', '') as question_id,
        nullif(properties ->> 'selected_option', '') as selected_option,
        case
            when (properties ->> 'response_time_ms') ~ '^[0-9]+(\.[0-9]+)?$'
            then (properties ->> 'response_time_ms')::numeric
        end as response_time_ms,
        case lower(properties ->> 'changed_answer')
            when 'true' then true
            when 'false' then false
        end as changed_answer,
        nullif(properties ->> 'previous_option', '') as previous_option,
        nullif(properties ->> 'top_role_id', '') as top_role_id_property,
        nullif(properties ->> 'second_role_id', '') as second_role_id,
        nullif(properties ->> 'third_role_id', '') as third_role_id,
        nullif(properties ->> 'match_level', '') as match_level,
        nullif(properties ->> 'result_clarity', '') as result_clarity,
        nullif(properties ->> 'source', '') as event_source,
        nullif(properties ->> 'source_section', '') as source_section,
        nullif(properties ->> 'destination_domain', '') as destination_domain,
        nullif(properties ->> 'scoring_version', '') as scoring_version,
        case lower(properties ->> 'preferred_role_was_top_1')
            when 'true' then true
            when 'false' then false
        end as preferred_role_was_top_1,
        case lower(properties ->> 'preferred_role_was_top_3')
            when 'true' then true
            when 'false' then false
        end as preferred_role_was_top_3,
        row_number() over (
            partition by coalesce(nullif(properties ->> 'client_event_id', ''), id::text)
            order by occurred_at, id
        ) as duplicate_rank
    from public.analytics_events
),
cleaned as (
    select *
    from normalized
    where duplicate_rank = 1
)
select *
from cleaned;

comment on view analytics_analysis.stg_events is
'Deduplicated and typed analytics event staging view. Rows are deduplicated by client_event_id when available.';

create or replace view analytics_analysis.fct_question_responses as
select
    id as event_id,
    occurred_at,
    session_id,
    quiz_step,
    question_id,
    selected_option,
    response_time_ms,
    changed_answer,
    previous_option,
    app_version,
    device_type,
    environment,
    properties ->> 'role_weight_mapping_version' as role_weight_mapping_version
from analytics_analysis.stg_events
where event_name = 'quiz_question_answered';

comment on view analytics_analysis.fct_question_responses is
'One row per deduplicated quiz_question_answered event.';

create or replace view analytics_analysis.fct_sessions as
with production_events as (
    select *
    from analytics_analysis.stg_events
    where environment = 'production'
),
session_rollup as (
    select
        session_id,
        min(occurred_at) as session_started_at,
        max(occurred_at) as session_ended_at,
        extract(epoch from max(occurred_at) - min(occurred_at))::numeric as observed_session_duration_sec,

        (array_agg(device_type order by occurred_at)
            filter (where device_type is not null))[1] as device_type,
        (array_agg(app_version order by occurred_at desc)
            filter (where app_version is not null))[1] as app_version,
        (array_agg(utm_source order by occurred_at)
            filter (where utm_source is not null))[1] as utm_source,
        (array_agg(utm_medium order by occurred_at)
            filter (where utm_medium is not null))[1] as utm_medium,
        (array_agg(utm_campaign order by occurred_at)
            filter (where utm_campaign is not null))[1] as utm_campaign,
        (array_agg(referrer_domain order by occurred_at)
            filter (where referrer_domain is not null))[1] as referrer_domain,

        bool_or(event_name = 'landing_viewed') as landed,
        bool_or(event_name = 'quiz_started') as quiz_started,
        bool_or(event_name = 'quiz_step_completed' and quiz_step = 1) as first_step_completed,
        bool_or(event_name = 'quiz_completed') as quiz_completed,
        bool_or(event_name = 'result_viewed') as result_viewed,

        bool_or(event_name in (
            'role_opened',
            'alternate_role_opened',
            'result_alternate_role_opened'
        )) as role_explored,

        bool_or(event_name = 'role_compare_completed') as role_compared,

        bool_or(event_name in (
            'job_opened',
            'job_viewed',
            'result_job_card_clicked'
        )) as job_explored,

        bool_or(event_name = 'external_job_clicked') as external_job_clicked,

        bool_or(event_name in (
            'result_share_clicked',
            'share_native_completed',
            'share_image_downloaded',
            'share_link_copied'
        )) as share_engaged,

        bool_or(event_name in (
            'share_native_completed',
            'share_image_downloaded',
            'share_link_copied'
        )) as share_completed,

        bool_or(event_name = 'quiz_restarted') as quiz_restarted,

        min(occurred_at) filter (where event_name = 'quiz_started') as quiz_started_at,
        min(occurred_at) filter (where event_name = 'quiz_completed') as quiz_completed_at,
        min(occurred_at) filter (where event_name = 'result_viewed') as result_viewed_at,

        coalesce(
            (array_agg(top_role_id_property order by occurred_at desc)
                filter (where top_role_id_property is not null))[1],
            (array_agg(role_id order by occurred_at desc)
                filter (
                    where role_id is not null
                      and event_name in (
                        'quiz_completed',
                        'result_viewed',
                        'result_hero_viewed'
                      )
                ))[1]
        ) as top_role_id,

        (array_agg(second_role_id order by occurred_at desc)
            filter (where second_role_id is not null))[1] as second_role_id,
        (array_agg(third_role_id order by occurred_at desc)
            filter (where third_role_id is not null))[1] as third_role_id,
        (array_agg(match_level order by occurred_at desc)
            filter (where match_level is not null))[1] as match_level,
        (array_agg(result_clarity order by occurred_at desc)
            filter (where result_clarity is not null))[1] as result_clarity,
        (array_agg(scoring_version order by occurred_at desc)
            filter (where scoring_version is not null))[1] as scoring_version,

        max(clarity_before) filter (
            where event_name in (
                'clarity_before_submitted',
                'clarity_after_submitted',
                'result_feedback_submitted'
            )
        ) as clarity_before,

        max(clarity_after) filter (
            where event_name in (
                'clarity_after_submitted',
                'result_feedback_submitted'
            )
        ) as clarity_after,

        max(accuracy_rating) filter (
            where event_name in (
                'accuracy_rating_submitted',
                'result_feedback_submitted'
            )
        ) as accuracy_rating,

        (array_agg(preferred_role_id order by occurred_at desc)
            filter (where preferred_role_id is not null))[1] as preferred_role_id,

        bool_or(preferred_role_was_top_1 is true) as preferred_role_was_top_1,
        bool_or(preferred_role_was_top_3 is true) as preferred_role_was_top_3,

        count(*) as event_count
    from production_events
    where session_id is not null
    group by session_id
)
select
    *,
    case
        when utm_source is not null then utm_source
        when referrer_domain is not null then referrer_domain
        else 'direct_or_unknown'
    end as acquisition_source,

    case
        when quiz_started_at is not null
         and quiz_completed_at is not null
         and quiz_completed_at >= quiz_started_at
        then extract(epoch from quiz_completed_at - quiz_started_at)::numeric
    end as quiz_completion_time_sec,

    case
        when clarity_before is not null and clarity_after is not null
        then clarity_after - clarity_before
    end as clarity_uplift,

    (
        quiz_completed
        and (
            role_explored
            or role_compared
            or job_explored
            or external_job_clicked
            or share_engaged
        )
    ) as meaningful_exploration
from session_rollup;

comment on view analytics_analysis.fct_sessions is
'One row per production anonymous session with funnel, exploration and feedback outcomes.';

create or replace view analytics_analysis.fct_recommendation_outcomes as
select
    session_id,
    session_started_at,
    device_type,
    acquisition_source,
    app_version,
    scoring_version,
    top_role_id,
    second_role_id,
    third_role_id,
    match_level,
    result_clarity,
    clarity_before,
    clarity_after,
    clarity_uplift,
    accuracy_rating,
    preferred_role_id,
    preferred_role_was_top_1,
    preferred_role_was_top_3,
    result_viewed,
    role_explored,
    role_compared,
    job_explored,
    external_job_clicked,
    share_engaged,
    meaningful_exploration
from analytics_analysis.fct_sessions
where quiz_completed or result_viewed;

comment on view analytics_analysis.fct_recommendation_outcomes is
'Session-level recommendation quality and downstream exploration outcomes.';
