# ExamTracker India — Admin Dashboard Architecture

**Document Type:** Technical Reference
**Version:** 1.0
**Date:** February 2026
**Access Level:** Founder/Admin Only
**Stack:** Next.js /admin/* section of main app, protected by Supabase session middleware

---

## Overview

The admin dashboard is an internal tool — accessible only to the founder (and future data editors with role = "editor"). It has one primary job: **get verified exam data into the database as fast as possible** so users receive accurate notifications.

**Build Order Rule:** Build the admin dashboard BEFORE the scraper and BEFORE the PDF pipeline. Sprint 1 is manually entering 50 exams into this form. This validates the schema, teaches you what fields are easy/hard to find in real PDFs, and gets the product in front of users fast. Automation pre-fills the same form later.

---

## The 5 Dashboard Sections

| Section | Route | Purpose |
|---------|-------|---------|
| Exam Queue | `/admin/queue` | PDF review queue — exams waiting for approval. **Main daily-use screen.** |
| Add / Edit Exam | `/admin/exams/new` and `/admin/exams/[id]` | The data entry form. 8 field groups. Used manually and pre-filled by automation. |
| Exam List | `/admin/exams` | Browse all exam records. Search, filter, bulk actions. |
| Analytics | `/admin/analytics` | User counts, notification stats, exam coverage gaps. |
| Site Health | `/admin/health` | Scraper status per site, last successful scrape, error log. |

---

## Access Control — Admin Only

The entire `/admin/*` route tree is protected by Next.js middleware.

**How admin auth works:**
1. In Supabase, set a custom claim on your user account: `app_metadata.role = "admin"` (done once via Supabase dashboard → Authentication → Users → Edit)
2. Next.js middleware at `middleware.ts` checks every `/admin/*` request — reads JWT, checks `app_metadata.role === "admin"`
3. If not admin → redirect to `/404` (NOT `/login` — never confirm that `/admin` exists to non-admins)
4. Check happens server-side in middleware — admin UI is never rendered for non-admins

**Future data editors:** Set `role = "editor"` (can add/edit exams but cannot delete or access analytics/user data).

---

## Section 1: The Exam Queue

The screen you open every morning. Shows all exam records in DRAFT or NEEDS_REVIEW status, sorted by urgency (`application_end` soonest first).

### Queue Card (per exam)
- Exam name + conducting body + category badge (SSC/UPSC/BANKING/STATE etc.)
- Application end date — color coded: RED <3 days, ORANGE <7 days, GREEN otherwise
- Source: MANUAL or AUTO (AUTO = pipeline pre-filled) + confidence score if AUTO
- Status badge: DRAFT / NEEDS_REVIEW / APPROVED / REJECTED
- Quick action buttons: "Review & Approve" (opens full form) + "Quick Approve" (if confidence > 0.90) + "Reject"
- Link to original PDF — opens in new tab

**Quick Approve:** If pipeline confidence score >0.90 AND `application_end` >7 days away, approve without opening the full form. At MVP (100% manual), this button is hidden — every record goes through the full form.

### Queue Filters
- Filter by status: DRAFT / NEEDS_REVIEW / APPROVED / REJECTED / ALL
- Filter by source: MANUAL / AUTO
- Filter by category: SSC / UPSC / BANKING / RAILWAY / STATE / PSU / DEFENCE
- Filter by urgency: closing in 7 / 14 / 30 days
- Sort by: `application_end` (default), `created_at`, `confidence_score`

---

## Section 2: The Add / Edit Exam Form

**The most important UI in the entire dashboard.** Used in two modes:
- **Manual entry** — fill everything from scratch reading the PDF
- **Auto-review** — pipeline pre-fills most fields; verify and approve

The form is divided into 8 field groups matching the database schema exactly. When automation pre-fills a field, it shows the confidence score and source snippet alongside the value.

### 8 Field Groups

| # | Group Name | Fields | Key Notes |
|---|-----------|--------|-----------|
| 1 | Core Identity | Exam name, short name, conducting body, category, level, state code | Always required. Usually in PDF title/header. |
| 2 | Key Dates | Notification date, application start, **application end ⚡**, exam date, admit card date, result date, age cutoff date | `application_end` is the most critical field — highlighted red if missing. DD/MM/YYYY format (how Indian PDFs show dates). |
| 3 | Vacancy Data | Total vacancies, `vacancies_by_category` JSONB (UR/OBC/SC/ST/EWS/PwBD/ESM) | Mini-spreadsheet: 7 columns. If only total known, leave category table empty. |
| 4 | Age Eligibility | Min age, max age per category (General/OBC/SC_ST/EWS/PwBD/Ex-Serviceman), age cutoff date | 7 separate fields — **always enter exact number from the PDF, never auto-compute** |
| 5 | Education | Required qualification (dropdown → ENUM), streams (multi-select), min marks %, allows final year, additional qualifications | Qualification must map to ENUM exactly. Streams critical for engineering exams. |
| 6 | Other Eligibility | Nationality, gender restriction (blank = no restriction), physical requirements (JSONB), marital status, domicile toggle | Physical requirements only for Defence/Police. Most exams: leave blank. |
| 7 | Application Fees | Fee for General, SC/ST, PwBD, Women — separate fields. Payment modes (checkboxes). | "Standard GOI fees" quick-fill button auto-fills ₹100/₹0/₹0/₹100. |
| 8 | Source & Verification | Official notification URL, data source (MANUAL/AUTO), notes field | URL already filled from scraper or pasted. Notes for unusual notification details. |

### Auto-fill Field Display (When Pipeline Pre-fills)
Each pre-filled field shows:
- Confidence score (green/orange/red dot)
- Extraction method (REGEX / HAIKU / INFERRED)
- Collapsible "Source snippet" — the exact text from the PDF

### Form Validation Rules
- `application_end` is required — form cannot submit without it
- `max_age_obc` must be ≥ `max_age_general` (warn if not)
- `exam_date` must be after `application_end` (warn if before)
- `total_vacancies` must be positive integer
- `vacancies_by_category` values must sum to ≤ `total_vacancies`
- `official_notification_url` must be a valid URL

### Form Submission Actions
- **"Save as Draft"** — saves without triggering any notifications (for incomplete records)
- **"Approve & Notify"** — sets `notification_verified = TRUE`, `is_active = TRUE`, immediately triggers `new_exam_notification` BullMQ job. Users get emails within 2 hours.
- **"Approve without Notify"** — sets verified but does NOT trigger notification job (use when correcting an already-live exam)
- **"Reject"** — sets status = REJECTED with rejection reason. Rejected records archived, never shown to users.

---

## Section 3: Exam List

A searchable table of all exam records. Used to find and edit existing records.

**Table columns:** Exam name (clickable → edit form), category badge + level, `application_end` + days remaining, status, vacancies (total + breakdown indicator), data source + confidence score, Actions: Edit | Duplicate | Archive

**DUPLICATE FEATURE:** Creates a DRAFT copy of an existing exam with all fields pre-filled. Critical for annual exams — SSC CGL 2026 is 90% identical to SSC CGL 2025. Duplicate, update dates and vacancies, approve. Saves ~5 minutes per recurring exam.

---

## Section 4: Analytics

Read-only dashboard, updated every hour. Pulls directly from PostgreSQL — no external analytics tool needed at MVP.

| Metric | Source Query | Why It Matters |
|--------|-------------|----------------|
| Total registered users | `COUNT(*) FROM users WHERE is_deleted = FALSE` | Signup growth |
| Users who completed onboarding | `COUNT(*) WHERE onboarding_completed = TRUE` | Onboarding completion rate |
| Daily active users (last 7d) | `COUNT(DISTINCT user_id) FROM user_sessions WHERE created_at > NOW()-7d` | Product engagement |
| Total active exams in DB | `COUNT(*) WHERE is_active = TRUE AND notification_verified = TRUE` | Data coverage |
| Exams closing in next 7 days | `COUNT(*) WHERE application_end BETWEEN TODAY AND TODAY+7` | Are critical deadlines covered? |
| Emails sent today | `COUNT(*) FROM notification_log WHERE sent_at::date = TODAY` | Notification system health |
| Email open rate (7d) | `opened_at IS NOT NULL / total sent` | Deliverability and engagement |
| Notification failures (24h) | `COUNT(*) WHERE status = 'FAILED'` | Pipeline health |

---

## Section 5: Site Health

Shows scraping status for each of the 142 monitored sites. Early warning system for when a government site changes layout and breaks a scraper.

### Per-Site Status Table

| Column | Example | Alert If |
|--------|---------|---------|
| Last scraped | "2 hours ago" | > scrape_interval_hrs × 2 |
| Last new PDF found | "3 days ago" | > 30 days (possible gap) |
| Status | OK / ERROR / BLOCKED | ERROR or BLOCKED |
| Error message | "HTTP 403 Forbidden" | Any non-null error |
| Success rate (7d) | 94% | < 80% |

**Alert Rule:** If any P0 or P1 site has status = ERROR for >2 consecutive scrape cycles, send yourself an email immediately. P0 sites (SSC, UPSC, IBPS, SBI, RRB) must never go unmonitored for more than 4 hours.

---

## Technical Implementation

- Built as `/admin/*` section of the main Next.js 14 app — not a separate service
- Protected by Next.js middleware checking Supabase session role
- UI: shadcn/ui + Tailwind (already in main app stack)
- Data: All queries via Supabase JS client or server-side fetch with `service_role` key
- No separate admin database — reads and writes to the same PostgreSQL database

### New `scraper_log` Table (for Site Health)
```sql
CREATE TABLE scraper_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id VARCHAR(100) NOT NULL,    -- matches id in sites_final.json
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) NOT NULL,        -- OK | ERROR | BLOCKED | NO_NEW
  new_urls_found INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER
);
```

---

## Build Order Within the Dashboard

Build in this exact order — each step is usable before the next is built:

| Order | What to Build | When It's "Done Enough to Use" |
|-------|--------------|-------------------------------|
| 1st | Auth middleware | `/admin/*` is protected. You can reach it. Others cannot. |
| 2nd | Add Exam form (Groups 1–3) | Can manually enter exam name, dates, and total vacancies. Enough for first 10 records. |
| 3rd | Add Exam form (Groups 4–8) | Full form complete. Can enter all eligibility data. Start adding 50 central exams. |
| 4th | Exam List + basic search | Can find and edit existing records. Annual exam duplication becomes fast. |
| 5th | Queue view | Build when scraper and PDF pipeline start sending records. |
| 6th | Analytics | Build when you have real users (week 1 priority is exam data, not analytics). |
| 7th | Site Health | Build when scraper is live. No point before. |

**THE SINGLE MOST IMPORTANT THING:** Before writing any scraper, pipeline, or notification code — build the Add Exam form (steps 1–3) and manually enter 5 real exam records. Trigger a notification for a test user. Verify the email arrives, eligibility matching works, and data looks right in the dashboard. This end-to-end validation in week 1 will catch schema problems before you have 1,000 scraped records in the wrong format.

---

*ExamTracker India — Admin Dashboard Architecture v1.0 — February 2026*
