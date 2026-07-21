# Data Matters Analytics Data Dictionary

`analytics-events.js` is the only hand-edited source of truth for event names. `analytics.js`, product code, tests, and generated Supabase SQL consume that registry. Event payloads are sanitized by `analytics.js`; only approved top-level columns and approved `properties` are persisted.

## Shared fields

Every accepted event receives these client-generated fields unless analytics is disabled: `session_id`, `event_name`, `page_path`, `app_version`, `device_type`, `properties.environment`, and `properties.client_event_id`. UTM values and external referrer domain are captured once from the landing URL/session. `occurred_at` is intentionally omitted by the browser and supplied by the database default.

## Acquisition

| Event name | Trigger | Unit | Required properties | Optional properties | Expected frequency | Predecessor | Notes |
|---|---|---|---|---|---|---|---|
| `landing_viewed` | App finishes initial load | Session | — | `landing_variant` | Once/session | — | Sent through `trackOncePerSession`. |
| `page_viewed` | `Nav.show()` displays a view | Event | `source_page` | — | Multiple/session | `landing_viewed` | Includes home, quiz stations, results, encyclopedia, community, and about. |
| `shared_result_landed` | URL contains a shared-result referral | Session | — | `role_id`, URL UTM fields | Once/page load | — | UTM is also captured into top-level analytics columns. |
| `shared_result_quiz_started` | Visitor starts quiz from a shared result | Event | `source_page=shared_result` | — | At most once/session flow | `shared_result_landed` | Only emitted for referred visitors. |
| `shared_result_quiz_completed` | Referred visitor completes quiz | Event | — | `role_id` | At most once/completed flow | `shared_result_quiz_started` | Role is the newly recommended top role. |

## Quiz funnel

| Event name | Trigger | Unit | Required properties | Optional properties | Expected frequency | Predecessor | Notes |
|---|---|---|---|---|---|---|---|
| `quiz_started` | Quiz start/reset enters station 1 | Event | `entry_point` | — | 1–2/session | `landing_viewed` or result page | Restart emits both `quiz_restarted` and a new `quiz_started`. |
| `quiz_step_viewed` | User enters a different quiz station | Event | `quiz_step`, `navigation_direction` | — | About 3/session | `quiz_started` | Same-station re-render is deduplicated. |
| `quiz_step_completed` | User leaves/completes a station | Event | `quiz_step` | `time_spent_sec`, `answered_question_count`, `total_question_count` | About 3/completed quiz | `quiz_step_viewed` | Time is capped at 1,800 seconds. |
| `quiz_completed` | Scoring finishes | Event | `completed_step_count`, `result_count` | `total_time_spent_sec` | Once/completed quiz | Final `quiz_step_completed` | No raw answers are sent. |
| `quiz_restarted` | User restarts from result page | Event | `source=result_page` | `previous_top_role_id` | Optional | `result_viewed` | Starts a new run without changing the browser session ID. |

## Question diagnostics

| Event name | Trigger | Unit | Required properties | Optional properties | Expected frequency | Predecessor | Notes |
|---|---|---|---|---|---|---|---|
| `quiz_question_answered` | Single-choice answer or debounced slider answer is recorded | Event | `question_id`, `selected_option` | `response_time_ms`, `changed_answer`, `previous_option`, `role_weight_mapping_version` | About 18–30/completed quiz | `quiz_step_viewed` | Raw answer text and full answer objects are denied. Slider changes are debounced. |

## Recommendation

| Event name | Trigger | Unit | Required properties | Optional properties | Expected frequency | Predecessor | Notes |
|---|---|---|---|---|---|---|---|
| `result_viewed` | Base scoring renders results | Event | `top_role_id`, `second_role_id`, `third_role_id` | `scoring_version`, `result_count` | Once/completed quiz | `quiz_completed` | Recommendation IDs are sent, not the answer set. |
| `result_hero_viewed` | Hero enters viewport or result render completes | Event | `role_id` | `match_level`, `result_clarity` | Usually once/result run | `result_viewed` | Guarded by viewport/run logic; duplicate paths may be deduplicated by run guards. |
| `result_primary_cta_clicked` | Main “jobs/work” result CTA is clicked | Event | `role_id` | — | Optional | `result_hero_viewed` | Primary result action. |
| `result_alternate_role_opened` | Alternate recommendation is opened | Event | `role_id`, `recommendation_rank` | `source` | Optional | `result_viewed` | Emitted together with `alternate_role_opened` for compatibility. |
| `result_profile_expanded` | Work-preference profile details expand | Event | `role_id` | — | Optional | `result_viewed` | Toggle event. |
| `result_profile_collapsed` | Work-preference profile details collapse | Event | `role_id` | — | Optional | `result_profile_expanded` | Toggle event. |
| `result_job_card_clicked` | A job card in results is clicked | Event | `job_id`, `role_id` | `domain_id`, `list_position` | Optional/multiple | `result_viewed` | Emitted together with `job_opened`. |

## Role and job exploration

| Event name | Trigger | Unit | Required properties | Optional properties | Expected frequency | Predecessor | Notes |
|---|---|---|---|---|---|---|---|
| `role_opened` | Role detail opens from result, atlas, or work-focus map | Event | `role_id` | `recommendation_rank`, `source` | Multiple/session | `result_viewed` or `page_viewed` | Shared role-detail event across entry points. |
| `alternate_role_opened` | Alternate route/detail opens | Event | `role_id`, `recommendation_rank` | `source` | Optional | `result_viewed` | Compatibility event used alongside result-specific event. |
| `role_compare_started` | First role is selected for comparison | Event | `role_id` | — | Optional | `role_opened` | One comparison flow may start multiple times. |
| `role_compare_completed` | Two-role comparison is confirmed | Event | `role_id`, `role_pair` | — | Optional | `role_compare_started` | `role_pair` format is `roleA__roleB`. |
| `role_compare_job_opened` | Job link is opened from comparison | Event | `role_id` | — | Optional/multiple | `role_compare_completed` | Comparison-specific job interaction. |
| `domain_selected` | Domain filter changes | Event | `domain_id` | `role_id`, `selection_action` | Optional/multiple | Result/job exploration | `all` is used when the filter is cleared. |
| `industry_selected` | Reserved for an industry filter selection | Event | `industry_id` | `role_id`, `selection_action` | Currently 0 | — | Registered for compatibility; current production code does not emit it. |
| `job_opened` | Job card opens from product result layer | Event | `job_id`, `role_id` | `domain_id`, `company_name`, `list_position` | Optional/multiple | `result_viewed` | Internal job-card open event. |
| `job_viewed` | Base app renders a matching job in the visible list | Event | `job_id`, `role_id` | `domain_id`, `company_name`, `list_position` | Multiple/result render | `result_viewed` or `domain_selected` | Impression-like event, not a click. |
| `external_job_clicked` | External source link is clicked | Event | `job_id`, `role_id` | `domain_id`, `company_name`, `destination_domain`, `list_position` | Optional/multiple | `job_viewed` | Analytics failure never blocks navigation. |

## Feedback

| Event name | Trigger | Unit | Required properties | Optional properties | Expected frequency | Predecessor | Notes |
|---|---|---|---|---|---|---|---|
| `result_feedback_viewed` | Feedback section enters viewport | Result run | — | — | Once/result run | `result_viewed` | Sent through run guard. |
| `clarity_before_submitted` | Optional pre-quiz clarity answer is stored | Event | `clarity_before` | — | At most once/quiz | Before scoring | Does not affect recommendation. |
| `clarity_after_submitted` | Post-result clarity answer is submitted | Event | `clarity_after` | `clarity_before`, `clarity_uplift`, `role_id` | At most once/result | `result_feedback_viewed` | Uplift is client-calculated when baseline exists. |
| `accuracy_rating_submitted` | Result accuracy rating is submitted | Event | `accuracy_rating` | `role_id` | At most once/result | `result_feedback_viewed` | Rating is stored in a dedicated top-level column. |
| `result_feedback_submitted` | Feedback form is submitted | Event | — | `clarity_before`, `clarity_after`, `accuracy_rating`, `preferred_role_id`, `role_id` | At most once/result | `result_feedback_viewed` | Aggregate submission marker; individual clarity/accuracy events may also fire. |

## Sharing

| Event name | Trigger | Unit | Required properties | Optional properties | Expected frequency | Predecessor | Notes |
|---|---|---|---|---|---|---|---|
| `result_share_clicked` | User opens result sharing | Event | `role_id` | — | Optional | `result_viewed` | Entry event for sharing funnel. |
| `share_preview_opened` | Story preview modal opens | Event | `role_id` | — | Optional | `result_share_clicked` | Preview can open before image generation completes. |
| `share_image_generation_started` | Canvas generation begins | Event | `role_id` | — | Optional/retryable | `share_preview_opened` | One attempt per generation call. |
| `share_image_generated` | Canvas image and File are successfully produced | Event | `role_id` | — | Optional | `share_image_generation_started` | Success event. |
| `share_image_generation_failed` | Canvas generation or non-cancel native share fails | Event | `role_id` | `error_type` | Optional | Generation/share start | Error string is truncated and allowlisted. |
| `share_native_started` | Native share action begins | Event | `role_id` | — | Optional | `share_image_generated` | Requires browser share support. |
| `share_native_completed` | Native share promise resolves | Event | `role_id` | — | Optional | `share_native_started` | Platform completion semantics vary. |
| `share_native_cancelled` | User cancels native share | Event | `role_id` | — | Optional | `share_native_started` | `AbortError` only. |
| `share_image_downloaded` | Story PNG download is triggered | Event | `role_id` | — | Optional/multiple | `share_image_generated` | Browser download click marker. |
| `share_link_copied` | Role share URL is copied | Event | `role_id` | — | Optional/multiple | `share_preview_opened` | Covers Clipboard API and textarea fallback. |

## Community

| Event name | Trigger | Unit | Required properties | Optional properties | Expected frequency | Predecessor | Notes |
|---|---|---|---|---|---|---|---|
| `community_viewed` | Community data loads for the first time | Session/view | — | `source_page` | Once per loaded page state | `page_viewed` | Does not include post content or nickname. |
| `community_filter_selected` | Reserved for category filter selection | Event | — | `category`, `selection_action` | Currently 0 | — | Categories were removed from the UI; warning-only unused registry event. |
| `community_sort_changed` | Sort changes between latest/replies | Event | `sort` | `source_page` | Optional/multiple | `community_viewed` | Triggers a reload. |
| `community_post_form_opened` | New-post form opens | Event | — | `source_page` | Optional | `community_viewed` | No form content is tracked. |
| `community_post_submitted` | Server accepts a new post | Event | `content_length_bucket` | `user_type`, `source_page` | Optional | `community_post_form_opened` | Only length bucket and self-selected user type are allowed. |
| `community_post_failed` | Post submission fails | Event | `error_type` | `source_page` | Optional/retryable | `community_post_form_opened` | Error code only; no content. |
| `community_post_opened` | Long post is expanded/collapsed | Event | — | `source_page` | Optional/multiple | `community_viewed` | Current trigger is content toggle, not a dedicated detail page. |
| `community_reply_form_opened` | Reply form opens | Event | — | `reply_count_bucket`, `source_page` | Optional | `community_viewed` | Bucketed reply count. |
| `community_reply_submitted` | Server accepts a reply | Event | `content_length_bucket` | `user_type`, `source_page` | Optional | `community_reply_form_opened` | No reply text is sent to analytics. |
| `community_reply_failed` | Reply submission fails | Event | `error_type` | `source_page` | Optional/retryable | `community_reply_form_opened` | Error code only. |
| `community_report_opened` | Report form opens | Event | `target_type` | `source_page` | Optional | `community_viewed` | Target type is post/reply; target ID is not tracked. |
| `community_report_submitted` | Report endpoint accepts report | Event | `target_type`, `reason` | `source_page` | Optional | `community_report_opened` | Free-text report detail is not sent to analytics. |

## Contract maintenance

1. Add or rename an event only in `analytics-events.js`.
2. Replace product calls with the matching registry constant.
3. Run `npm run generate:analytics-schema`.
4. Run `npm run test:analytics-contract` and `npm run validate`.
5. Commit both generated SQL files.
6. Before applying migration `006`, run its preflight query. If legacy rows are returned, map or retain them explicitly; never delete production analytics data just to satisfy the constraint.
