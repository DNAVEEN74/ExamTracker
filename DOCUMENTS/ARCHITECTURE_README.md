# ExamTracker India — Complete Architecture & Engineering Bible
### Version 1.0 | February 2026 | Pre-Development Reference Document

---

> **Purpose of this document:** This is the single source of truth before a single line of code is written. Every architectural decision — user schema, onboarding flow, database choice, data modeling — is settled here. No ambiguity mid-development.

---

## Table of Contents

1. [Product Philosophy & North Star](#1-product-philosophy--north-star)
2. [The Eligibility Engine — What Data Do We Need From a User?](#2-the-eligibility-engine--what-data-do-we-need-from-a-user)
3. [Onboarding Architecture — The Full Flow](#3-onboarding-architecture--the-full-flow)
4. [Onboarding Mode Selection — Customized Experience](#4-onboarding-mode-selection--customized-experience)
5. [Screen-by-Screen Onboarding Design](#5-screen-by-screen-onboarding-design)
6. [User Schema — Complete Database Design](#6-user-schema--complete-database-design)
7. [Database Choice & Rationale](#7-database-choice--rationale)
8. [Exam Data Schema](#8-exam-data-schema)
9. [Eligibility Matching Logic](#9-eligibility-matching-logic)
10. [Notification Preferences Schema](#10-notification-preferences-schema)
11. [Auth Architecture](#11-auth-architecture)
12. [API Design Principles](#12-api-design-principles)
13. [Frontend Architecture](#13-frontend-architecture)
14. [Tech Stack Summary](#14-tech-stack-summary)
15. [Development Phases](#15-development-phases)
16. [Key Engineering Decisions Log](#16-key-engineering-decisions-log)

---

## 1. Product Philosophy & North Star

### What We Are Building

**ExamTracker** is not a job notification website. It is a **personal eligibility intelligence system** for Indian government job aspirants. The difference is everything:

- A notification website tells you *what vacancies exist*
- ExamTracker tells you *which of those vacancies you can actually apply to, and when you'll lose your chance*

### The Razorpay Onboarding Inspiration

Razorpay's onboarding is legendary because it achieves three things simultaneously:
1. **Collects what it needs** — without feeling like a form
2. **Shows value as it collects** — each step reveals something useful
3. **Feels personal from step one** — it adapts to your answers

We must achieve the same for an aspirant from Patna on a ₹8,000 Android phone on a slow 4G connection. Every screen must feel like a smart friend asking the right question — not a government form.

### Design Principles for Onboarding
- Maximum **5 taps** to reach the personalized dashboard
- **No jargon** — say "Are you from SC/ST/OBC?" not "Select your reservation category"  
- **Show, don't tell** — when a user selects OBC, instantly show them "OBC gets +3 years age relaxation for most central exams"
- **Progressive disclosure** — don't ask for everything upfront; collect deeper data as trust builds
- **Mobile-first** — 80%+ users are on Android, often budget devices. No heavy animations, no huge images
- **Hindi-ready architecture** — even if Hindi UI ships in v2, the onboarding copy strings must be in a translation file from day one

---

## 2. The Eligibility Engine — What Data Do We Need From a User?

This is the most important section in this document. Before designing screens, we must understand *every single variable* that determines whether a person can apply to a government job in India.

### 2A. The Six Pillars of Government Job Eligibility

Every government exam notification in India determines eligibility across these six dimensions:

---

#### PILLAR 1: Age

**Why it's complex:** Age limits vary not just by exam, but by post within the same exam. Age relaxation varies by category, state, and special quotas.

**What we must store:**
- Date of Birth (exact — not just year)
- This is used to compute *current age* and *age on specific cutoff dates* per notification

**Age relaxation rules we must encode in the system (not per user, but in our rules engine):**
- General category: No relaxation (baseline)
- OBC (Non-Creamy Layer): +3 years on upper age limit
- SC/ST: +5 years on upper age limit  
- PwBD (Persons with Benchmark Disability): +10 years (General), +13 years (OBC), +15 years (SC/ST)
- Ex-Servicemen: Total military service + 3 years, subject to per-exam rules
- State government employees: +5 years (varies by state)
- Widows/divorced women (for some exams): +5 to +9 years
- J&K domicile (1980–89 period candidates): +5 years for some central exams
- Defence personnel (border conflict veterans): +3 to +5 years

**User input needed:** Just Date of Birth. The rest is computed from category.

---

#### PILLAR 2: Category / Reservation Status

**Why it's complex:** This is a multi-layered system. A single person may belong to multiple overlapping categories. Combinations create unique eligibility rules.

**Primary categories (vertical reservation):**

| Category | Central Govt Quota | Key Rules |
|---|---|---|
| General / UR (Unreserved) | No reservation | Competes on open merit |
| OBC-NCL (Non-Creamy Layer) | 27% | Must have current year NCL certificate; "Creamy Layer" OBCs compete as General |
| SC (Scheduled Caste) | 15% | Caste must be in Central List for the relevant state |
| ST (Scheduled Tribe) | 7.5% | Tribe must be in Central List for the relevant state |
| EWS (Economically Weaker Section) | 10% | Only for General category; annual income < ₹8 lakh; asset limits |

**Horizontal categories (cut across all vertical categories):**

| Category | Quota | Notes |
|---|---|---|
| PwBD — Locomotor Disability | 1% of 4% PwBD quota | Requires government disability certificate with ≥40% disability |
| PwBD — Visual Impairment | 1% of 4% | Same certificate requirement |
| PwBD — Hearing Impairment | 1% of 4% | Same |
| PwBD — Others (including intellectual disability) | 1% of 4% | Post-specific; not all posts open |
| Ex-Servicemen | 3–10% depending on exam | Military discharge required; special age calculation |
| Women (some state exams) | Horizontal; varies by state | Tamil Nadu, Maharashtra, UP have women-specific sub-quotas |
| Sports Quota | Varies | National/state-level sports representation required |
| NCC (National Cadet Corps) | Some central exams | NCC C certificate holders get preference/relaxation |
| Freedom Fighter Descendants | Some exams | Grandfather/grandmother who was a freedom fighter |

**What we must store from user:**
- Primary category (General/OBC/SC/ST/EWS)
- If OBC: Sub-category (NCL or Creamy Layer — Creamy Layer = treated as General)
- PwBD status (Yes/No) → If yes: disability type and percentage
- Ex-Serviceman status (Yes/No) → If yes: years of service
- Additional claims: Sports quota, NCC, Women-specific (for applicable exams)

---

#### PILLAR 3: Educational Qualification

**Why it's complex:** Qualifications have multiple dimensions — level, stream/discipline, marks percentage, recognized institution, and "appearing" (final year) status.

**Qualification levels in ascending order:**
1. 10th Pass (Matriculation/SSC Board)
2. 12th Pass (Higher Secondary/Intermediate)
3. ITI Certificate (trade-specific; must be NCVT-affiliated)
4. Diploma (3-year polytechnic; engineering or non-engineering)
5. Graduation — General (BA, B.Sc, B.Com, BBA — any recognized university)
6. Graduation — Engineering (B.E./B.Tech — AICTE-approved institution)
7. Graduation — Law (LLB — Bar Council recognized)
8. Graduation — Medicine (MBBS — MCI/NMC recognized)
9. Graduation — Agriculture (B.Sc Agriculture)
10. Graduation — Education (B.Ed — NCTE recognized)
11. Post-Graduation (MA, M.Sc, M.Com, MBA, M.Tech)
12. Doctorate (Ph.D)
13. CA/ICAI/ICWA (professional certifications)
14. CS (Company Secretary)

**Stream/discipline matters for:**
- SSC JE: Civil/Electrical/Mechanical engineering only
- RRB ALP: ITI trade must match the specific trade applied for
- UPSC IES: Engineering disciplines only (Civil, Mechanical, Electrical, Electronics & Telecom)
- CTET: B.Ed for secondary; D.El.Ed or equivalent for primary
- RBI Grade B: Post-graduate with minimum 60%

**Marks percentage matters for:**
- RBI Grade B: 60% in graduation (55% for SC/ST)
- NABARD Grade A: 60% in graduation
- SBI PO: 60% aggregate (55% for SC/ST/PwBD)
- Most central exams: No minimum percentage for basic graduation level

**"Appearing" (final year) status:**
- Many exams allow final-year graduation students to apply provisionally
- Must submit proof of passing before joining
- We track this as a separate boolean with expected completion date

**What we must store from user:**
- Highest completed qualification (from the levels above)
- Stream/discipline (if engineering/ITI/professional course)
- Marks percentage in highest qualification
- Whether currently in final year of next qualification (yes/no → expected completion date)
- Any additional professional certifications (CA, CS, ICWA, B.Ed, LLB, MBBS)
- Institution type (recognized/not-recognized — most users won't know; default to "recognized")

---

#### PILLAR 4: Nationality & Domicile

**Why it matters:** Most central exams require Indian citizenship. State exams additionally require domicile of that specific state.

**Nationality types (from actual government notifications):**
- Indian Citizen (covers ~99.9% of users — default)
- Nepal/Bhutan citizen (eligible for some central exams with eligibility certificate)
- Person of Indian Origin (PIO) — migrated from specific countries
- OCI (Overseas Citizen of India) — NOT eligible for most government jobs

**Domicile/State Residence matters for:**
- ALL state-level PSC exams (must be domicile of that state)
- Some state-level police exams (must be local resident)
- Some central exams have state-wise quotas (RRB exams have regional recruitment boards — you apply to your zone)
- Language requirement (some state exams need proficiency in state language)

**What we must store from user:**
- Nationality status (Indian Citizen default; flag if other)
- Current state of residence (from dropdown of all 28 states + 8 UTs)
- Home state / domicile state (may differ from current residence for students)
- States of interest for exam (multi-select — "I'm from UP but will also apply for Maharashtra state exams")
- Language proficiency for state exams (Hindi, English, + regional languages)

---

#### PILLAR 5: Physical Standards (For Specific Exams)

**These apply to:** Police exams (Constable, SI, Inspector), Paramilitary (CRPF, BSF, CISF, ITBP, SSB), Indian Army, Navy, Air Force, Coast Guard, RPF/RPSF (Railway Protection), Fire Service

**Parameters that matter:**
- Height (in cm) — varies by state, gender, and category
- Chest (for male candidates in many police/defence exams)
- Weight (BMI-range based for some exams)
- Visual acuity (6/6, 6/9 etc. — corrected and uncorrected vision)
- Color blindness (disqualifying for many posts)
- Hearing ability
- Overall medical fitness

**Gender is embedded here too:**
- Height requirements differ significantly by gender
- Some posts are only for male candidates (certain Army roles, many Police SI roles historically — though this is changing)
- Some police forces have women-only constable vacancies
- NDA was male-only until Supreme Court order in 2021; now open to all

**What we must store from user:**
- Gender (Male/Female/Third Gender)
- Height (in cm) — optional; only asked if user marks interest in defence/police exams
- Whether they have any physical disability (ties to PwBD in Pillar 2)
- Visual correction status (wearing glasses/contacts → relevant for pilot/air traffic controller posts)

---

#### PILLAR 6: Other Special Criteria

**These are less common but create important edge cases:**

| Criterion | Applies To | What We Store |
|---|---|---|
| Marital Status | Some exams (NDA requires unmarried; some state exams have relaxations for married women) | Marital status (Married/Unmarried/Divorced/Widowed) |
| Number of children | Some state exams bar candidates with more than 2 children | Number of dependent children |
| Government employment status | Many PSU exams require NOC from current employer; serving employees may have relaxations | Current employment status (Private/Government/Unemployed/Self-employed) |
| Ex-government employee | Some exams bar retired government employees above a certain age/pension | Flag: previously in government service |
| Criminal record | Active court cases may disqualify; convictions definitely disqualify | We do NOT collect this — legal risk; flag it in application checklist instead |
| Departmental/Internal exams | Some central exams like SSC Stenographer have posts only for existing government employees | Flag: currently a Central/State Government employee |

---

### 2B. The Eligibility Checklist Summary (All Data Points)

Here is every field we need to determine eligibility, organized by priority:

**MUST HAVE (core eligibility for 90%+ of exams):**
- Date of Birth
- Category (General/OBC-NCL/OBC-CL/SC/ST/EWS)
- Highest educational qualification
- Stream/discipline of qualification
- Current state of residence
- Home/domicile state
- Gender
- Nationality (default: Indian; flag if otherwise)

**SHOULD HAVE (needed for significant exam subsets):**
- Marks percentage in highest qualification
- Currently in final year? (yes/no + expected completion)
- PwBD status + type + percentage
- Ex-Serviceman status + years of service
- States interested in applying for (multi-select)
- Preferred exam categories (SSC/Railway/Banking/UPSC/Defence/State PSC/Teaching)
- Currently employed? (yes/no; if yes: private/government)

**NICE TO HAVE (deeper personalization, collected progressively):**
- Additional qualifications (B.Ed, LLB, CA, CS, ICWA, B.Tech, etc.)
- Height (for defence/police exams only)
- Sports achievement level (national/state/district)
- NCC certificate (A/B/C)
- Language proficiency beyond Hindi/English
- Number of previous exam attempts (for exams with attempt limits like UPSC)

---

## 3. Onboarding Architecture — The Full Flow

### The Strategic Philosophy: "Earn the Data"

We do not dump a 20-field form on the user. We earn each piece of data by:
1. Explaining *why* we need it as we ask for it
2. Showing *immediate value* the moment they give it
3. Asking *only what's needed now*; defer the rest

### Flow Architecture Overview

```
LANDING PAGE
     │
     ▼
STEP 0: Phone/Email + OTP
     │
     ▼
STEP 1: "What's your name?" (Personal touch)
     │
     ▼
STEP 2: Mode Selection ("What kind of help do you want?")
     │         │           │
     ▼         ▼           ▼
 FOCUS      WIDE        SMART
 MODE       MODE        MODE
 (2-3       (All        (AI guides
 exams)     exams)      you)
     │         │           │
     └────┬────┘           │
          ▼                ▼
STEP 3: Date of Birth
          │
          ▼
STEP 4: Category
          │
          ▼
STEP 5: Education
          │
          ▼
STEP 6: State & Domicile
          │
          ▼
STEP 7: Exam Interests (multi-select tiles)
          │
          ▼
STEP 8: Special Criteria (PwBD/Ex-Serviceman/Gender) ← SMART CONDITIONAL
          │
          ▼
STEP 9: Notification Preferences
          │
          ▼
PERSONALIZED DASHBOARD ← Show matches IMMEDIATELY
```

### Total Steps: 9 screens (users see 7–9 depending on their answers)

---

## 4. Onboarding Mode Selection — Customized Experience

This is the Razorpay-level insight: **different users want different things from this product.** Before we ask eligibility details, we ask what they're *trying to achieve.*

### Mode 1: FOCUS MODE — "I know what I'm preparing for"

**User says:** "I'm only preparing for UPSC / SSC CGL / IBPS PO"

**What changes:**
- Eligibility questions are pre-filtered to only what matters for their chosen exams
- Dashboard defaults to showing only their tracked exams
- Notifications are tightly targeted — no noise
- Onboarding is shorter (we skip irrelevant fields)
- Example: A UPSC aspirant doesn't need height; an SSC CGL aspirant doesn't need B.Ed status

**Shown to:** Repeat aspirants, working professionals, focused students

---

### Mode 2: DISCOVERY MODE — "Show me all exams I qualify for"

**User says:** "I'm not sure which exams to focus on — show me everything I'm eligible for"

**What changes:**
- Full eligibility questionnaire
- Dashboard defaults to "Browse eligible exams" view first
- First impression is a list of ALL exams they qualify for right now
- Notifications are broader — new eligible exams are the priority alert
- Exam recommendations ranked by "application window closing soon"

**Shown to:** Fresh graduates, early-stage aspirants, career-changers

---

### Mode 3: VACANCY-AWARE MODE — "Only show me exams WITH vacancies for my category"

**This is a critical, underserved use case.** In government notifications, total vacancies are broken down by category. A post might have 200 total vacancies but only 15 for OBC from a specific state. An aspirant may be eligible on paper but if there are 0 vacancies for their specific sub-category, applying is pointless.

**User says:** "I want to see exams where my category (OBC/SC/ST) actually has vacancies"

**What this mode does differently:**
- When displaying eligible exams, also checks: "Are there vacancies allocated for the user's specific category?"
- Shows a "Vacancy Count for You" badge: e.g., "43 OBC vacancies in this exam"
- Filters out exams where the user's category has 0 allocated seats
- Alerts when vacancy count for their category in a specific exam changes
- This requires vacancy-level data per category in our exam database — a significant data modeling requirement

**Shown to:** OBC/SC/ST/EWS users who have learned that raw eligibility ≠ practical opportunity

---

### Mode 4: COMPREHENSIVE MODE (Premium-only after launch)

**"Track everything — every eligible exam, every deadline, every vacancy for my category"**

This is effectively Mode 2 + Mode 3 combined, with WhatsApp alerts. This becomes the premium upsell moment — after using Discovery Mode for a week, show them "You could have gotten WhatsApp alerts for 8 exams you qualified for last week."

---

## 5. Screen-by-Screen Onboarding Design

### SCREEN 0: Registration — Phone OTP + Optional Google

**Design principle:** Phone number is the primary identity for Indian users. Not email. WhatsApp is on the same number — connection is natural.

**What to show:**
- Clean screen: ExamTracker logo, tagline ("Never miss a government exam deadline again")
- Input: Mobile number (10 digits, Indian format — auto-prefix +91)
- OTP sent immediately (Twilio/MSG91 — 6-digit)
- Secondary option: "Continue with Google" (for working professionals)
- **Do NOT ask for email here** — collect it optionally later

**Code instruction:** Use phone OTP as primary auth via Supabase Auth with Twilio SMS provider. Store phone as the primary identifier. Google OAuth as secondary. Both create the same user record in the `users` table. Phone verification sets `phone_verified = true`.

---

### SCREEN 1: Personal Welcome — "What's your name?"

**What to show:**
- Single input field: "What should we call you?" (first name only)
- Subtext: "We'll personalize your exam tracker just for you"
- Large, friendly typography
- No skip option here — name is essential for WhatsApp message personalization

**Why this matters:** Razorpay does this too. "Hi [Name]" at the top of every notification creates an instant personal relationship. "Dear Aspirant" is what government websites say.

**Code instruction:** Store as `display_name` (max 50 chars). This is NOT the legal name — this is just what we call them. Don't validate strictly.

---

### SCREEN 2: Mode Selection — "How can we help you?"

**What to show:**
Three large tap-able cards with icons and plain-language descriptions:

```
┌──────────────────────────────────┐
│  🎯  I Know My Target            │
│  "I'm preparing for specific     │
│   exams. Just track those."      │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  🔍  Show Me Everything          │
│  "Show me all government exams   │
│   I'm eligible for right now."   │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  ✅  Only Where I Have Vacancy   │
│  "Show me exams where MY         │
│   category actually has seats."  │
└──────────────────────────────────┘
```

**Code instruction:** Store as `onboarding_mode` ENUM in user profile: `FOCUSED | DISCOVERY | VACANCY_AWARE`. This field drives which dashboard view is the default and how the eligibility matching query is filtered.

---

### SCREEN 3: Date of Birth

**What to show:**
- Heading: "When were you born?"
- Large date picker — NOT three separate dropdowns. Use a single scrollable date picker UX (like iOS native date picker or a well-designed custom component)
- Subtext: "We use this to check which exams you're still age-eligible for"
- **Instant feedback:** As soon as date is entered, show: "You are currently [age] years old. ✅ Still eligible for SSC CGL, IBPS PO, and [X] more central exams."

**This is the first "wow moment" in the onboarding.** Showing value immediately after giving data is the Razorpay principle in action.

**Age computation note:** The system must compute age against BOTH today's date AND the cutoff date specified in each exam notification. Some notifications say "age as on 01-01-2026"; others say "as on the closing date of application." Store DOB, compute age dynamically.

**Code instruction:** Store as `date_of_birth` (DATE type in PostgreSQL). Never store age as a number — always compute from DOB. Validate: must be between 16 and 55 years ago (reasonable bounds for government exam aspirants).

---

### SCREEN 4: Category Selection

**What to show:**
- Heading: "What is your reservation category?"
- Plain language, not "government form" language
- Six tap-able options as visual tiles:

```
General    OBC         SC
(No quota) (27% quota) (15% quota)

ST         EWS         I'm not sure
(7.5%)     (10%)       (Help me understand)
```

- When user taps any category: **immediately show them what benefits that gives them**
  - Tap OBC → slide up panel: "OBC candidates get 3 extra years for age limit + 27% of all central government seats reserved"
  - Tap SC → slide up: "SC candidates get 5 extra years for age limit + 15% of seats reserved"
  - Tap EWS → slide up: "EWS is for General category with family income below ₹8 lakh/year. 10% seats reserved."
  - Tap "Not Sure" → mini explainer quiz: "Are you from a tribe listed in the government's scheduled tribe list? → Yes/No" — helps them self-identify

**Sub-question for OBC only:** After selecting OBC, show:
- "Is your OBC certificate Non-Creamy Layer (NCL)?"
- Subtext: "If your family's annual income is above ₹8 lakh, you're considered 'Creamy Layer' and compete in the General category"
- Two options: "Yes, NCL Certificate" / "Not sure / Creamy Layer"

**Code instruction:** Store `category` as ENUM: `GENERAL | OBC_NCL | OBC_CL | SC | ST | EWS`. OBC_CL means they compete as General (no reservation benefits). This is a critical business logic distinction.

---

### SCREEN 5: Educational Qualification

**What to show:**

**Step 5A — Highest Completed Qualification:**
- Visual tile grid, not a dropdown:

```
10th Pass    12th Pass    ITI
Diploma      Graduation   Post-Graduation
Doctorate    Pursuing...
```

- Tapping "Graduation" → immediately branch:
  - Stream: General (BA/B.Sc/B.Com/BBA) / Engineering (B.Tech/BE) / Law (LLB) / Medicine (MBBS) / Education (B.Ed) / Agriculture / Other

- Show exam eligibility update in real-time: "With a B.Tech, you're eligible for SSC JE, RRB JE, UPSC IES, and [X] more high-value exams"

**Step 5B — Marks Percentage (shown only if needed based on exam interests):**
- Only show if user is in Discovery/Vacancy-Aware mode OR if their exam interests include RBI/NABARD/SBI PO
- Simple: "What was your aggregate percentage?" with a numeric input
- Skip button: "Not sure / Doesn't matter for my exams"

**Step 5C — Currently a Final-Year Student?**
- If they selected "Pursuing..." or if their graduation date is < 6 months away
- "Are you in your final year of [their selected course]?"
- If yes: "Expected passing month + year" — this gates them from exams requiring completion before application closes

**Code instruction:** Store as structured JSON in `educational_qualification` field. See schema section below. The stream/discipline must be stored as a separate field for filtering.

---

### SCREEN 6: State & Location

**What to show:**
- Heading: "Where are you from?"
- Two questions, shown sequentially:

**Q1: Home State (Domicile):**
- "Which state's government exams are you eligible for?"
- Searchable dropdown of all 28 states + 8 UTs
- Subtext: "This is usually the state where you grew up / have domicile certificate"

**Q2: Exam States Interest:**
- "Which states' exams do you want to track?" (Multi-select — can select multiple)
- Pre-select their home state
- Allow selecting "Pan-India (Central Government only)" as an option
- Show count: "You'll track exams from [X] states"

**Why both questions?** An aspirant from UP studying in Delhi might have UP domicile but want to track both UP state exams AND Delhi Police + Maharashtra PSC. Many aspirants apply across 3-5 states.

**Code instruction:** Store home state as `domicile_state` (single value, ENUM of all states). Store exam state interests as `exam_states` (array of state codes). State codes use ISO 3166-2:IN format (IN-UP, IN-MH, etc.).

---

### SCREEN 7: Exam Interest Categories

**What to show:**
- Heading: "Which exam types interest you?"
- Large icon-based tiles, multi-select:

```
🏛️ SSC          🚂 Railway      🏦 Banking
   (CGL, CHSL,     (NTPC, Group    (IBPS, SBI,
   MTS, CPO)        D, ALP)         RBI, NABARD)

👮 Police/       📚 Teaching     🏢 State PSC
   Paramilitary     (CTET, TET,     (UPSC, BPSC,
   (CRPF, BSF,      KVS, NVS)       MPPSC...)
   RPF...)

⚔️ Defence       💼 PSU          🏛️ UPSC Civil
   (Army, Navy,     (ONGC, NTPC,    Services
   Air Force,       BHEL, HPCL)     (IAS, IPS...)
   Coast Guard)
```

- User selects all that apply (minimum 1 required)
- **Instant impact:** As they tap, the app shows "Based on your profile, here's what we found in [selected category]: [X] upcoming exams you qualify for"

**If user selects Defence/Police:** Flag that we need physical standards data. Add a soft prompt: "Police and Defence exams have height/physical requirements. Want to add those? (Takes 30 seconds)"

**Code instruction:** Store as `exam_categories` ENUM array. Use these slugs: `SSC | RAILWAY | BANKING | UPSC_CIVIL | STATE_PSC | DEFENCE | POLICE | TEACHING | PSU | OTHER`. This drives both the dashboard filtering and the notification logic.

---

### SCREEN 8: Special Criteria (Conditional — Smart Branching)

**This screen is dynamically assembled based on previous answers.** Not everyone sees it. Here is the branching logic:

**Block A — PwBD (shown to everyone, but soft):**
- "Do you have any physical disability that you claim for reservation?"
- Default: No (most users)
- If Yes → Disability type (Locomotor / Visual / Hearing / Speech / Other) + Percentage of disability
- Only ask percentage if user says yes

**Block B — Ex-Serviceman (shown to everyone, but soft):**
- "Are you an ex-serviceman (retired from military/paramilitary)?"
- If Yes → Service type (Army/Navy/Air Force/Paramilitary) + Years of service
- Children of ex-servicemen: separate toggle "I am a child of an ex-serviceman" (different relaxation rules)

**Block C — Gender (shown to everyone — no branching here):**
- This should have been collected earlier, actually. But placing it here reduces awkwardness at the very start.
- "What is your gender?" — Male / Female / Third Gender / Prefer not to say
- Subtext: "Some exams have women-only vacancies and specific age relaxations for women"
- This gates: female-only posts in police, women-specific state quotas

**Block D — Physical Standards (ONLY if user selected Defence/Police in Screen 7):**
- "Your height?" (in cm, numeric input)
- "Do you wear glasses or contact lenses?" (Yes/No — relevant for Pilot, Air Traffic Controller, some police vision standards)
- This is the only block gated purely on exam category interest

**Block E — Additional Qualifications (optional, shown as "optional" section):**
- "Do you have any of these additional qualifications?" (multi-select checkboxes)
- B.Ed (for teaching exams)
- LLB (for law officer posts in banking/PSU)
- CA/ICWA/CS (for finance-related PSU posts)
- NCC Certificate (A/B/C)
- National/State level sports achievement

**Code instruction:** All special criteria are stored in a `special_criteria` JSONB field (flexible structure). Physical standards go into a separate `physical_profile` JSONB field.

---

### SCREEN 9: Notification Preferences

**What to show:**
- Heading: "How should we alert you?"
- This is also a subtle upsell moment

**Options shown:**

```
✅ Email Digest (Free)
   "Weekly summary of upcoming deadlines"

✅ Web Push Notifications (Free)  
   "Browser alerts when new exams open"

🔒 WhatsApp Alerts (Premium — ₹49/month)
   "98% open rate. Never miss a deadline."
   [Upgrade button — but non-intrusive]
```

- Toggle switches, not checkboxes — feels more modern
- Subtext under WhatsApp: "₹49/month · Cancel anytime · Same cost as one exam application fee"

**Code instruction:** Store notification preferences in `notification_preferences` JSONB. Track WhatsApp opt-in as a separate boolean with consent timestamp (DPDPA 2023 compliance requirement).

---

### SCREEN 10: THE PAYOFF — Personalized Dashboard Reveal

**This is not a step — this is the reward for completing onboarding.**

After Screen 9, instead of a generic "Welcome!" screen, the app does a **live eligibility match** and shows:

```
✨ [Name], we found [X] government exams you can apply to RIGHT NOW

📅 3 deadlines in the next 30 days
⚡ 2 exams closing in less than 7 days

[View Your Exams] ← Primary CTA

━━━━━━━━━━━━━━━━━━━━━━━
🔥 CLOSING SOON
SSC CGL 2025 → Closing in 4 days
Your Category: OBC | Vacancies for OBC: 2,847

📌 NEWLY OPENED
Railway RRB NTPC → Opened yesterday  
Your Category: OBC | Vacancies for OBC: 1,203
━━━━━━━━━━━━━━━━━━━━━━━
```

**This is the Razorpay moment.** The user sees immediate, personalized, actionable value. This is what justifies the 9 screens of data collection.

---

## 6. User Schema — Complete Database Design

### users table

```sql
CREATE TABLE users (
    -- Identity
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone               VARCHAR(15) UNIQUE,           -- +91XXXXXXXXXX format
    email               VARCHAR(255) UNIQUE,           -- Optional; collected post-onboarding
    display_name        VARCHAR(50) NOT NULL,
    
    -- Auth
    phone_verified      BOOLEAN DEFAULT FALSE,
    email_verified      BOOLEAN DEFAULT FALSE,
    auth_provider       VARCHAR(20) DEFAULT 'phone',   -- 'phone' | 'google'
    google_id           VARCHAR(100) UNIQUE,
    
    -- Onboarding state
    onboarding_mode     onboarding_mode_enum NOT NULL DEFAULT 'DISCOVERY',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_step     SMALLINT DEFAULT 0,            -- Resume partially completed onboarding
    
    -- Subscription
    subscription_tier   subscription_tier_enum DEFAULT 'FREE',  -- 'FREE' | 'PREMIUM' | 'PREMIUM_ANNUAL'
    subscription_start  TIMESTAMPTZ,
    subscription_end    TIMESTAMPTZ,
    razorpay_customer_id VARCHAR(100),
    razorpay_subscription_id VARCHAR(100),
    
    -- Metadata
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    last_active_at      TIMESTAMPTZ DEFAULT NOW(),
    is_deleted          BOOLEAN DEFAULT FALSE,
    deleted_at          TIMESTAMPTZ
);

CREATE TYPE onboarding_mode_enum AS ENUM ('FOCUSED', 'DISCOVERY', 'VACANCY_AWARE', 'COMPREHENSIVE');
CREATE TYPE subscription_tier_enum AS ENUM ('FREE', 'PREMIUM', 'PREMIUM_ANNUAL');
```

---

### user_profiles table

This is the core eligibility data table. Separated from `users` for clean separation of auth vs. profile data.

```sql
CREATE TABLE user_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- ─────────── PILLAR 1: Age ───────────
    date_of_birth       DATE NOT NULL,
    
    -- ─────────── PILLAR 2: Category ───────────
    category            category_enum NOT NULL,
    -- GENERAL | OBC_NCL | OBC_CL | SC | ST | EWS
    -- OBC_CL = Creamy Layer OBC; treated as GENERAL for reservation purposes
    
    -- ─────────── PILLAR 3: Education ───────────
    highest_qualification qualification_level_enum NOT NULL,
    -- See ENUM definition below
    
    qualification_stream VARCHAR(100),
    -- For engineering: 'Civil' | 'Mechanical' | 'Electrical' | 'Electronics' | 'Computer_Science' | 'Chemical' | 'Instrumentation' | 'Other_Engineering'
    -- For ITI: trade name (e.g., 'Electrician', 'Fitter', 'Welder')
    -- For general graduation: 'Science' | 'Commerce' | 'Arts' | 'BBA' | 'Other'
    -- NULL for post-graduation and above (handled separately)
    
    marks_percentage    NUMERIC(5,2),
    -- e.g., 67.50 — nullable; not all exams require this
    
    is_final_year       BOOLEAN DEFAULT FALSE,
    -- TRUE if currently in final year of a higher qualification
    
    expected_completion DATE,
    -- If is_final_year = TRUE: expected month/year of passing
    
    additional_qualifications TEXT[],
    -- Array of: 'BED' | 'LLB' | 'CA' | 'CS' | 'ICWA' | 'MBBS' | 'NCC_A' | 'NCC_B' | 'NCC_C' | 'BTECH' | 'MSC' | 'MBA'
    
    -- ─────────── PILLAR 4: Nationality & Domicile ───────────
    nationality         nationality_enum DEFAULT 'INDIAN',
    -- 'INDIAN' | 'NEPAL_BHUTAN' | 'PIO' | 'OCI'
    
    domicile_state      state_code_enum NOT NULL,
    -- IN-UP, IN-MH, IN-DL, etc. — state of domicile/permanent residence
    
    current_state       state_code_enum,
    -- May differ from domicile (student studying in another state) — optional
    
    exam_states         state_code_enum[],
    -- States whose PSC/state-level exams the user wants to track
    -- Can include 'ALL' for pan-India central exams only
    
    languages_known     VARCHAR(50)[],
    -- For state exam language requirements: 'Hindi' | 'English' | 'Marathi' | 'Tamil' | 'Telugu' | 'Kannada' | 'Bengali' | etc.
    
    -- ─────────── PILLAR 5: Physical Standards ───────────
    gender              gender_enum NOT NULL,
    -- 'MALE' | 'FEMALE' | 'THIRD_GENDER' | 'PREFER_NOT_TO_SAY'
    
    height_cm           SMALLINT,
    -- Only collected if user expressed interest in Defence/Police exams; nullable
    
    has_vision_correction BOOLEAN,
    -- Glasses/contacts: relevant for pilot/ATC/some police posts
    
    -- ─────────── PILLAR 6: Special Criteria ───────────
    is_pwd              BOOLEAN DEFAULT FALSE,
    -- PwBD / Persons with Benchmark Disability
    
    pwd_type            VARCHAR(50),
    -- 'LOCOMOTOR' | 'VISUAL' | 'HEARING' | 'SPEECH' | 'INTELLECTUAL' | 'OTHER' — if is_pwd = TRUE
    
    pwd_percentage      SMALLINT,
    -- % disability as on disability certificate; minimum 40% required for most benefits
    
    is_ex_serviceman    BOOLEAN DEFAULT FALSE,
    ex_service_type     VARCHAR(50),
    -- 'ARMY' | 'NAVY' | 'AIR_FORCE' | 'PARAMILITARY' | 'CHILD_OF_ESM'
    
    ex_service_years    SMALLINT,
    -- Years of military service; used for age calculation (total service - 3 = age relaxation)
    
    marital_status      marital_status_enum,
    -- 'UNMARRIED' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' — optional; some exams care
    
    is_government_employee BOOLEAN DEFAULT FALSE,
    -- Current government employee: affects some PSU/bank eligibility
    
    has_sports_achievement BOOLEAN DEFAULT FALSE,
    sports_level        VARCHAR(20),
    -- 'NATIONAL' | 'STATE' | 'DISTRICT' — if has_sports_achievement = TRUE
    
    -- ─────────── Exam Preferences ───────────
    exam_categories     exam_category_enum[],
    -- Array: 'SSC' | 'RAILWAY' | 'BANKING' | 'UPSC_CIVIL' | 'STATE_PSC' | 'DEFENCE' | 'POLICE' | 'TEACHING' | 'PSU' | 'OTHER'
    
    -- ─────────── Metadata ───────────
    profile_completeness SMALLINT DEFAULT 0,
    -- Computed field: % of optional fields filled (0-100) — used to prompt users to complete profile
    
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (user_id)
);

-- ENUMS
CREATE TYPE category_enum AS ENUM ('GENERAL', 'OBC_NCL', 'OBC_CL', 'SC', 'ST', 'EWS');
CREATE TYPE nationality_enum AS ENUM ('INDIAN', 'NEPAL_BHUTAN', 'PIO', 'OCI');
CREATE TYPE gender_enum AS ENUM ('MALE', 'FEMALE', 'THIRD_GENDER', 'PREFER_NOT_TO_SAY');
CREATE TYPE marital_status_enum AS ENUM ('UNMARRIED', 'MARRIED', 'DIVORCED', 'WIDOWED');
CREATE TYPE exam_category_enum AS ENUM ('SSC', 'RAILWAY', 'BANKING', 'UPSC_CIVIL', 'STATE_PSC', 'DEFENCE', 'POLICE', 'TEACHING', 'PSU', 'OTHER');

CREATE TYPE qualification_level_enum AS ENUM (
    'CLASS_10',
    'CLASS_12',
    'ITI',
    'DIPLOMA',
    'GRADUATION',
    'POST_GRADUATION',
    'DOCTORATE',
    'PROFESSIONAL_CA',    -- CA/ICAI
    'PROFESSIONAL_CS',    -- Company Secretary
    'PROFESSIONAL_ICWA',  -- Cost Accountant
    'PROFESSIONAL_LLB',   -- Law
    'PROFESSIONAL_MBBS',  -- Medicine
    'PROFESSIONAL_BED'    -- B.Ed (Teaching)
);

-- State codes (ISO 3166-2:IN)
CREATE TYPE state_code_enum AS ENUM (
    'IN-AP', 'IN-AR', 'IN-AS', 'IN-BR', 'IN-CT', 'IN-GA', 'IN-GJ',
    'IN-HR', 'IN-HP', 'IN-JH', 'IN-KA', 'IN-KL', 'IN-MP', 'IN-MH',
    'IN-MN', 'IN-ML', 'IN-MZ', 'IN-NL', 'IN-OD', 'IN-PB', 'IN-RJ',
    'IN-SK', 'IN-TN', 'IN-TS', 'IN-TR', 'IN-UP', 'IN-UK', 'IN-WB',
    'IN-AN', 'IN-CH', 'IN-DN', 'IN-DL', 'IN-JK', 'IN-LA', 'IN-LD', 'IN-PY'
);
```

---

### notification_preferences table

```sql
CREATE TABLE notification_preferences (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Channels
    email_enabled       BOOLEAN DEFAULT TRUE,
    email_frequency     VARCHAR(20) DEFAULT 'WEEKLY',
    -- 'IMMEDIATE' | 'DAILY' | 'WEEKLY'
    
    push_enabled        BOOLEAN DEFAULT TRUE,
    whatsapp_enabled    BOOLEAN DEFAULT FALSE,
    -- FALSE by default; only TRUE after explicit opt-in (DPDPA compliance)
    
    sms_enabled         BOOLEAN DEFAULT FALSE,
    -- Only for Premium users on critical deadlines
    
    -- WhatsApp DPDPA compliance
    whatsapp_consent_timestamp  TIMESTAMPTZ,
    whatsapp_consent_ip         INET,
    
    -- Alert types (user controls)
    alert_new_eligible_exam     BOOLEAN DEFAULT TRUE,
    alert_deadline_approaching  BOOLEAN DEFAULT TRUE,
    alert_deadline_days_before  SMALLINT DEFAULT 7,
    -- Number of days before deadline to send reminder (3, 5, 7, 10, 15)
    
    alert_admit_card_released   BOOLEAN DEFAULT TRUE,
    alert_result_declared       BOOLEAN DEFAULT TRUE,
    alert_answer_key_released   BOOLEAN DEFAULT FALSE,
    -- Most users don't need this — default off
    
    -- Quiet hours (for push/WhatsApp)
    quiet_hours_enabled         BOOLEAN DEFAULT TRUE,
    quiet_hours_start           TIME DEFAULT '22:00',
    quiet_hours_end             TIME DEFAULT '07:00',
    -- Don't disturb between 10 PM and 7 AM
    
    -- Language preference for notifications
    notification_language       VARCHAR(10) DEFAULT 'en',
    -- 'en' | 'hi' — expandable later
    
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (user_id)
);
```

---

### tracked_exams table

```sql
CREATE TABLE tracked_exams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    
    -- Tracking state
    status          tracked_status_enum DEFAULT 'TRACKING',
    -- 'TRACKING' | 'APPLIED' | 'APPEARED' | 'RESULT_AWAITED' | 'SELECTED' | 'NOT_SELECTED' | 'WITHDRAWN'
    
    -- User-entered data (optional)
    application_number  VARCHAR(100),
    roll_number         VARCHAR(100),
    marks_obtained      NUMERIC(7,2),
    rank_obtained       INTEGER,
    
    -- Timestamps
    tracked_at      TIMESTAMPTZ DEFAULT NOW(),
    applied_at      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (user_id, exam_id)
);

CREATE TYPE tracked_status_enum AS ENUM (
    'TRACKING', 'APPLIED', 'APPEARED', 'RESULT_AWAITED', 
    'SELECTED', 'NOT_SELECTED', 'WITHDRAWN'
);
```

---

## 7. Database Choice & Rationale

### Primary Database: PostgreSQL (via Supabase)

**Why PostgreSQL:**
- Structured relational data is perfect for the eligibility matching logic (complex WHERE clauses across multiple fields)
- Array column support (`exam_categories TEXT[]`, `exam_states state_code_enum[]`) lets us store multi-select data without junction tables for simple cases
- JSONB for flexible fields (`additional_qualifications`, `special_criteria`) without losing indexing
- Row-Level Security (RLS) built-in via Supabase — user can only see their own profile
- Full-text search for exam catalog (with `pg_trgm` extension)
- Strong ACID guarantees — critical for subscription/payment state

**Why Supabase specifically:**
- Gives you PostgreSQL + Auth + Realtime + Storage in one managed service
- Indian latency is fine via AWS Mumbai region (ap-south-1)
- Built-in Row Level Security simplifies the "each user only sees their own data" requirement
- Scales from 0 to production without architecture change
- Free tier is generous enough for development and early beta

**What goes in other storage:**

| Data Type | Storage | Reason |
|---|---|---|
| User profile, eligibility data | PostgreSQL (Supabase) | Relational, complex queries |
| Exam catalog, notifications | PostgreSQL (Supabase) | Structured, searchable |
| WhatsApp consent logs | PostgreSQL (append-only table) | DPDPA compliance audit trail |
| Session data, rate limiting | Redis (Upstash) | Fast ephemeral; Upstash has free tier |
| Email templates, notification content | PostgreSQL | Keep everything in one place for MVP |
| Official exam PDFs (cached copies) | Supabase Storage (S3) | Store source documents for verification |
| User-uploaded documents (future) | Supabase Storage | Structured file storage |

**Why NOT separate services at MVP stage:**
- MongoDB/DynamoDB: We have strong relational requirements (user + profile + tracked exams + eligibility rules join queries). NoSQL would force us to duplicate data and write application-level joins.
- Firebase: Vendor lock-in, harder to migrate, less SQL power for complex eligibility queries.
- Planetscale: MySQL-based, no array columns, no JSONB. Would force more junction tables.

---

## 8. Exam Data Schema

```sql
CREATE TABLE exams (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    slug                VARCHAR(200) UNIQUE NOT NULL,
    -- e.g., 'ssc-cgl-2025', 'rrb-ntpc-2025-cycle-1'
    
    name                VARCHAR(300) NOT NULL,
    short_name          VARCHAR(100),
    -- e.g., 'SSC CGL 2025'
    
    -- Classification
    category            exam_category_enum NOT NULL,
    conducting_body     VARCHAR(200) NOT NULL,
    -- 'Staff Selection Commission', 'RRB Mumbai', 'IBPS', 'UPSC', etc.
    
    level               exam_level_enum NOT NULL,
    -- 'CENTRAL' | 'STATE' | 'PSU' | 'DEFENCE'
    
    state_code          state_code_enum,
    -- NULL for central/national exams; set for state PSC exams
    
    -- Vacancy data
    total_vacancies     INTEGER,
    vacancies_by_category JSONB,
    -- Example:
    -- {
    --   "general": 1200,
    --   "obc": 847,
    --   "sc": 423,
    --   "st": 212,
    --   "ews": 282,
    --   "pwd_locomotor": 45,
    --   "pwd_visual": 30,
    --   "ex_servicemen": 85
    -- }
    
    -- This is the critical field for VACANCY_AWARE mode
    
    -- Dates
    notification_date   DATE,
    application_start   DATE,
    application_end     DATE NOT NULL,
    -- application_end is the primary deadline we alert on
    
    exam_date           DATE,
    -- May be NULL if not announced yet
    
    admit_card_date     DATE,
    result_date         DATE,
    -- Estimated/announced dates; updated when official dates released
    
    -- Eligibility criteria (encoded for matching engine)
    min_age             SMALLINT,
    -- Minimum age (general category); age relaxations handled separately
    
    max_age_general     SMALLINT,
    max_age_obc         SMALLINT,
    max_age_sc_st       SMALLINT,
    max_age_ews         SMALLINT,
    max_age_pwd_general SMALLINT,
    max_age_pwd_obc     SMALLINT,
    max_age_pwd_sc_st   SMALLINT,
    max_age_ex_serviceman SMALLINT,
    -- Store all category-specific upper age limits explicitly
    -- Computed as: general_upper_age + relaxation, but storing explicitly avoids runtime calculation errors
    
    age_cutoff_date     DATE,
    -- The date against which age is calculated (often 01-Jan of exam year)
    
    required_qualification qualification_level_enum NOT NULL,
    required_streams    TEXT[],
    -- NULL = any stream; ['Civil', 'Mechanical'] = only engineering with these streams
    
    min_marks_percentage NUMERIC(5,2),
    -- NULL = no minimum percentage; 60.00 = 60% required
    
    allows_final_year   BOOLEAN DEFAULT FALSE,
    -- Can final-year students apply provisionally?
    
    nationality_requirement nationality_enum DEFAULT 'INDIAN',
    gender_restriction  gender_enum,
    -- NULL = no restriction; 'FEMALE' = women-only; 'MALE' = men-only
    
    physical_requirements JSONB,
    -- {
    --   "has_physical_test": true,
    --   "min_height_male_general": 170,
    --   "min_height_female_general": 157,
    --   "min_height_sc_st": 165,
    --   "vision_standard": "6/6_uncorrected"
    -- }
    
    marital_status_requirement marital_status_enum,
    -- NULL = no restriction; 'UNMARRIED' = NDA etc.
    
    -- Source & verification
    official_notification_url  TEXT NOT NULL,
    -- Direct link to official PDF on government website
    
    notification_verified  BOOLEAN DEFAULT FALSE,
    -- Has our editorial team verified this against the official source?
    
    data_source         VARCHAR(50) DEFAULT 'MANUAL',
    -- 'MANUAL' | 'SCRAPER' | 'RSS' | 'API'
    
    is_active           BOOLEAN DEFAULT TRUE,
    -- FALSE for cancelled/postponed exams
    
    is_cancelled        BOOLEAN DEFAULT FALSE,
    cancellation_reason TEXT,
    
    -- Fees
    application_fee_general   NUMERIC(8,2),
    application_fee_sc_st     NUMERIC(8,2),
    application_fee_pwd       NUMERIC(8,2),
    application_fee_women     NUMERIC(8,2),
    -- NULL = no separate rate (use general rate)
    
    fee_payment_mode    TEXT[],
    -- ['UPI', 'NetBanking', 'DebitCard', 'CreditCard', 'Challan']
    
    -- Content
    description         TEXT,
    -- Brief description for display (100-200 words)
    
    syllabus_summary    TEXT,
    selection_process   TEXT[],
    -- ['Tier I (Written)', 'Tier II (Written)', 'Skill Test', 'Document Verification']
    
    -- Metadata
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          UUID REFERENCES users(id),
    -- Which admin/editor added this
    
    last_verified_at    TIMESTAMPTZ
);

CREATE TYPE exam_level_enum AS ENUM ('CENTRAL', 'STATE', 'PSU', 'DEFENCE', 'BANKING');

-- Indexes for performance
CREATE INDEX idx_exams_application_end ON exams(application_end) WHERE is_active = TRUE;
CREATE INDEX idx_exams_category ON exams(category);
CREATE INDEX idx_exams_state ON exams(state_code);
CREATE INDEX idx_exams_qualification ON exams(required_qualification);
CREATE INDEX idx_exams_vacancies ON exams USING GIN(vacancies_by_category);
```

---

## 9. Eligibility Matching Logic

### The Core Query (Plain English)

When a user opens their dashboard, we run:

**"Find all active exams where:**
1. The application window hasn't closed yet
2. The user's age (on the exam's cutoff date) is within the exam's age range for their category
3. The user's educational qualification meets or exceeds the exam's requirement
4. The stream requirement matches (if any)
5. The user's marks percentage meets the minimum (if any)
6. The nationality matches
7. The state restriction matches (if any)
8. The gender restriction matches (if any)
9. The physical requirements are met (if height/vision requirements exist)
10. BONUS: If in VACANCY_AWARE mode — there are vacancies allocated for their category"

### SQL Eligibility Query (Conceptual)

```sql
-- Function: get_eligible_exams_for_user(user_id UUID)
-- Returns all exams a specific user is eligible for

WITH user_data AS (
    SELECT 
        u.id,
        up.date_of_birth,
        up.category,
        up.highest_qualification,
        up.qualification_stream,
        up.marks_percentage,
        up.is_final_year,
        up.expected_completion,
        up.nationality,
        up.domicile_state,
        up.exam_states,
        up.gender,
        up.height_cm,
        up.has_vision_correction,
        up.is_pwd,
        up.pwd_type,
        up.is_ex_serviceman,
        up.ex_service_years,
        up.additional_qualifications,
        up.exam_categories,
        u.onboarding_mode
    FROM users u
    JOIN user_profiles up ON u.id = up.user_id
    WHERE u.id = $1  -- user_id parameter
)
SELECT e.*, 
    -- Compute age on the exam's specific cutoff date
    DATE_PART('year', AGE(COALESCE(e.age_cutoff_date, e.application_end), ud.date_of_birth)) AS age_at_cutoff,
    
    -- Which category-specific vacancy count applies?
    CASE ud.category
        WHEN 'OBC_NCL' THEN (e.vacancies_by_category->>'obc')::int
        WHEN 'SC'      THEN (e.vacancies_by_category->>'sc')::int
        WHEN 'ST'      THEN (e.vacancies_by_category->>'st')::int
        WHEN 'EWS'     THEN (e.vacancies_by_category->>'ews')::int
        ELSE (e.vacancies_by_category->>'general')::int
    END AS vacancies_for_my_category

FROM exams e
CROSS JOIN user_data ud
WHERE 
    -- Active exam with open application window
    e.is_active = TRUE
    AND e.is_cancelled = FALSE
    AND e.application_end >= CURRENT_DATE

    -- Age eligibility (category-specific upper age limit)
    AND DATE_PART('year', AGE(COALESCE(e.age_cutoff_date, e.application_end), ud.date_of_birth)) >= e.min_age
    AND DATE_PART('year', AGE(COALESCE(e.age_cutoff_date, e.application_end), ud.date_of_birth)) <= CASE ud.category
        WHEN 'OBC_NCL'   THEN COALESCE(e.max_age_obc, e.max_age_general)
        WHEN 'OBC_CL'    THEN e.max_age_general  -- Creamy Layer = General
        WHEN 'SC'        THEN COALESCE(e.max_age_sc_st, e.max_age_general)
        WHEN 'ST'        THEN COALESCE(e.max_age_sc_st, e.max_age_general)
        WHEN 'EWS'       THEN COALESCE(e.max_age_ews, e.max_age_general)
        ELSE e.max_age_general
    END

    -- Education eligibility
    AND (
        -- Map qualification levels to ordinal for comparison
        CASE ud.highest_qualification
            WHEN 'CLASS_10'        THEN 1
            WHEN 'CLASS_12'        THEN 2
            WHEN 'ITI'             THEN 3
            WHEN 'DIPLOMA'         THEN 4
            WHEN 'GRADUATION'      THEN 5
            WHEN 'POST_GRADUATION' THEN 6
            WHEN 'DOCTORATE'       THEN 7
            ELSE 5  -- Professional degrees treated as graduation-equivalent
        END
        >=
        CASE e.required_qualification
            WHEN 'CLASS_10'        THEN 1
            WHEN 'CLASS_12'        THEN 2
            WHEN 'ITI'             THEN 3
            WHEN 'DIPLOMA'         THEN 4
            WHEN 'GRADUATION'      THEN 5
            WHEN 'POST_GRADUATION' THEN 6
            WHEN 'DOCTORATE'       THEN 7
        END
    )
    -- OR they're in final year with expected completion before exam date
    OR (ud.is_final_year = TRUE AND e.allows_final_year = TRUE 
        AND ud.expected_completion <= COALESCE(e.exam_date, e.application_end + INTERVAL '6 months'))

    -- Stream requirement (if exam specifies a required stream)
    AND (
        e.required_streams IS NULL 
        OR e.required_streams = '{}'
        OR ud.qualification_stream = ANY(e.required_streams)
        OR ud.additional_qualifications && e.required_streams  -- overlap check
    )

    -- Marks percentage
    AND (e.min_marks_percentage IS NULL OR ud.marks_percentage >= e.min_marks_percentage)

    -- Nationality
    AND (e.nationality_requirement = 'INDIAN' AND ud.nationality = 'INDIAN')
    -- (extend for Nepal/Bhutan cases separately)

    -- Gender restriction
    AND (e.gender_restriction IS NULL OR e.gender_restriction = ud.gender)

    -- State restriction (for state exams)
    AND (
        e.state_code IS NULL  -- central exams: no state restriction
        OR e.state_code = ud.domicile_state  -- domicile match
        OR e.state_code = ANY(ud.exam_states)  -- user opted into this state's exams
    )

    -- Exam category interest (user only wants to see categories they care about)
    AND (
        e.category = ANY(ud.exam_categories)
        OR ud.exam_categories IS NULL
    )

    -- VACANCY_AWARE mode filter (only for that mode)
    AND (
        ud.onboarding_mode != 'VACANCY_AWARE'
        OR (
            CASE ud.category
                WHEN 'OBC_NCL' THEN (e.vacancies_by_category->>'obc')::int
                WHEN 'SC'      THEN (e.vacancies_by_category->>'sc')::int
                WHEN 'ST'      THEN (e.vacancies_by_category->>'st')::int
                WHEN 'EWS'     THEN (e.vacancies_by_category->>'ews')::int
                ELSE (e.vacancies_by_category->>'general')::int
            END > 0
        )
    )

ORDER BY e.application_end ASC;  -- Closest deadline first
```

### Eligibility Result Flags

Rather than binary eligible/ineligible, we return a confidence flag:

| Flag | Meaning | Display Color |
|---|---|---|
| `ELIGIBLE` | All criteria definitely met | Green ✅ |
| `LIKELY_ELIGIBLE` | Core criteria met; some optional fields unverified | Amber ⚡ |
| `CHECK_REQUIRED` | One or more criteria couldn't be determined from profile | Orange ⚠️ |
| `INELIGIBLE` | One or more hard criteria definitely not met | Gray (hidden from main view) |

---

## 10. Notification Preferences Schema

Already included in Section 6. The notification system follows this priority:

1. **New Eligible Exam Alert** — when a new exam enters the system that matches the user's profile
2. **Deadline Alert** — X days before application closes (user-configurable: 1, 3, 5, 7, 10, 15 days)
3. **Admit Card Released** — for tracked/applied exams
4. **Result Declared** — for appeared exams

All notifications include: exam name, deadline, official link, user's category vacancy count (if known).

---

## 11. Auth Architecture

```
Phone Number Input
       │
       ▼
OTP via SMS (Twilio / MSG91)
       │
       ▼
Supabase Auth — Phone Auth Provider
       │
       ├── New User → Create users record → Start onboarding
       │
       └── Returning User → Load profile → Resume at last state
       
Google OAuth (secondary path):
Google Sign-In → Supabase Auth → Check if phone linked → 
       ├── Phone linked: Log in normally
       └── No phone: Prompt to add phone for WhatsApp (optional)
```

**Session Management:**
- JWT tokens issued by Supabase Auth
- Token refresh handled automatically by Supabase client
- All API routes protected by Supabase RLS — users can only read/write their own data
- No server-side session storage needed (stateless JWT)

**Admin Auth:**
- Separate admin role in Supabase
- Admin panel protected by admin-role check at middleware level
- 2FA required for admin accounts

---

## 12. API Design Principles

### REST API Structure

```
/api/v1/
    auth/
        /send-otp              POST - Send OTP to phone
        /verify-otp            POST - Verify OTP, return JWT
        /google                POST - Google OAuth exchange
        /logout                POST - Invalidate session
    
    onboarding/
        /mode                  PUT  - Set onboarding mode
        /profile               PUT  - Save profile (incremental)
        /complete              POST - Mark onboarding complete
    
    profile/
        /                      GET  - Get full user profile
        /                      PUT  - Update profile fields
        /eligibility-summary   GET  - Quick eligibility overview
    
    exams/
        /                      GET  - All eligible exams (paginated)
        /:id                   GET  - Single exam detail
        /track                 POST - Track an exam
        /:id/untrack           DELETE - Untrack
        /search                GET  - Search exam catalog
        /categories            GET  - Available categories
    
    dashboard/
        /                      GET  - Personalized dashboard data
        /deadlines             GET  - Upcoming deadlines
        /new-matches           GET  - New eligible exams since last visit
    
    notifications/
        /preferences           GET/PUT - Notification settings
        /history               GET  - Past notifications received
        /whatsapp-optin        POST - WhatsApp consent (with timestamp/IP logging)
    
    subscriptions/
        /status                GET  - Current subscription
        /create-order          POST - Create Razorpay order
        /webhook               POST - Razorpay webhook (verify payment)
        /cancel                POST - Cancel subscription
```

### API Rules:
- All responses: `{ success: boolean, data: T, error?: string, pagination?: {...} }`
- Rate limiting via Upstash Redis: 100 requests/minute per authenticated user
- All dates returned as ISO 8601 UTC strings
- Age is NEVER returned from API — always send DOB and let frontend compute display age
- Category-specific vacancy counts are always included in exam responses

---

## 13. Frontend Architecture

### Framework: Next.js 14 (App Router)

**Page Structure:**
```
/                          → Landing page (SEO-optimized)
/register                  → Onboarding flow (client-side, multi-step)
/dashboard                 → Main dashboard (SSR for initial data)
/dashboard/exams           → Exam browser
/dashboard/exam/[slug]     → Individual exam page
/dashboard/profile         → Edit profile
/dashboard/settings        → Notification preferences
/dashboard/upgrade         → Premium upgrade page
/exams/[slug]              → Public exam pages (SEO - no auth required)
/eligibility/[exam-slug]   → SEO: "SSC CGL eligibility for OBC"
```

**Onboarding Component Architecture:**

The onboarding flow lives at `/register` and is a fully client-side multi-step form. Key decisions:

- State managed with `useReducer` or Zustand — onboarding state persisted to localStorage so users can resume
- Each step is a separate component: `<StepDOB />`, `<StepCategory />`, `<StepEducation />`, etc.
- Progress is auto-saved to the server after each step completion (not just at the end)
- If user abandons and returns, they resume at their last saved step (from `onboarding_step` field in users table)
- Animated transitions between steps using Framer Motion (lightweight, tree-shakeable)

**The Live Eligibility Preview Component:**

A `<EligibilityPreview />` component that sits in the side panel during onboarding (on desktop) or as a slide-up drawer (on mobile). It updates in real-time as the user fills in each field, showing:
- "Based on what you've told us so far, here are [X] exams you might qualify for..."
- This is the "show, don't tell" principle in action

---

## 14. Tech Stack Summary

| Layer | Technology | Version | Reason |
|---|---|---|---|
| Frontend Framework | Next.js (App Router) | 14+ | SSR for SEO + CSR for dashboard |
| UI Library | shadcn/ui + Tailwind CSS | Latest | Fast, unstyled, accessible components |
| State Management | Zustand | 4+ | Lightweight; perfect for onboarding state |
| Animations | Framer Motion | 10+ | Onboarding step transitions |
| Database | PostgreSQL via Supabase | 15 | Managed Postgres with RLS |
| Auth | Supabase Auth | — | Phone OTP + Google OAuth |
| OTP SMS | Twilio (or MSG91 as fallback) | — | Reliable, well-documented |
| Cache / Rate Limiting | Upstash Redis | — | Serverless Redis; generous free tier |
| WhatsApp | Meta WABA via AiSensy or Interakt | — | Indian WhatsApp API resellers; cheaper |
| Email | AWS SES | — | ₹0.007/email; reliable |
| Push Notifications | OneSignal | — | Free up to 10K subscribers |
| Payments | Razorpay | — | Indian gateway; UPI, cards, net banking |
| File Storage | Supabase Storage | — | For official notification PDFs |
| Search | PostgreSQL full-text + `pg_trgm` | — | Avoid adding Algolia at MVP stage |
| Hosting (Frontend) | Vercel | — | Auto-scaling, great Next.js DX |
| Hosting (API) | Vercel Edge Functions OR Railway.app | — | Railway for background jobs |
| Background Jobs | BullMQ (Node.js) on Railway | — | Scraping queue, notification delivery |
| Analytics | PostHog (self-hosted on Railway) | — | Full funnel visibility |
| Error Tracking | Sentry | — | Free tier sufficient for MVP |
| Monitoring | Uptime Robot | — | Free uptime monitoring |

---

## 15. Development Phases

### Phase 0: Pre-Development Setup (Week 0)
- Set up Supabase project (choose ap-south-1 Mumbai region)
- Configure local development environment
- Set up Vercel project, link GitHub repository
- Configure Razorpay test credentials
- Set up OneSignal account
- Define all database ENUMs and create migration files
- Set up Sentry + PostHog

### Phase 1: Auth + Onboarding (Weeks 1–3)
- Phone OTP auth via Supabase
- All 9 onboarding screens
- Profile save API (incremental)
- Basic eligibility matching function
- Dashboard "reveal" screen (even if with dummy data)

**Milestone: A user can register, complete onboarding, and see a personalized exam list.**

### Phase 2: Exam Database + Core Dashboard (Weeks 4–6)
- Manually curate 50 central government exams into the database
- Full eligibility matching query working
- Dashboard: Deadline calendar, exam cards with category-specific vacancy counts
- Track/Untrack exam functionality
- Email digest (weekly) via AWS SES
- Web push notifications via OneSignal

**Milestone: Core product loop complete. User can track exams, see deadlines, get email alerts.**

### Phase 3: Payments + Premium (Week 7–8)
- Razorpay subscription integration
- WhatsApp opt-in flow (with DPDPA consent recording)
- WhatsApp utility messages via AiSensy for premium users
- Premium gating: WhatsApp only for paid users

**Milestone: First paying user.**

### Phase 4: Growth Features (Weeks 9–12)
- SEO exam pages (individual pages for each exam)
- Referral program
- Hindi interface
- State PSC coverage (top 5 states)
- Admin dashboard for exam data management

---

## 16. Key Engineering Decisions Log

This section documents *why* specific decisions were made, so future developers don't revisit them without context.

---

**Decision 1: Store all category-specific age limits as explicit columns, not computed**

*Why:* Government notifications sometimes have non-standard relaxations (e.g., OBC from J&K gets different relaxation than OBC from other states for some exams). Storing explicit columns (`max_age_obc`, `max_age_sc_st`) prevents bugs from applying the standard formula when the notification is non-standard. The manual curation team enters the *actual* limit from the notification PDF, not the computed one.

---

**Decision 2: JSONB for vacancy_by_category, not a junction table**

*Why:* Vacancy counts are always queried as a whole unit (show all category counts for one exam). A junction table would require a join every time. JSONB allows GIN indexing for fast lookups and easy partial queries. The structure is stable enough for JSONB (always the same 8-10 keys).

---

**Decision 3: Store domicile_state AND exam_states as separate fields**

*Why:* A student from Bihar studying in Delhi has Bihar domicile but wants Delhi Police notifications. Conflating these into one field would either miss valid exams or show ineligible state exams. This separation, while slightly complex, models reality accurately.

---

**Decision 4: OBC_NCL and OBC_CL as separate category values**

*Why:* From the government's perspective, a Creamy Layer OBC person competes as General category. If we store them as "OBC" and check a boolean flag, we risk bugs where the eligibility engine applies OBC age relaxation to someone who shouldn't get it. Separate enum values make the rules unambiguous.

---

**Decision 5: No mobile app in MVP**

*Why:* PWA (Progressive Web App) on Android covers 80%+ of users adequately. Building a React Native app doubles the development effort and adds Play Store approval timelines. PWA supports push notifications on Android Chrome. Revisit after 10,000 MAU.

---

**Decision 6: WhatsApp consent recorded with timestamp and IP**

*Why:* DPDPA 2023 (India's data protection law) requires that consent be specific, informed, freely given, and verifiable. Recording the timestamp and IP of the opt-in serves as an audit trail. This is a legal requirement, not optional.

---

**Decision 7: Eligibility status as a 4-level flag, not binary**

*Why:* A binary eligible/ineligible is misleading. For many exams, we cannot determine eligibility with certainty if the user has incomplete profile data. Showing "LIKELY_ELIGIBLE (complete your profile to confirm)" is more honest and incentivizes profile completion.

---

**Decision 8: The application_end date is the primary alert trigger, not the exam date**

*Why:* The exam date is usually months away; aspirants don't need alerts for it. The application window closing is the irreversible event — missing it means you cannot apply regardless of how well you prepare. All our deadline logic centers on `application_end`.

---

*End of Architecture & Engineering Bible*

---

**Document Version:** 1.0  
**Created:** February 2026  
**Next Review:** After Phase 1 completion  
**Owner:** Naveen (Founder)  
**Status:** Approved for development to begin
