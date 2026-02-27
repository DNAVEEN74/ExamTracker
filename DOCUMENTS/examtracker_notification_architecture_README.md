# ExamTracker India — Notification Delivery Architecture

**Document Type:** Technical Reference
**Version:** 1.0
**Date:** February 2026
**MVP Scope:** Email only via Resend
**V2 Scope:** WhatsApp (Premium) + Web Push (All users)

---

## Overview

The notification system is the core product loop of ExamTracker. It is what makes users come back. An aspirant completes onboarding, we match them to eligible exams, and then we alert them at every critical moment: new exam opens, deadline approaching, admit card available, and results declared.

**MVP launches with email only via Resend.** This keeps complexity low while covering the notification needs of all users. Email works for everyone — even aspirants on slow connections, even those without smartphones.

---

## The Four Email Notification Types

| Type | Trigger | Subject Line | When Sent | Priority |
|------|---------|-------------|----------|---------|
| New Exam Alert | Eligible exam added to DB + approved | 🆕 New exam you qualify for: SSC CGL 2025 | Within 2 hours of admin approving the exam record | HIGH — sent immediately |
| 7-Day Deadline Reminder | `application_end` is exactly 7 days away | ⚠️ 7 days left to apply: SSC CGL 2025 | Daily cron at 9:00 AM IST | HIGH — time-sensitive |
| 1-Day Deadline Reminder | `application_end` is exactly 1 day away | 🚨 LAST DAY to apply: SSC CGL 2025 | Daily cron 9:00 AM IST + 6:00 PM IST | CRITICAL — sent twice |
| Weekly Digest | Every Sunday 10:00 AM IST | Your 12 open government exams this week | Weekly scheduled job | MEDIUM — informational |

---

## Core Notification Loop

Two distinct flows: **event-triggered** (new exam approved) and **scheduled/cron** (deadline reminders, weekly digest).

---

## Flow A: New Exam Alert (Event-Triggered)

### Step 1 — Admin Approves Exam Record
When an exam record goes from DRAFT to APPROVED (`notification_verified = TRUE` and `is_active = TRUE`), a Supabase database webhook fires, triggering a BullMQ job: `new_exam_notification` with `exam_id` as payload.

### Step 2 — Eligibility Query — Find All Matching Users
```sql
SELECT u.id, u.phone, u.email, up.category
FROM users u
JOIN user_profiles up ON u.id = up.user_id
WHERE up.onboarding_completed = TRUE
  AND u.is_deleted = FALSE
  AND EXTRACT(YEAR FROM AGE(NOW(), up.date_of_birth)) BETWEEN $min_age AND $max_age_{category}
  AND up.highest_qualification >= $required_qualification
  AND ($required_streams IS NULL OR up.qualification_stream = ANY($required_streams))
  AND ($state_code IS NULL OR up.domicile_state = $state_code)
  AND ($gender IS NULL OR up.gender = $gender)
  AND u.email IS NOT NULL
```

**Scale Note:** At 500K MAU, a major SSC notification could match 50,000–200,000 users. Do NOT send all at once — batch into chunks of 500 users and process over 2–3 hours. Priority: users whose `application_end` is soonest get their emails first.

### Step 3 — Deduplication Check
Before sending any email, check `notification_log` for an existing row with `(user_id, exam_id, notification_type = 'NEW_EXAM')`. If exists → skip (already notified). Prevents double-sends on failed job retries.

### Step 4 — Build Personalised Email Content
Personalisation fields per user:
- User's name from `user_profiles.display_name`
- Category-specific vacancy count ("OBC Vacancies: 2,847")
- Whether VACANCY_AWARE mode user (show post-wise breakdown if so)
- Application end date formatted clearly: "Apply before 15 March 2026"

### Step 5 — Send via Resend API
```
POST /emails to Resend
from: "ExamTracker <alerts@examtracker.in>"
to: user's email
subject: personalized subject line
html: rendered email template
tags: [{ name: "type", value: "new_exam" }, { name: "exam_id", value: exam_id }]
```

**On 202 Accepted:** Write row to `notification_log` (user_id, exam_id, type, channel=EMAIL, status=SENT, sent_at, resend_email_id)

**On 4xx/5xx error:** BullMQ retries up to 3 times with exponential backoff (1min → 5min → 30min). After 3 failures → dead-letter queue + alert via Slack webhook or email.

---

## Flow B: Deadline Reminders (Scheduled — Cron)

| Time | What the Cron Job Does |
|------|----------------------|
| **9:00 AM IST daily** | Query `application_end = TODAY + 7` → send 7-day reminders. Also `application_end = TODAY + 1` → send 1-day reminders. |
| **6:00 PM IST daily** | Second send for 1-day reminders only (`application_end = TOMORROW`). Re-check `notification_log` to avoid double-sending to users who got 9 AM email. |
| **10:00 AM IST Sundays** | Weekly digest: for each user, query all eligible exams where `is_active = TRUE` and `application_end > TODAY`. Send one email listing all open exams with deadlines. Cap at 10 exams (most urgent first). |

**Cron Implementation:** Use BullMQ's repeatable jobs — `cron: "0 9 * * *"` with `tz: "Asia/Kolkata"` fires at 9 AM IST daily. The job payload is just the trigger date. The worker then fans out individual user emails as child jobs.

---

## Flow C: Weekly Digest (Every Sunday)

One email per user showing all exams currently open that they qualify for.

**Digest Content Structure:**
1. Header: "Your government exam updates — Week of [date]"
2. **CLOSING SOON** (closing within 14 days) — max 3 exams, sorted by urgency
3. **NEWLY OPENED** (notification_date within 7 days) — max 3 exams
4. **ALL OPEN EXAMS** — remaining eligible exams, up to 10 total
5. Footer: unsubscribe link + link to full dashboard

**Unsubscribe Rule:** Every email must have a one-click unsubscribe link (legal requirement + Resend deliverability requirement). Unsubscribe sets `email_notifications_enabled = FALSE`. Use Resend's built-in suppression list to honour unsubscribes automatically.

---

## The `notification_log` Table

Every email sent is recorded. Serves three purposes: deduplication, analytics, and audit trail.

| Column | Type | Example | Purpose |
|--------|------|---------|---------|
| `id` | UUID | gen_random_uuid() | Primary key |
| `user_id` | UUID → users | a1b2c3... | Which user received this |
| `exam_id` | UUID → exams | d4e5f6... (NULL for digests) | Which exam this is about |
| `notification_type` | ENUM | NEW_EXAM / DEADLINE_7D / DEADLINE_1D / DIGEST | Type — used for deduplication |
| `channel` | ENUM | EMAIL / WHATSAPP / PUSH | EMAIL only at MVP |
| `status` | ENUM | SENT / FAILED / BOUNCED | Current delivery status |
| `sent_at` | TIMESTAMPTZ | 2026-03-01 09:00:00+05:30 | When API call was made |
| `resend_email_id` | VARCHAR(100) | re_abc123... | Resend's message ID for webhook tracking |
| `opened_at` | TIMESTAMPTZ | NULL until webhook fires | When user opened email |
| `clicked_at` | TIMESTAMPTZ | NULL until click tracked | When user clicked a link |

**Critical Indexes:**
```sql
CREATE UNIQUE INDEX ON notification_log (user_id, exam_id, notification_type)
  WHERE exam_id IS NOT NULL;  -- prevents duplicate sends
CREATE INDEX ON notification_log (sent_at);
CREATE INDEX ON notification_log (user_id, sent_at DESC);
```

---

## Resend Setup & Configuration

### Initial Setup
1. Create a new API key in Resend, labeled "examtracker-prod"
2. Add and verify domain `examtracker.in` (SPF, DKIM, DMARC records required for deliverability)
3. Set sending addresses: `alerts@examtracker.in` (notifications) and `noreply@examtracker.in` (auth magic links)

### Email Templates (React Email)

| Template File | Used For | Key Variables |
|--------------|---------|---------------|
| `new-exam-alert.tsx` | New Exam Alert | examName, categoryVacancies, applicationEnd, applyUrl, userName, userCategory |
| `deadline-reminder.tsx` | 7-day and 1-day reminders | examName, applicationEnd, daysLeft, applyUrl, userName |
| `weekly-digest.tsx` | Sunday weekly digest | userName, closingSoon[], newlyOpened[], allOpenExams[], totalCount |
| `magic-link.tsx` | Auth magic link | magicLinkUrl, userName, expiresAt |

### Resend Webhooks — Tracking Opens & Clicks

Register webhook endpoint at: `https://examtracker.in/api/webhooks/resend`

| Resend Event | Action |
|-------------|--------|
| `email.delivered` | Update `notification_log` status = DELIVERED |
| `email.opened` | Update `opened_at` timestamp |
| `email.clicked` | Update `clicked_at` timestamp |
| `email.bounced` | Status = BOUNCED. Set `email_notifications_enabled = FALSE`. Flag user to add backup contact. |
| `email.spam_complained` | **CRITICAL:** Status = SPAM_COMPLAINED. Immediately set `email_notifications_enabled = FALSE`. Never email this address again. |

**Deliverability Rule:** Spam complaint rate above 0.1% will get your Resend account flagged. Never send more than 1 notification per day per user per exam. Weekly digest = 1 email/week. If >3 new exams on the same day match a user, batch them into one "X new exams found" email.

---

## User Notification Preferences

Stored as boolean columns on `user_profiles`:

| Preference Column | Default | Controls |
|-----------------|---------|---------|
| `email_notifications_enabled` | TRUE | Master on/off switch — `FALSE` stops ALL emails immediately |
| `notify_new_exam_alerts` | TRUE | New eligible exam alerts |
| `notify_deadline_reminders` | TRUE | 7-day and 1-day deadline reminder emails |
| `notify_weekly_digest` | TRUE | Sunday weekly digest |
| `notify_result_alerts` | TRUE | Exam result declaration notifications |

Accessible from the user's Settings page. The unsubscribe link in every email deep-links directly to this settings page.

---

## V2: WhatsApp & Web Push (Not MVP)

### WhatsApp (V2 — Premium Only)
- Provider: AiSensy (Meta WABA reseller, ₹0.13/utility message)
- Gated behind Premium subscription (₹49/month)
- Message types: Utility only (exam alerts, deadline reminders, admit card notifications) — no marketing messages
- DPDPA 2023 compliance: Explicit WhatsApp consent with timestamp + IP must be recorded before first message
- `notification_log` already has `channel = WHATSAPP` in the ENUM — no schema change needed

### Web Push (V2 — All Users)
- Provider: OneSignal (free up to 10K subscribers)
- Requires user to click "Allow Notifications" (~40–60% opt-in rate)
- Use for real-time new exam alerts — push fires immediately when exam approved
- `notification_log` `channel = PUSH` already in ENUM

**Why Email First:** Email has 100% reach (every registered user has email or phone, phone → auth → email linked). Push requires browser permission (60% opt-in at best). WhatsApp requires Premium + explicit consent. Email is the only channel with guaranteed reach at launch. Get email working perfectly before adding complexity.

---

*ExamTracker India — Notification Architecture v1.0 — February 2026*
