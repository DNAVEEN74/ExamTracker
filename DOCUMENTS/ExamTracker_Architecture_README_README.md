# ExamTracker India — Complete Architecture & Engineering Bible

**Document Type:** Pre-Development Technical Reference
**Version:** 1.0
**Date:** February 2026
**Status:** Approved — Use before writing any code

---

## Overview

This is the definitive engineering reference for ExamTracker India — a personal eligibility intelligence system for Indian government job aspirants. Unlike a job notification website (which tells you what vacancies exist), ExamTracker tells users which vacancies they can actually apply to and when they will lose their chance forever.

**Inspiration:** Razorpay's onboarding — collects what it needs, shows value as it collects, and adapts in real time. Designed for an aspirant from Patna on a ₹8,000 Android phone on a slow 4G connection.

---

## Contents

1. [Product Philosophy & Core Principles](#1-product-philosophy)
2. [The Eligibility Engine — Six Pillars](#2-eligibility-engine)
3. [Onboarding Architecture](#3-onboarding-architecture)
4. [Mode Selection](#4-mode-selection)
5. [Screen-by-Screen Onboarding Design](#5-screen-designs)
6. [Database Schema](#6-database-schema)
7. [Database Choice & Storage Architecture](#7-database)
8. [Exam Data Schema](#8-exam-schema)
9. [Eligibility Matching Logic](#9-eligibility-matching)
10. [Complete Tech Stack](#10-tech-stack)
11. [Development Phases](#11-development-phases)
12. [Key Engineering Decisions Log](#12-engineering-decisions)

---

## 1. Product Philosophy

**Core Design Principles:**

| Principle | Implementation |
|-----------|----------------|
| Maximum 5 taps to value | User reaches personalized exam list within 5 taps of landing |
| No government jargon | "Are you from SC/ST/OBC?" not "Select your reservation category" |
| Show, don't tell | When user selects OBC, instantly show: "OBC gets +3 years age relaxation" |
| Progressive disclosure | Don't ask everything upfront; collect deeper data as trust builds |
| Mobile-first always | 80%+ users on Android budget phones. No heavy animations |
| Hindi-ready architecture | Translation strings file from Day 1, even if Hindi UI ships in v2 |

---

## 2. The Eligibility Engine — Six Pillars

Eligibility for government jobs in India is determined across **six pillars**. This section must be understood before designing any screen.

### Pillar 1: Age
Age is computed dynamically from Date of Birth against each exam's specific cutoff date. Never store age as a number. Age relaxations are encoded in the Rules Engine:

| Category | Relaxation | Cumulative? |
|----------|-----------|-------------|
| General | None (baseline) | — |
| OBC-NCL | +3 years | Stacks with PwBD |
| SC/ST | +5 years | Stacks with PwBD |
| EWS | Usually none | Check per notification |
| PwBD-General | +10 years | Horizontal |
| PwBD-OBC | +13 years (10+3) | Cumulative |
| Ex-Servicemen | Military service years + 3 | Subject to per-exam rules |

### Pillar 2: Category / Reservation Status
**CRITICAL:** `OBC_NCL` and `OBC_CL` must be stored as separate ENUM values. Creamy Layer OBC candidates (income > ₹8 lakh/year) compete as General category. Conflating these creates eligibility bugs.

Vertical categories: General/UR, OBC-NCL (27% seats), OBC-CL, SC (15%), ST (7.5%), EWS (10%)
Horizontal categories: PwBD (4% total across types), Ex-Servicemen (3–10%), NCC, Sports Quota

### Pillar 3: Educational Qualification
Qualifications have five dimensions: level, stream/discipline, marks percentage, institution recognition, and "appearing" status. Marks percentage matters for: RBI Grade B (60%), NABARD (60%), SBI PO (60%).

### Pillar 4: Nationality & Domicile
Store `domicile_state` and `exam_states` as **separate fields** — a Bihar student studying in Delhi has Bihar domicile but may want Delhi Police notifications. Conflating these misses valid opportunities.

### Pillar 5: Physical Standards
Applies to Police, Paramilitary, Defence exams. Store `height_cm` (nullable), `has_vision_correction`.

### Pillar 6: Special Criteria
PwBD status and type, Ex-Serviceman status and years, marital status, government employment status, sports achievement level.

---

## 3. Onboarding Architecture

**The "Earn the Data" Principle:** Never dump a 20-field form. Earn each piece of data by:
- Explaining why we need it as we ask
- Showing immediate value the moment they give it
- Asking only what's needed now

**Complete Onboarding Flow (7–9 screens depending on answers):**
```
Landing → Screen 0: Phone OTP
       → Screen 1: Display Name
       → Screen 2: Mode Selection (FOCUSED / DISCOVERY / VACANCY-AWARE)
       → Screen 3: Date of Birth → INSTANT wow moment ("You qualify for 54 exams!")
       → Screen 4: Category → INSTANT benefits shown per selection
       → Screen 5: Education → INSTANT eligibility preview update
       → Screen 6: State & Domicile
       → Screen 7: Exam Interest Categories
       → Screen 8: Special Criteria (Dynamic — only relevant blocks shown)
       → Screen 9: Notification Preferences
       → PERSONALIZED DASHBOARD REVEAL
```

---

## 4. Mode Selection

| Mode | User Says | Target User | Dashboard Behavior |
|------|-----------|-------------|-------------------|
| 🎯 FOCUSED | "I'm only preparing for SSC CGL" | Repeat aspirants, working professionals | Defaults to tracked exams only |
| 🔍 DISCOVERY | "Show me all exams I'm eligible for" | Fresh graduates | Defaults to "Browse Eligible Exams" |
| ✅ VACANCY-AWARE | "Only where MY category has seats" | OBC/SC/ST/EWS users | Shows vacancy counts front and center |
| 💎 COMPREHENSIVE (Premium) | "Track everything" | Power users | DISCOVERY + VACANCY-AWARE + WhatsApp |

**VACANCY-AWARE MODE is the killer differentiator.** No other platform shows aspirants how many seats are allocated for their specific category. An OBC user knowing there are 0 OBC vacancies will not waste ₹500 in application fees.

---

## 5. Screen Designs (Summary)

| Screen | Key Interaction | Data Stored |
|--------|----------------|-------------|
| Screen 0 | Phone OTP (MSG91/Twilio) | `phone`, `phone_verified` |
| Screen 1 | First name input | `display_name` |
| Screen 2 | 3-card mode selection | `onboarding_mode` |
| Screen 3 | Scrollable date picker → instant eligibility count | `date_of_birth` |
| Screen 4 | 6-tile category selector → instant benefit display | `category` |
| Screen 5 | Tile grid for qualification → live preview update | `highest_qualification`, `qualification_stream` |
| Screen 6 | Two separate state selectors | `domicile_state`, `exam_states[]` |
| Screen 7 | Icon tile multi-select | `exam_categories[]` |
| Screen 8 | Dynamic blocks (PwBD / ESM / Physical / Additional quals) | Multiple fields |
| Screen 9 | Email free / WhatsApp Premium upsell | Notification preferences |

---

## 6. Database Schema

### `users` table (key columns)
```sql
id UUID PRIMARY KEY
phone VARCHAR(15) UNIQUE          -- +91XXXXXXXXXX
display_name VARCHAR(50) NOT NULL
onboarding_mode onboarding_mode_enum DEFAULT 'DISCOVERY'
subscription_tier subscription_tier_enum DEFAULT 'FREE'
razorpay_customer_id VARCHAR(100)
```

### `user_profiles` table (key columns)
```sql
user_id UUID REFERENCES users(id)
date_of_birth DATE NOT NULL          -- NEVER store age as a number
category category_enum NOT NULL      -- GENERAL|OBC_NCL|OBC_CL|SC|ST|EWS
highest_qualification qualification_level_enum NOT NULL
qualification_stream VARCHAR(100)
domicile_state state_code_enum NOT NULL
exam_states state_code_enum[]       -- array, user may track multiple states
gender gender_enum NOT NULL
is_pwd BOOLEAN DEFAULT FALSE
is_ex_serviceman BOOLEAN DEFAULT FALSE
exam_categories exam_category_enum[]
```

---

## 7. Database Choice

**Primary:** PostgreSQL via Supabase (Mumbai Region — sub-50ms for Indian users)

| Requirement | Why PostgreSQL |
|-------------|----------------|
| Complex eligibility queries | SQL WHERE joining age + category + education + state |
| Multi-value fields | Native array columns for `exam_states`, `exam_categories` |
| Security | Supabase Row-Level Security — users only read/write own data |
| Full-text search | `pg_trgm` extension — no Algolia needed at MVP |

**Additional storage:** Redis (Upstash) for session rate limiting; Supabase Storage (S3) for exam PDFs.

---

## 8. Exam Data Schema (Key Fields)

```sql
slug VARCHAR(200) UNIQUE        -- 'ssc-cgl-2025'
application_end DATE NOT NULL   -- PRIMARY ALERT TRIGGER
vacancies_by_category JSONB     -- {"general": 1200, "obc": 847, "sc": 423, ...}
max_age_general SMALLINT        -- Stored EXPLICITLY, not computed
max_age_obc SMALLINT            -- (Government sometimes uses non-standard relaxations)
max_age_sc_st SMALLINT
required_qualification qualification_level_enum NOT NULL
required_streams TEXT[]         -- NULL = any stream
official_notification_url TEXT NOT NULL
notification_verified BOOLEAN DEFAULT FALSE
```

---

## 9. Eligibility Matching Logic

**Four-level result flags (never binary):**

| Flag | Meaning | UI Treatment |
|------|---------|--------------|
| ✅ ELIGIBLE | All criteria definitively met | Green badge on dashboard |
| ⚡ LIKELY_ELIGIBLE | Core criteria met; optional fields unverified | Amber + "Complete profile to confirm" |
| ⚠️ CHECK_REQUIRED | One or more criteria couldn't be determined | Orange + specific field prompt |
| 🚫 INELIGIBLE | Hard criteria not met | Hidden from main dashboard |

**Core checks (in order of strictness):**
1. Application window still open (`application_end >= TODAY`)
2. Age within range for user's category on the exam's cutoff date
3. Educational qualification level adequate
4. Stream/discipline matches required streams
5. Marks percentage adequate (if required)
6. Nationality matches
7. Gender restriction matches
8. State restriction matches
9. VACANCY_AWARE mode: category vacancies > 0

---

## 10. Complete Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | Next.js 14 (App Router) | SSR for SEO + CSR for dashboard |
| UI | shadcn/ui + Tailwind CSS | Fast, accessible, production-ready |
| State | Zustand | Lightweight; persists onboarding progress |
| Database | PostgreSQL via Supabase | Managed Postgres + Auth + RLS |
| Auth | Supabase Auth | Phone OTP (Twilio) + Google OAuth |
| OTP SMS | Twilio + MSG91 fallback | Dual-provider prevents SMS failures |
| Cache / Rate Limiting | Upstash Redis | Serverless; free tier |
| WhatsApp | Meta WABA via AiSensy | Indian reseller; cheaper setup |
| Email | AWS SES | ₹0.007/email; 99.9% deliverability |
| Push Notifications | OneSignal | Free up to 10K subscribers |
| Payments | Razorpay | Indian gateway; UPI, cards, subscriptions |
| Search | PostgreSQL pg_trgm | Avoids Algolia at MVP |
| Hosting | Vercel | Auto-scaling; optimal Next.js deployment |
| Background Jobs | BullMQ on Railway.app | Scraping queue, notification delivery |
| Analytics | PostHog (self-hosted) | Full funnel visibility; free |

---

## 11. Development Phases

| Phase | Timeline | Key Deliverables | Milestone |
|-------|----------|-----------------|-----------|
| 0: Setup | Week 0 | Supabase, Vercel, Razorpay test, DB migrations | Dev environment ready |
| 1: Auth + Onboarding | Weeks 1–3 | Phone OTP, 9 onboarding screens, basic eligibility query | User can register and see exam list |
| 2: Exam DB + Dashboard | Weeks 4–6 | 50 central exams, full eligibility matching, email digest | Core product loop complete |
| 3: Payments + Premium | Weeks 7–8 | Razorpay subscription, WhatsApp with DPDPA consent | First paying user |
| 4: Growth Features | Weeks 9–12 | SEO exam pages, referral, Hindi interface, State PSC coverage | SEO traffic begins |

---

## 12. Key Engineering Decisions

| Decision | Rationale |
|----------|-----------|
| Explicit age limit columns per category (not computed) | Government sometimes uses non-standard relaxations; explicit prevents bugs |
| JSONB for `vacancies_by_category` | Always queried as a whole; GIN indexing; stable 8–10 key structure |
| Separate `domicile_state` and `exam_states` | A Bihar student in Delhi has Bihar domicile but wants Delhi Police notifications |
| `OBC_NCL` and `OBC_CL` as separate ENUMs | Creamy Layer competes as General; a boolean flag risks applying wrong relaxation |
| No mobile app in MVP | PWA covers 80%+ of users; React Native doubles dev effort; re-evaluate at 10K MAU |
| `application_end` as primary alert trigger | Exam date is months away; missing the application window is the irreversible event |
| WhatsApp consent with timestamp + IP | DPDPA 2023 legal requirement — verifiable audit trail |
| Four-level eligibility flag (not binary) | "LIKELY_ELIGIBLE — complete profile to confirm" is honest and incentivizes profile completion |

---

*Internal document — For ExamTracker India engineering team use only.*
