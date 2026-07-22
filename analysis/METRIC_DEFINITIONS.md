# Metric Definitions

All rates use anonymous `session_id` as the default unit unless stated otherwise.

## Production session

A session with:

```sql
properties ->> 'environment' = 'production'
```

If older rows do not contain `environment`, review them before including them. Do not automatically classify missing values as production.

## Landing session

A production session containing at least one:

```text
landing_viewed
```

## Quiz start rate

```text
sessions with quiz_started
/
landing sessions
```

## First-step completion rate

```text
sessions with quiz_step_completed where quiz_step = 1
/
sessions with quiz_started
```

## Quiz completion rate

```text
sessions with quiz_completed
/
sessions with quiz_started
```

## Result view rate

```text
sessions with result_viewed
/
sessions with quiz_completed
```

## Meaningful exploration

A completed-quiz session containing at least one of:

```text
role_opened
alternate_role_opened
result_alternate_role_opened
role_compare_completed
job_opened
job_viewed
result_job_card_clicked
external_job_clicked
result_share_clicked
share_native_completed
share_image_downloaded
share_link_copied
```

## Meaningful exploration rate

```text
completed-quiz sessions with meaningful exploration
/
sessions with quiz_completed
```

## Question response time

The `response_time_ms` property of `quiz_question_answered`.

Exclude or separately flag:

- missing values;
- values below 100 ms;
- values above 10 minutes;
- non-numeric values.

Do not silently remove extreme values without reporting the exclusion.

## Answer-change rate

```text
question-answer events with changed_answer = true
/
valid question-answer events
```

This is an event-level behavioral metric. If a user changes the same question more than once, a session-level metric should also be reported.

## Clarity uplift

```text
clarity_after - clarity_before
```

Use paired observations within the same session.

This is a self-reported product-quality indicator, not automatically a causal impact estimate.

## Recommendation accuracy

Mean and distribution of `accuracy_rating` among sessions that submitted a rating.

Always report rating-response coverage:

```text
sessions with accuracy rating
/
sessions with result view
```

## Preferred-role top-one match

Use the tracked property:

```text
preferred_role_was_top_1
```

among sessions that submitted a preferred role.

## Preferred-role top-three match

Use:

```text
preferred_role_was_top_3
```

among sessions that submitted a preferred role.

## External-job click-through rate

```text
sessions with external_job_clicked
/
sessions with result_viewed
```

Also report the stricter conditional rate:

```text
sessions with external_job_clicked
/
sessions with any job-open event
```

## Share completion rate

A completed share is one of:

```text
share_native_completed
share_image_downloaded
share_link_copied
```

Do not treat `result_share_clicked` or `share_preview_opened` as a completed share.

## Device completion gap

```text
mobile quiz completion rate
-
desktop quiz completion rate
```

Report both rates and session counts. A gap alone does not identify the cause.
