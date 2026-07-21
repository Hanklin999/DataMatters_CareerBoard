-- Migration 006: synchronize analytics event constraint and insert policy.
-- Generated from analytics-events.js; rerun npm run generate:analytics-schema after registry changes.
-- Repository audit found no production-code event outside the registry. Production legacy
-- rows are unknown until the preflight query runs; this migration never deletes them.

-- GENERATED FILE. DO NOT EDIT BY HAND.
-- Source of truth: analytics-events.js
-- Regenerate with: npm run generate:analytics-schema
-- This script preserves existing analytics rows. If legacy event names exist, it aborts
-- before changing the constraint or RLS policy and reports the names for manual review.

-- Preflight: run this query by itself before applying the migration.
select distinct event_name
from public.analytics_events
where event_name not in (
    'accuracy_rating_submitted',
    'alternate_role_opened',
    'clarity_after_submitted',
    'clarity_before_submitted',
    'community_filter_selected',
    'community_post_failed',
    'community_post_form_opened',
    'community_post_opened',
    'community_post_submitted',
    'community_reply_failed',
    'community_reply_form_opened',
    'community_reply_submitted',
    'community_report_opened',
    'community_report_submitted',
    'community_sort_changed',
    'community_viewed',
    'domain_selected',
    'external_job_clicked',
    'industry_selected',
    'job_opened',
    'job_viewed',
    'landing_viewed',
    'page_viewed',
    'quiz_completed',
    'quiz_question_answered',
    'quiz_restarted',
    'quiz_started',
    'quiz_step_completed',
    'quiz_step_viewed',
    'result_alternate_role_opened',
    'result_feedback_submitted',
    'result_feedback_viewed',
    'result_hero_viewed',
    'result_job_card_clicked',
    'result_primary_cta_clicked',
    'result_profile_collapsed',
    'result_profile_expanded',
    'result_share_clicked',
    'result_viewed',
    'role_compare_completed',
    'role_compare_job_opened',
    'role_compare_started',
    'role_opened',
    'share_image_downloaded',
    'share_image_generated',
    'share_image_generation_failed',
    'share_image_generation_started',
    'share_link_copied',
    'share_native_cancelled',
    'share_native_completed',
    'share_native_started',
    'share_preview_opened',
    'shared_result_landed',
    'shared_result_quiz_completed',
    'shared_result_quiz_started'
)
order by event_name;

begin;

do $$
declare
  legacy_events text;
begin
  select string_agg(event_name, ', ' order by event_name)
  into legacy_events
  from (
    select distinct event_name
    from public.analytics_events
    where event_name not in (
      'accuracy_rating_submitted',
      'alternate_role_opened',
      'clarity_after_submitted',
      'clarity_before_submitted',
      'community_filter_selected',
      'community_post_failed',
      'community_post_form_opened',
      'community_post_opened',
      'community_post_submitted',
      'community_reply_failed',
      'community_reply_form_opened',
      'community_reply_submitted',
      'community_report_opened',
      'community_report_submitted',
      'community_sort_changed',
      'community_viewed',
      'domain_selected',
      'external_job_clicked',
      'industry_selected',
      'job_opened',
      'job_viewed',
      'landing_viewed',
      'page_viewed',
      'quiz_completed',
      'quiz_question_answered',
      'quiz_restarted',
      'quiz_started',
      'quiz_step_completed',
      'quiz_step_viewed',
      'result_alternate_role_opened',
      'result_feedback_submitted',
      'result_feedback_viewed',
      'result_hero_viewed',
      'result_job_card_clicked',
      'result_primary_cta_clicked',
      'result_profile_collapsed',
      'result_profile_expanded',
      'result_share_clicked',
      'result_viewed',
      'role_compare_completed',
      'role_compare_job_opened',
      'role_compare_started',
      'role_opened',
      'share_image_downloaded',
      'share_image_generated',
      'share_image_generation_failed',
      'share_image_generation_started',
      'share_link_copied',
      'share_native_cancelled',
      'share_native_completed',
      'share_native_started',
      'share_preview_opened',
      'shared_result_landed',
      'shared_result_quiz_completed',
      'shared_result_quiz_started'
    )
  ) legacy;

  if legacy_events is not null then
    raise exception using
      message = 'Analytics event constraint was not changed because legacy event names exist.',
      detail = legacy_events,
      hint = 'Map or retain these events explicitly. Do not delete production analytics data.';
  end if;
end
$$;

alter table public.analytics_events
  drop constraint if exists analytics_events_event_name_check;

alter table public.analytics_events
  drop constraint if exists chk_event_allowlist;

alter table public.analytics_events
  add constraint analytics_events_event_name_check
  check (
    event_name in (
      'accuracy_rating_submitted',
      'alternate_role_opened',
      'clarity_after_submitted',
      'clarity_before_submitted',
      'community_filter_selected',
      'community_post_failed',
      'community_post_form_opened',
      'community_post_opened',
      'community_post_submitted',
      'community_reply_failed',
      'community_reply_form_opened',
      'community_reply_submitted',
      'community_report_opened',
      'community_report_submitted',
      'community_sort_changed',
      'community_viewed',
      'domain_selected',
      'external_job_clicked',
      'industry_selected',
      'job_opened',
      'job_viewed',
      'landing_viewed',
      'page_viewed',
      'quiz_completed',
      'quiz_question_answered',
      'quiz_restarted',
      'quiz_started',
      'quiz_step_completed',
      'quiz_step_viewed',
      'result_alternate_role_opened',
      'result_feedback_submitted',
      'result_feedback_viewed',
      'result_hero_viewed',
      'result_job_card_clicked',
      'result_primary_cta_clicked',
      'result_profile_collapsed',
      'result_profile_expanded',
      'result_share_clicked',
      'result_viewed',
      'role_compare_completed',
      'role_compare_job_opened',
      'role_compare_started',
      'role_opened',
      'share_image_downloaded',
      'share_image_generated',
      'share_image_generation_failed',
      'share_image_generation_started',
      'share_link_copied',
      'share_native_cancelled',
      'share_native_completed',
      'share_native_started',
      'share_preview_opened',
      'shared_result_landed',
      'shared_result_quiz_completed',
      'shared_result_quiz_started'
    )
  );

-- The insert policy also uses the generated registry so a newly registered event is not
-- accepted by the browser client but silently rejected by RLS.
drop policy if exists analytics_events_insert_only on public.analytics_events;

create policy analytics_events_insert_only
on public.analytics_events
for insert
to anon, authenticated
with check (
  session_id is not null
  and length(trim(event_name)) > 0
  and event_name in (
    'accuracy_rating_submitted',
    'alternate_role_opened',
    'clarity_after_submitted',
    'clarity_before_submitted',
    'community_filter_selected',
    'community_post_failed',
    'community_post_form_opened',
    'community_post_opened',
    'community_post_submitted',
    'community_reply_failed',
    'community_reply_form_opened',
    'community_reply_submitted',
    'community_report_opened',
    'community_report_submitted',
    'community_sort_changed',
    'community_viewed',
    'domain_selected',
    'external_job_clicked',
    'industry_selected',
    'job_opened',
    'job_viewed',
    'landing_viewed',
    'page_viewed',
    'quiz_completed',
    'quiz_question_answered',
    'quiz_restarted',
    'quiz_started',
    'quiz_step_completed',
    'quiz_step_viewed',
    'result_alternate_role_opened',
    'result_feedback_submitted',
    'result_feedback_viewed',
    'result_hero_viewed',
    'result_job_card_clicked',
    'result_primary_cta_clicked',
    'result_profile_collapsed',
    'result_profile_expanded',
    'result_share_clicked',
    'result_viewed',
    'role_compare_completed',
    'role_compare_job_opened',
    'role_compare_started',
    'role_opened',
    'share_image_downloaded',
    'share_image_generated',
    'share_image_generation_failed',
    'share_image_generation_started',
    'share_link_copied',
    'share_native_cancelled',
    'share_native_completed',
    'share_native_started',
    'share_preview_opened',
    'shared_result_landed',
    'shared_result_quiz_completed',
    'shared_result_quiz_started'
  )
  and occurred_at = now()
);

commit;
