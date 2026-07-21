/* Data Matters Product Analytics event registry — single source of truth. */
(function () {
  "use strict";

  const EVENTS = Object.freeze({
    LANDING_VIEWED: "landing_viewed",
    PAGE_VIEWED: "page_viewed",
    QUIZ_STARTED: "quiz_started",
    QUIZ_STEP_VIEWED: "quiz_step_viewed",
    QUIZ_STEP_COMPLETED: "quiz_step_completed",
    QUIZ_QUESTION_ANSWERED: "quiz_question_answered",
    QUIZ_COMPLETED: "quiz_completed",
    RESULT_VIEWED: "result_viewed",
    RESULT_HERO_VIEWED: "result_hero_viewed",
    ROLE_OPENED: "role_opened",
    ALTERNATE_ROLE_OPENED: "alternate_role_opened",
    DOMAIN_SELECTED: "domain_selected",
    INDUSTRY_SELECTED: "industry_selected",
    JOB_OPENED: "job_opened",
    JOB_VIEWED: "job_viewed",
    EXTERNAL_JOB_CLICKED: "external_job_clicked",
    QUIZ_RESTARTED: "quiz_restarted",
    RESULT_PRIMARY_CTA_CLICKED: "result_primary_cta_clicked",
    RESULT_SHARE_CLICKED: "result_share_clicked",
    RESULT_ALTERNATE_ROLE_OPENED: "result_alternate_role_opened",
    RESULT_PROFILE_EXPANDED: "result_profile_expanded",
    RESULT_PROFILE_COLLAPSED: "result_profile_collapsed",
    RESULT_JOB_CARD_CLICKED: "result_job_card_clicked",
    RESULT_FEEDBACK_VIEWED: "result_feedback_viewed",
    RESULT_FEEDBACK_SUBMITTED: "result_feedback_submitted",
    CLARITY_BEFORE_SUBMITTED: "clarity_before_submitted",
    CLARITY_AFTER_SUBMITTED: "clarity_after_submitted",
    ACCURACY_RATING_SUBMITTED: "accuracy_rating_submitted",
    ROLE_COMPARE_STARTED: "role_compare_started",
    ROLE_COMPARE_COMPLETED: "role_compare_completed",
    ROLE_COMPARE_JOB_OPENED: "role_compare_job_opened",
    SHARE_PREVIEW_OPENED: "share_preview_opened",
    SHARE_IMAGE_GENERATION_STARTED: "share_image_generation_started",
    SHARE_IMAGE_GENERATED: "share_image_generated",
    SHARE_IMAGE_GENERATION_FAILED: "share_image_generation_failed",
    SHARE_NATIVE_STARTED: "share_native_started",
    SHARE_NATIVE_COMPLETED: "share_native_completed",
    SHARE_NATIVE_CANCELLED: "share_native_cancelled",
    SHARE_IMAGE_DOWNLOADED: "share_image_downloaded",
    SHARE_LINK_COPIED: "share_link_copied",
    SHARED_RESULT_LANDED: "shared_result_landed",
    SHARED_RESULT_QUIZ_STARTED: "shared_result_quiz_started",
    SHARED_RESULT_QUIZ_COMPLETED: "shared_result_quiz_completed",
    COMMUNITY_VIEWED: "community_viewed",
    COMMUNITY_FILTER_SELECTED: "community_filter_selected",
    COMMUNITY_SORT_CHANGED: "community_sort_changed",
    COMMUNITY_POST_FORM_OPENED: "community_post_form_opened",
    COMMUNITY_POST_SUBMITTED: "community_post_submitted",
    COMMUNITY_POST_FAILED: "community_post_failed",
    COMMUNITY_POST_OPENED: "community_post_opened",
    COMMUNITY_REPLY_FORM_OPENED: "community_reply_form_opened",
    COMMUNITY_REPLY_SUBMITTED: "community_reply_submitted",
    COMMUNITY_REPLY_FAILED: "community_reply_failed",
    COMMUNITY_REPORT_OPENED: "community_report_opened",
    COMMUNITY_REPORT_SUBMITTED: "community_report_submitted"
  });

  const EVENT_NAMES = Object.freeze(Object.values(EVENTS));

  window.DMAnalyticsEvents = Object.freeze({
    EVENTS,
    EVENT_NAMES
  });
})();
