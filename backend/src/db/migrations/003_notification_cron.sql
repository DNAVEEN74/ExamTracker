-- ═══════════════════════════════════════════════════════════════════════════════
-- ExamTracker — Notification Cron Infrastructure
-- Run this AFTER 002_eligibility_function.sql in Supabase SQL Editor.
--
-- Architecture: pg_cron inside PostgreSQL → Supabase DB Webhook → API route → Resend
-- No BullMQ. No Redis. No extra services.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Step 1: Enable pg_cron extension ─────────────────────────────────────────
-- (Also enable via Dashboard → Database → Extensions → pg_cron → Enable)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─── Step 2: notification_queue table ─────────────────────────────────────────
-- Central reliability mechanism. Cron writes here; webhook reads from here.
-- If API crashes mid-send, rows stay as PENDING/PROCESSING and get recovered.

CREATE TABLE notification_queue (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_email        TEXT NOT NULL,
    notification_type VARCHAR(30) NOT NULL,
    -- DEADLINE_7D | DEADLINE_1D | WEEKLY_DIGEST | NEW_EXAM
    exam_ids          UUID[] NOT NULL,
    -- Array of ALL exam IDs for this user in this batch (one email, many exams)
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

-- ─── Step 3: processing_locks table ──────────────────────────────────────────
-- Prevents two simultaneous webhook fires from double-processing the queue.

CREATE TABLE processing_locks (
    lock_name   VARCHAR(50) PRIMARY KEY,
    locked_at   TIMESTAMPTZ NOT NULL,
    locked_by   TEXT NOT NULL  -- unique request ID (UUID from each API call)
);

-- ─── Step 4: Rebuild notification_log to match spec exactly ──────────────────
-- Drop and recreate if it exists from the initial migration (it was simpler there).
DROP TABLE IF EXISTS notification_log CASCADE;

CREATE TABLE notification_log (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_id           UUID REFERENCES exams(id) ON DELETE SET NULL,
    notification_type VARCHAR(30) NOT NULL,
    channel           VARCHAR(20) DEFAULT 'EMAIL',
    status            VARCHAR(30) NOT NULL DEFAULT 'SENT',
    -- SENT | DELIVERED | OPENED | CLICKED | BOUNCED | SPAM_COMPLAINED
    resend_email_id   VARCHAR(200),
    sent_at           TIMESTAMPTZ DEFAULT NOW(),
    delivered_at      TIMESTAMPTZ,
    opened_at         TIMESTAMPTZ,
    clicked_at        TIMESTAMPTZ
);

-- Deduplication: prevents logging same notification twice for same exam
CREATE UNIQUE INDEX idx_nl_dedup
    ON notification_log (user_id, exam_id, notification_type)
    WHERE exam_id IS NOT NULL;

CREATE INDEX idx_nl_user_sent ON notification_log (user_id, sent_at DESC);
CREATE INDEX idx_nl_sent_at   ON notification_log (sent_at);
CREATE INDEX idx_nl_resend_id ON notification_log (resend_email_id)
    WHERE resend_email_id IS NOT NULL;

-- ─── Step 5: Add notification preference columns to user_profiles ─────────────
-- The spec references onboarding_completed on users (already there) and these:
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS notify_deadline_reminders    BOOLEAN DEFAULT TRUE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS notify_new_exams             BOOLEAN DEFAULT TRUE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS notify_weekly_digest         BOOLEAN DEFAULT TRUE;
ALTER TABLE users         ADD COLUMN IF NOT EXISTS email TEXT;  -- store email copied from auth.users

-- ─── Step 6: queue_deadline_notifications() ───────────────────────────────────
-- The core pg_cron function. Runs full eligibility matching in ONE SQL query.
-- Groups by user → one row per user → one email per user (never duplicates).

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
        ARRAY_AGG(e.id ORDER BY e.application_end ASC) AS exam_ids
        -- ORDER BY inside ARRAY_AGG ensures email shows soonest deadline first

    FROM users u
    JOIN user_profiles up ON up.user_id = u.id
    JOIN exams e ON (

        -- TIMING: exams closing in exactly p_days calendar days
        e.application_end = CURRENT_DATE + p_days
        AND e.is_active = TRUE
        AND e.notification_verified = TRUE

        -- AGE CHECK: user's age on the exam's age cutoff date within category limit
        AND DATE_PART('year', AGE(
            COALESCE(e.age_cutoff_date, e.application_end),
            up.date_of_birth
        ))
        BETWEEN COALESCE(e.min_age, 0)
        AND CASE up.category
                WHEN 'OBC_NCL' THEN COALESCE(e.max_age_obc,    e.max_age_general, 99)
                WHEN 'OBC_CL'  THEN COALESCE(e.max_age_general, 99)
                WHEN 'SC'      THEN COALESCE(e.max_age_sc_st,  e.max_age_general, 99)
                WHEN 'ST'      THEN COALESCE(e.max_age_sc_st,  e.max_age_general, 99)
                WHEN 'EWS'     THEN COALESCE(e.max_age_ews,    e.max_age_general, 99)
                ELSE                COALESCE(e.max_age_general, 99)
            END

        -- EDUCATION CHECK: user's qualification must be >= exam requirement
        -- Using CASE for ordinal comparison (PostgreSQL ENUMs aren't ordinal by default)
        AND (
            CASE up.highest_qualification
                WHEN 'CLASS_10'          THEN 1
                WHEN 'CLASS_12'          THEN 2
                WHEN 'ITI'               THEN 3
                WHEN 'DIPLOMA'           THEN 4
                WHEN 'GRADUATION'        THEN 5
                WHEN 'POST_GRADUATION'   THEN 6
                WHEN 'DOCTORATE'         THEN 7
                ELSE 5  -- Professional degrees = graduation-equivalent
            END >=
            CASE e.required_qualification
                WHEN 'CLASS_10'          THEN 1
                WHEN 'CLASS_12'          THEN 2
                WHEN 'ITI'               THEN 3
                WHEN 'DIPLOMA'           THEN 4
                WHEN 'GRADUATION'        THEN 5
                WHEN 'POST_GRADUATION'   THEN 6
                WHEN 'DOCTORATE'         THEN 7
                ELSE 5
            END
        )

        -- STREAM CHECK: NULL means any stream qualifies
        AND (
            e.required_streams IS NULL
            OR e.required_streams = '{}'
            OR up.qualification_stream = ANY(e.required_streams)
        )

        -- STATE CHECK: NULL means national exam, open to all
        AND (
            e.state_code IS NULL
            OR up.domicile_state = e.state_code
            OR (up.exam_states IS NOT NULL AND e.state_code = ANY(up.exam_states))
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
        AND u.onboarding_completed = TRUE
        AND up.email_notifications_enabled = TRUE
        AND up.notify_deadline_reminders = TRUE

        -- DEDUP CHECK 1: Has this user already been notified with this type today?
        AND NOT EXISTS (
            SELECT 1 FROM notification_log nl
            WHERE nl.user_id = u.id
              AND nl.notification_type = p_type
              AND nl.sent_at::date = CURRENT_DATE
        )

        -- DEDUP CHECK 2: Is there already a PENDING/PROCESSING/SENT row today?
        -- Prevents double-queueing if pg_cron fires twice (e.g., after a DST change)
        AND NOT EXISTS (
            SELECT 1 FROM notification_queue nq
            WHERE nq.user_id = u.id
              AND nq.notification_type = p_type
              AND nq.created_at::date = CURRENT_DATE
              AND nq.status IN ('PENDING', 'PROCESSING', 'SENT')
        )

    -- GROUP BY USER: one row per user, all matching exams aggregated into one array
    GROUP BY u.id, u.email

    -- Only insert a row if at least one exam matched this user
    HAVING COUNT(e.id) > 0;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Step 7: queue_new_exam_notification() ────────────────────────────────────
-- Event-triggered (not cron). Called immediately when admin approves an exam.
-- Runs eligibility matching for ONE specific exam, writes one row per eligible user.

CREATE OR REPLACE FUNCTION queue_new_exam_notification(p_exam_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_rows_inserted INTEGER;
BEGIN

    INSERT INTO notification_queue (user_id, user_email, notification_type, exam_ids)

    SELECT
        u.id        AS user_id,
        u.email     AS user_email,
        'NEW_EXAM'  AS notification_type,
        ARRAY[p_exam_id] AS exam_ids   -- single exam per user for new exam alerts

    FROM users u
    JOIN user_profiles up ON up.user_id = u.id
    JOIN exams e ON e.id = p_exam_id

    WHERE
        e.is_active = TRUE
        AND e.notification_verified = TRUE
        AND e.application_end >= CURRENT_DATE

        AND u.is_deleted = FALSE
        AND u.email IS NOT NULL
        AND u.onboarding_completed = TRUE
        AND up.email_notifications_enabled = TRUE
        AND up.notify_new_exams = TRUE

        -- Full eligibility matching (same logic as deadline function)
        AND DATE_PART('year', AGE(
            COALESCE(e.age_cutoff_date, e.application_end),
            up.date_of_birth
        ))
        BETWEEN COALESCE(e.min_age, 0)
        AND CASE up.category
                WHEN 'OBC_NCL' THEN COALESCE(e.max_age_obc,    e.max_age_general, 99)
                WHEN 'SC'      THEN COALESCE(e.max_age_sc_st,  e.max_age_general, 99)
                WHEN 'ST'      THEN COALESCE(e.max_age_sc_st,  e.max_age_general, 99)
                WHEN 'EWS'     THEN COALESCE(e.max_age_ews,    e.max_age_general, 99)
                ELSE                COALESCE(e.max_age_general, 99)
            END

        AND (
            CASE up.highest_qualification
                WHEN 'CLASS_10' THEN 1 WHEN 'CLASS_12' THEN 2
                WHEN 'ITI' THEN 3 WHEN 'DIPLOMA' THEN 4
                WHEN 'GRADUATION' THEN 5 WHEN 'POST_GRADUATION' THEN 6
                WHEN 'DOCTORATE' THEN 7 ELSE 5
            END >=
            CASE e.required_qualification
                WHEN 'CLASS_10' THEN 1 WHEN 'CLASS_12' THEN 2
                WHEN 'ITI' THEN 3 WHEN 'DIPLOMA' THEN 4
                WHEN 'GRADUATION' THEN 5 WHEN 'POST_GRADUATION' THEN 6
                WHEN 'DOCTORATE' THEN 7 ELSE 5
            END
        )

        AND (e.required_streams IS NULL OR e.required_streams = '{}'
             OR up.qualification_stream = ANY(e.required_streams))

        AND (e.state_code IS NULL
             OR up.domicile_state = e.state_code
             OR (up.exam_states IS NOT NULL AND e.state_code = ANY(up.exam_states)))

        AND (e.gender_restriction IS NULL OR up.gender = e.gender_restriction)

        -- DEDUP: don't re-alert for this specific exam if already sent
        AND NOT EXISTS (
            SELECT 1 FROM notification_log nl
            WHERE nl.user_id = u.id
              AND nl.exam_id = p_exam_id
              AND nl.notification_type = 'NEW_EXAM'
        );

    GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;
    RETURN v_rows_inserted;   -- returns count of users queued (useful for admin logging)

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Step 8: queue_weekly_digest() ────────────────────────────────────────────
-- Runs every Sunday 10 AM IST. Sends each user a digest of all their eligible
-- exams that are still open — not just deadlines, but the full picture.

CREATE OR REPLACE FUNCTION queue_weekly_digest()
RETURNS void AS $$
BEGIN

    INSERT INTO notification_queue (user_id, user_email, notification_type, exam_ids)

    SELECT
        u.id              AS user_id,
        u.email           AS user_email,
        'WEEKLY_DIGEST'   AS notification_type,
        ARRAY_AGG(e.id ORDER BY e.application_end ASC) AS exam_ids

    FROM users u
    JOIN user_profiles up ON up.user_id = u.id
    JOIN exams e ON (
        e.is_active = TRUE
        AND e.notification_verified = TRUE
        AND e.application_end >= CURRENT_DATE
        AND e.application_end <= CURRENT_DATE + 60  -- only exams open in next 60 days

        -- Full eligibility matching
        AND DATE_PART('year', AGE(COALESCE(e.age_cutoff_date, e.application_end), up.date_of_birth))
            BETWEEN COALESCE(e.min_age, 0)
            AND CASE up.category
                WHEN 'OBC_NCL' THEN COALESCE(e.max_age_obc,   e.max_age_general, 99)
                WHEN 'SC'      THEN COALESCE(e.max_age_sc_st, e.max_age_general, 99)
                WHEN 'ST'      THEN COALESCE(e.max_age_sc_st, e.max_age_general, 99)
                WHEN 'EWS'     THEN COALESCE(e.max_age_ews,   e.max_age_general, 99)
                ELSE                COALESCE(e.max_age_general, 99)
            END

        AND (CASE up.highest_qualification
                WHEN 'CLASS_10' THEN 1 WHEN 'CLASS_12' THEN 2
                WHEN 'ITI' THEN 3 WHEN 'DIPLOMA' THEN 4
                WHEN 'GRADUATION' THEN 5 WHEN 'POST_GRADUATION' THEN 6
                WHEN 'DOCTORATE' THEN 7 ELSE 5
             END >=
             CASE e.required_qualification
                WHEN 'CLASS_10' THEN 1 WHEN 'CLASS_12' THEN 2
                WHEN 'ITI' THEN 3 WHEN 'DIPLOMA' THEN 4
                WHEN 'GRADUATION' THEN 5 WHEN 'POST_GRADUATION' THEN 6
                WHEN 'DOCTORATE' THEN 7 ELSE 5
             END)

        AND (e.required_streams IS NULL OR e.required_streams = '{}'
             OR up.qualification_stream = ANY(e.required_streams))
        AND (e.state_code IS NULL OR up.domicile_state = e.state_code
             OR (up.exam_states IS NOT NULL AND e.state_code = ANY(up.exam_states)))
        AND (e.gender_restriction IS NULL OR up.gender = e.gender_restriction)
    )

    WHERE
        u.is_deleted = FALSE
        AND u.email IS NOT NULL
        AND u.onboarding_completed = TRUE
        AND up.email_notifications_enabled = TRUE
        AND up.notify_weekly_digest = TRUE

        -- DEDUP: no weekly digest already sent this week
        AND NOT EXISTS (
            SELECT 1 FROM notification_queue nq
            WHERE nq.user_id = u.id
              AND nq.notification_type = 'WEEKLY_DIGEST'
              AND nq.created_at >= date_trunc('week', NOW())
              AND nq.status IN ('PENDING', 'PROCESSING', 'SENT')
        )

    GROUP BY u.id, u.email
    HAVING COUNT(e.id) > 0;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Step 9: recover_stuck_notifications() ───────────────────────────────────
-- Runs every 30 minutes. Resets anything stuck in PROCESSING for >10 minutes.
-- After 3 failed attempts, marks as FAILED for manual inspection.

CREATE OR REPLACE FUNCTION recover_stuck_notifications()
RETURNS void AS $$
BEGIN

    -- Reset PROCESSING rows stuck for more than 10 minutes back to PENDING
    UPDATE notification_queue
    SET
        status       = 'PENDING',
        failed_reason = 'Recovered — was stuck in PROCESSING for >10 minutes'
    WHERE status = 'PROCESSING'
      AND processed_at < NOW() - INTERVAL '10 minutes';

    -- After 3 failed attempts, give up and mark as FAILED for manual investigation
    UPDATE notification_queue
    SET status = 'FAILED'
    WHERE status = 'PENDING'
      AND attempts >= 3;

    -- Clean up stale processing locks (older than 5 minutes — means API crashed)
    DELETE FROM processing_locks
    WHERE locked_at < NOW() - INTERVAL '5 minutes';

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Step 10: Schedule the 4 pg_cron jobs ─────────────────────────────────────

-- 9:00 AM IST = 3:30 AM UTC — 7-day deadline reminders
SELECT cron.schedule(
    'deadline-reminders-morning',
    '30 3 * * *',
    $$ SELECT queue_deadline_notifications('DEADLINE_7D', 7); $$
);

-- 6:00 PM IST = 12:30 PM UTC — 1-day final reminders
SELECT cron.schedule(
    'deadline-reminders-evening',
    '30 12 * * *',
    $$ SELECT queue_deadline_notifications('DEADLINE_1D', 1); $$
);

-- Sunday 10:00 AM IST = 4:30 AM UTC — weekly digest
SELECT cron.schedule(
    'weekly-digest',
    '30 4 * * 0',
    $$ SELECT queue_weekly_digest(); $$
);

-- Every 30 minutes — recovery + stale lock cleanup
SELECT cron.schedule(
    'notification-recovery',
    '*/30 * * * *',
    $$ SELECT recover_stuck_notifications(); $$
);

-- ─── Step 11: Grant permissions ───────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION queue_deadline_notifications(VARCHAR, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION queue_new_exam_notification(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION queue_weekly_digest() TO service_role;
GRANT EXECUTE ON FUNCTION recover_stuck_notifications() TO service_role;
