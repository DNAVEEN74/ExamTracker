# ExamTracker — Notification Infrastructure

## The Core Guarantee

Every eligible user gets **one email per cron run** containing **all matching exams**. Never multiple emails in one morning. Never a missed notification. Never a duplicate.

---

## Stack (No BullMQ, No Extra Infrastructure)

| Component | Technology | Where it runs |
|---|---|---|
| Cron scheduler + eligibility matching | pg_cron inside PostgreSQL | Supabase (always running) |
| Job trigger | Supabase Database Webhook | Fires once per cron run |
| Email processing | Next.js API route | Railway |
| Email delivery | Resend | Resend API |
| Delivery tracking | Resend webhooks | Resend → Railway → Supabase |

That is it. No Redis. No BullMQ. No extra services.

---

## The Grouped-Per-User Design (Most Important Decision)

The cron does NOT loop exam by exam. It groups by user first.

**Wrong approach:**
```
SSC CGL closes in 7 days → find 8000 matching users → send 8000 emails
RRB NTPC closes in 7 days → find 6000 matching users → send 6000 emails
Result: a user who qualifies for both gets 2 emails at 9 AM
```

**Correct approach:**
```
Find all exams closing in 7 days
For each user — collect ALL exams they qualify for across all of those exams
Send ONE email per user listing all their upcoming deadlines
Result: every user gets exactly one email no matter how many exams match
```

---

## The notification_queue Table

This is the central reliability mechanism. The cron writes here. The webhook reads from here. Nothing gets lost between the two.

```sql
CREATE TABLE notification_queue (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  user_email        TEXT NOT NULL,
  notification_type VARCHAR(30) NOT NULL,
  -- DEADLINE_7D | DEADLINE_1D | WEEKLY_DIGEST | NEW_EXAM
  exam_ids          UUID[] NOT NULL,
  -- Array of ALL exam IDs for this user in this batch
  -- For NEW_EXAM type this will have just one exam_id
  status            VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  -- PENDING | PROCESSING | SENT | FAILED
  attempts          SMALLINT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  processed_at      TIMESTAMPTZ,
  failed_reason     TEXT
);

CREATE INDEX idx_nq_status  ON notification_queue(status);
CREATE INDEX idx_nq_user    ON notification_queue(user_id);
CREATE INDEX idx_nq_created ON notification_queue(created_at);
```

**Why the status column is the reliability key:** If Railway crashes mid-send, rows stay as PENDING or PROCESSING. A recovery cron (every 30 minutes) picks up anything stuck in PROCESSING for more than 10 minutes and resets it to PENDING. Nothing is ever lost.

---

## The Three Cron Jobs

Enable pg_cron in Supabase: **Dashboard → Database → Extensions → pg_cron → Enable**

```sql
-- 9:00 AM IST daily = 3:30 AM UTC
SELECT cron.schedule(
  'deadline-reminders-morning',
  '30 3 * * *',
  $$ SELECT queue_deadline_notifications('DEADLINE_7D', 7); $$
);

-- 6:00 PM IST daily = 12:30 PM UTC (1-day reminders second send)
SELECT cron.schedule(
  'deadline-reminders-evening',
  '30 12 * * *',
  $$ SELECT queue_deadline_notifications('DEADLINE_1D', 1); $$
);

-- Sunday 10:00 AM IST = 4:30 AM UTC
SELECT cron.schedule(
  'weekly-digest',
  '30 4 * * 0',
  $$ SELECT queue_weekly_digest(); $$
);

-- Every 30 minutes — picks up stuck rows and resets them
SELECT cron.schedule(
  'notification-recovery',
  '*/30 * * * *',
  $$ SELECT recover_stuck_notifications(); $$
);
```

---

## The Core SQL Function (Eligibility Matching Happens Here)

This is `queue_deadline_notifications()`. Everything happens here in one query — age check, category check, education check, state check, deduplication, grouping by user. The output is one row per user containing an array of all their matching exams.

```sql
CREATE OR REPLACE FUNCTION queue_deadline_notifications(
  p_type VARCHAR,   -- 'DEADLINE_7D' or 'DEADLINE_1D'
  p_days INTEGER    -- 7 or 1
)
RETURNS void AS $$
BEGIN

  INSERT INTO notification_queue (user_id, user_email, notification_type, exam_ids)

  SELECT
    u.id            AS user_id,
    u.email         AS user_email,
    p_type          AS notification_type,
    ARRAY_AGG(e.id) AS exam_ids
    -- ARRAY_AGG groups all matching exam IDs for this user into one array
    -- This is what makes one-email-per-user work

  FROM users u
  JOIN user_profiles up ON up.user_id = u.id
  JOIN exams e ON (

    -- TIMING: only exams closing in exactly p_days days
    e.application_end = CURRENT_DATE + p_days
    AND e.is_active = TRUE
    AND e.notification_verified = TRUE

    -- AGE CHECK: user's age on exam cutoff date within their category limit
    AND DATE_PART('year', AGE(e.age_cutoff_date, up.date_of_birth))
        BETWEEN e.min_age
        AND CASE up.category
              WHEN 'OBC' THEN e.max_age_obc
              WHEN 'SC'  THEN e.max_age_sc_st
              WHEN 'ST'  THEN e.max_age_sc_st
              WHEN 'EWS' THEN e.max_age_ews
              ELSE e.max_age_general
            END

    -- EDUCATION CHECK
    AND up.highest_qualification >= e.required_qualification

    -- STREAM CHECK: NULL means any stream qualifies
    AND (
      e.required_streams IS NULL
      OR up.qualification_stream = ANY(e.required_streams)
    )

    -- STATE CHECK: NULL means national exam, open to all
    AND (
      e.state_code IS NULL
      OR up.domicile_state = e.state_code
    )

    -- GENDER CHECK: NULL means no restriction
    AND (
      e.gender_restriction IS NULL
      OR up.gender = e.gender_restriction
    )

  )

  WHERE
    u.is_deleted = FALSE
    AND u.email IS NOT NULL
    AND up.onboarding_completed = TRUE
    AND up.email_notifications_enabled = TRUE
    AND up.notify_deadline_reminders = TRUE

    -- DEDUPLICATION CHECK 1:
    -- Has this user already been notified with this type today?
    AND NOT EXISTS (
      SELECT 1 FROM notification_log nl
      WHERE nl.user_id = u.id
        AND nl.notification_type = p_type
        AND nl.sent_at::date = CURRENT_DATE
    )

    -- DEDUPLICATION CHECK 2:
    -- Is there already a PENDING or SENT row for this user today?
    -- Prevents double-queueing if cron accidentally fires twice
    AND NOT EXISTS (
      SELECT 1 FROM notification_queue nq
      WHERE nq.user_id = u.id
        AND nq.notification_type = p_type
        AND nq.created_at::date = CURRENT_DATE
        AND nq.status IN ('PENDING', 'PROCESSING', 'SENT')
    )

  -- GROUP BY USER — one row per user, array of all their matching exams
  GROUP BY u.id, u.email

  -- Only write a row if at least one exam matched
  HAVING COUNT(e.id) > 0;

END;
$$ LANGUAGE plpgsql;
```

---

## Recovery Function

If Railway crashes mid-send, rows get stuck as PROCESSING. This runs every 30 minutes and fixes them.

```sql
CREATE OR REPLACE FUNCTION recover_stuck_notifications()
RETURNS void AS $$
BEGIN

  -- Reset anything stuck in PROCESSING for more than 10 minutes back to PENDING
  UPDATE notification_queue
  SET status = 'PENDING',
      failed_reason = 'Recovered — was stuck in PROCESSING'
  WHERE status = 'PROCESSING'
    AND processed_at < NOW() - INTERVAL '10 minutes';

  -- After 3 failed attempts mark as FAILED for manual inspection
  UPDATE notification_queue
  SET status = 'FAILED'
  WHERE status = 'PENDING'
    AND attempts >= 3;

END;
$$ LANGUAGE plpgsql;
```

---

## Supabase Database Webhook

Setup in **Supabase Dashboard → Database → Webhooks → Create webhook:**

- **Table:** `notification_queue`
- **Event:** `INSERT`
- **URL:** `https://examtracker.in/api/webhooks/process-notifications`
- **Header:** `x-webhook-secret: YOUR_SECRET`

The webhook fires once per inserted row. Since the cron inserts one row per user, and multiple users get inserted in one cron run, the webhook fires multiple times. That is fine — the processing lock below ensures only one processing loop runs at a time.

---

## Processing Lock Table

Prevents two simultaneous webhook calls from both trying to process the queue at the same time.

```sql
CREATE TABLE processing_locks (
  lock_name   VARCHAR(50) PRIMARY KEY,
  locked_at   TIMESTAMPTZ NOT NULL,
  locked_by   TEXT NOT NULL  -- store a unique request ID
);
```

---

## The API Route (Railway)

`POST /api/webhooks/process-notifications`

```
1. Verify x-webhook-secret header
   → If wrong: return 200 immediately (always 200 to Supabase or it retries forever)

2. Try to acquire processing lock
   INSERT INTO processing_locks (lock_name, locked_at, locked_by)
   VALUES ('notif_processor', NOW(), unique_request_id)
   ON CONFLICT (lock_name) DO NOTHING

   → If another request already holds the lock and it is less than 5 minutes old:
     return 200 — the other request is already processing the queue

   → If lock is older than 5 minutes: stale lock, take it over with UPDATE

3. Fetch all PENDING rows
   SELECT * FROM notification_queue
   WHERE status = 'PENDING'
   ORDER BY created_at ASC
   LIMIT 1000

4. For each row in the result:

   a. Mark as PROCESSING
      UPDATE notification_queue
      SET status = 'PROCESSING', processed_at = NOW(), attempts = attempts + 1
      WHERE id = row.id

   b. Fetch exam details for all exam_ids in this row
      SELECT id, name, application_end, vacancies_by_category,
             official_notification_url
      FROM exams
      WHERE id = ANY(row.exam_ids)
      ORDER BY application_end ASC

   c. Fetch user name for personalisation
      SELECT display_name, category FROM user_profiles WHERE user_id = row.user_id

   d. Build one personalised email
      — Show user's name in greeting
      — For each exam: show exam name, deadline, category-specific vacancy count
      — Sort exams by application_end (soonest first)
      — Subject line:
          1 exam  → "⚠️ [Exam Name] closes in 7 days"
          2 exams → "⚠️ 2 exam deadlines in 7 days — don't miss them"
          3+ exams → "⚠️ [N] exam deadlines approaching — check your list"

   e. Call Resend API
      POST https://api.resend.com/emails
      { from: "alerts@examtracker.in", to: row.user_email, subject, html }

   f. On Resend success (2xx):
      — Write one row to notification_log per exam in the batch
      — Mark notification_queue row as SENT
      — Wait 50ms before next user
        (controls send rate to ~20 emails/second, well within Resend limits)

   g. On Resend failure:
      — Mark notification_queue row back to PENDING
      — Recovery cron retries it within 30 minutes
      — After 3 attempts it becomes FAILED

5. Release the processing lock
   DELETE FROM processing_locks WHERE lock_name = 'notif_processor'
```

**The 50ms delay between users means:**
- 1,000 users → 50 seconds. Done well before 9:10 AM.
- 10,000 users → 8 minutes. Still fine.
- 100,000 users → 83 minutes. This is when you add BullMQ. You will see it coming.

---

## New Exam Alert (Event-Triggered, Not Cron)

When admin approves an exam, this fires immediately — not on a schedule.

```
Admin clicks Approve in dashboard
      ↓
API route sets notification_verified = TRUE on the exam
      ↓
Same API route immediately calls queue_new_exam_notification(exam_id)
      ↓
SQL function runs eligibility matching for this one exam
Writes one row per eligible user into notification_queue
(notification_type = 'NEW_EXAM', exam_ids = [this_exam_id])
      ↓
Supabase webhook fires → same /api/webhooks/process-notifications route
      ↓
One email per user: "New exam you qualify for: SSC CGL 2025"
```

New exam alerts are one email per exam per user — not batched. Because admin approves one exam at a time, a user will not get multiple new exam alerts simultaneously in normal operation.

---

## notification_log Table (Permanent Record)

```sql
CREATE TABLE notification_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  exam_id           UUID REFERENCES exams(id),
  notification_type VARCHAR(30) NOT NULL,
  channel           VARCHAR(20) DEFAULT 'EMAIL',
  status            VARCHAR(20) NOT NULL DEFAULT 'SENT',
  -- SENT | DELIVERED | OPENED | CLICKED | BOUNCED | SPAM_COMPLAINED
  resend_email_id   VARCHAR(100),
  sent_at           TIMESTAMPTZ DEFAULT NOW(),
  delivered_at      TIMESTAMPTZ,
  opened_at         TIMESTAMPTZ,
  clicked_at        TIMESTAMPTZ
);

-- Deduplication: prevents logging same notification twice
CREATE UNIQUE INDEX idx_nl_dedup
  ON notification_log (user_id, exam_id, notification_type)
  WHERE exam_id IS NOT NULL;

CREATE INDEX idx_nl_user_sent ON notification_log (user_id, sent_at DESC);
CREATE INDEX idx_nl_sent_at   ON notification_log (sent_at);
```

---

## Resend Webhook (Delivery Tracking)

Register in **Resend Dashboard → Webhooks** pointing to `POST /api/webhooks/resend-events`

| Event | Action |
|---|---|
| `email.delivered` | UPDATE notification_log SET status = 'DELIVERED', delivered_at = NOW() |
| `email.opened` | UPDATE notification_log SET status = 'OPENED', opened_at = NOW() |
| `email.clicked` | UPDATE notification_log SET status = 'CLICKED', clicked_at = NOW() |
| `email.bounced` | UPDATE notification_log SET status = 'BOUNCED' — set email_notifications_enabled = FALSE on user |
| `email.spam_complained` | CRITICAL — set status = 'SPAM_COMPLAINED' — set email_notifications_enabled = FALSE — never email this address again |

---

## Full Flow End to End

```
9:00 AM IST
    ↓
pg_cron fires queue_deadline_notifications('DEADLINE_7D', 7)
    ↓
One SQL query runs full eligibility matching
Groups by user — one row per user, array of all matching exam IDs
Two deduplication checks run inside the query
Rows written to notification_queue (status = PENDING)
    ↓
Supabase webhook fires for each inserted row
POST /api/webhooks/process-notifications
    ↓
API route acquires processing lock (only one runs at a time)
Fetches all PENDING rows
Loops through users with 50ms gap between each:
  — Fetch exam details for all exam_ids[]
  — Build one personalised email with all deadlines listed
  — Call Resend API
  — Write to notification_log (one row per exam)
  — Mark queue row as SENT
Processing lock released
    ↓
Every 30 minutes: recovery cron resets any stuck PROCESSING rows
    ↓
Resend delivers email to user inbox
Resend webhook fires → notification_log updated with delivery status
```

---

## Setup Checklist

- [ ] Enable pg_cron in Supabase → Database → Extensions
- [ ] Create `notification_queue` table
- [ ] Create `notification_log` table
- [ ] Create `processing_locks` table
- [ ] Create `queue_deadline_notifications(type, days)` SQL function
- [ ] Create `queue_weekly_digest()` SQL function
- [ ] Create `queue_new_exam_notification(exam_id)` SQL function
- [ ] Create `recover_stuck_notifications()` SQL function
- [ ] Schedule 4 cron jobs (3 notification + 1 recovery)
- [ ] Create Supabase Database Webhook → `/api/webhooks/process-notifications`
- [ ] Add `x-webhook-secret` to webhook headers and to Railway environment variables
- [ ] Build `/api/webhooks/process-notifications` route in Next.js
- [ ] Build `/api/webhooks/resend-events` route in Next.js
- [ ] Register Resend webhook in Resend dashboard
- [ ] Test: manually insert one row into notification_queue → verify webhook fires → verify email arrives
- [ ] Test: insert row, simulate crash (return 500 from API route) → verify recovery cron resets it → verify email eventually arrives on retry
