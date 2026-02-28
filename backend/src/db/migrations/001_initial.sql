-- ═══════════════════════════════════════════════════════════════════════════════
-- ExamTracker India — Initial Database Migration
-- Run this in the Supabase SQL Editor ONCE before starting development.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Step 1: Create all ENUM types ───────────────────────────────────────────

CREATE TYPE onboarding_mode_enum AS ENUM ('FOCUSED', 'DISCOVERY', 'VACANCY_AWARE', 'COMPREHENSIVE');
CREATE TYPE category_enum AS ENUM ('GENERAL', 'OBC_NCL', 'OBC_CL', 'SC', 'ST', 'EWS');
CREATE TYPE nationality_enum AS ENUM ('INDIAN', 'NEPAL_BHUTAN', 'PIO', 'OCI');
CREATE TYPE gender_enum AS ENUM ('MALE', 'FEMALE', 'THIRD_GENDER', 'PREFER_NOT_TO_SAY');
CREATE TYPE marital_status_enum AS ENUM ('UNMARRIED', 'MARRIED', 'DIVORCED', 'WIDOWED');
CREATE TYPE exam_category_enum AS ENUM ('SSC', 'RAILWAY', 'BANKING', 'UPSC_CIVIL', 'STATE_PSC', 'DEFENCE', 'POLICE', 'TEACHING', 'PSU', 'OTHER');
CREATE TYPE exam_level_enum AS ENUM ('CENTRAL', 'STATE', 'PSU', 'DEFENCE', 'BANKING');
CREATE TYPE tracked_status_enum AS ENUM ('TRACKING', 'APPLIED', 'APPEARED', 'RESULT_AWAITED', 'SELECTED', 'NOT_SELECTED', 'WITHDRAWN');

CREATE TYPE qualification_level_enum AS ENUM (
    'CLASS_10', 'CLASS_12', 'ITI', 'DIPLOMA',
    'GRADUATION', 'POST_GRADUATION', 'DOCTORATE',
    'PROFESSIONAL_CA', 'PROFESSIONAL_CS', 'PROFESSIONAL_ICWA',
    'PROFESSIONAL_LLB', 'PROFESSIONAL_MBBS', 'PROFESSIONAL_BED'
);

-- Indian state codes (ISO 3166-2:IN) — 28 states + 8 UTs
CREATE TYPE state_code_enum AS ENUM (
    'IN-AP', 'IN-AR', 'IN-AS', 'IN-BR', 'IN-CT', 'IN-GA', 'IN-GJ',
    'IN-HR', 'IN-HP', 'IN-JH', 'IN-KA', 'IN-KL', 'IN-MP', 'IN-MH',
    'IN-MN', 'IN-ML', 'IN-MZ', 'IN-NL', 'IN-OD', 'IN-PB', 'IN-RJ',
    'IN-SK', 'IN-TN', 'IN-TS', 'IN-TR', 'IN-UP', 'IN-UK', 'IN-WB',
    'IN-AN', 'IN-CH', 'IN-DN', 'IN-DL', 'IN-JK', 'IN-LA', 'IN-LD', 'IN-PY'
);

-- ─── Step 2: users table ─────────────────────────────────────────────────────
-- NOTE: Supabase Auth already creates auth.users. This extends it with app-level data.

CREATE TABLE users (
    -- Identity
    id                  UUID PRIMARY KEY,  -- Same ID as auth.users.id — no separate PK
    email               VARCHAR(255) UNIQUE,
    display_name        VARCHAR(50) NOT NULL DEFAULT 'Aspirant',

    -- Auth
    email_verified      BOOLEAN DEFAULT FALSE,
    auth_provider       VARCHAR(20) DEFAULT 'email',
    google_id           VARCHAR(100) UNIQUE,

    -- Onboarding state
    onboarding_mode     onboarding_mode_enum NOT NULL DEFAULT 'DISCOVERY',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_step     SMALLINT DEFAULT 0,

    -- Metadata
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    last_active_at      TIMESTAMPTZ DEFAULT NOW(),
    is_deleted          BOOLEAN DEFAULT FALSE,
    deleted_at          TIMESTAMPTZ
);

-- ─── Step 3: user_profiles table ─────────────────────────────────────────────

CREATE TABLE user_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Pillar 1: Age
    date_of_birth       DATE NOT NULL,

    -- Pillar 2: Category
    category            category_enum NOT NULL,

    -- Pillar 3: Education
    highest_qualification qualification_level_enum NOT NULL,
    qualification_stream  VARCHAR(100),
    marks_percentage      NUMERIC(5,2),
    is_final_year         BOOLEAN DEFAULT FALSE,
    expected_completion   DATE,
    additional_qualifications TEXT[],

    -- Pillar 4: Nationality & Domicile
    nationality         nationality_enum DEFAULT 'INDIAN',
    domicile_state      state_code_enum NOT NULL,
    current_state       state_code_enum,
    exam_states         state_code_enum[],
    languages_known     VARCHAR(50)[],

    -- Pillar 5: Physical Standards
    gender              gender_enum NOT NULL,
    height_cm           SMALLINT,
    has_vision_correction BOOLEAN,

    -- Pillar 6: Special Criteria
    is_pwd              BOOLEAN DEFAULT FALSE,
    pwd_type            VARCHAR(50),
    pwd_percentage      SMALLINT,
    is_ex_serviceman    BOOLEAN DEFAULT FALSE,
    ex_service_type     VARCHAR(50),
    ex_service_years    SMALLINT,
    marital_status      marital_status_enum,
    is_government_employee BOOLEAN DEFAULT FALSE,
    has_sports_achievement BOOLEAN DEFAULT FALSE,
    sports_level        VARCHAR(20),

    -- Exam Preferences
    exam_categories     exam_category_enum[],

    -- Metadata
    profile_completeness SMALLINT DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (user_id)
);

-- ─── Step 4: notification_preferences table ───────────────────────────────────

CREATE TABLE notification_preferences (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Channels
    email_enabled       BOOLEAN DEFAULT TRUE,
    email_frequency     VARCHAR(20) DEFAULT 'WEEKLY',
    push_enabled        BOOLEAN DEFAULT TRUE,

    -- Alert types
    alert_new_eligible_exam     BOOLEAN DEFAULT TRUE,
    alert_deadline_approaching  BOOLEAN DEFAULT TRUE,
    alert_deadline_days_before  SMALLINT DEFAULT 7,
    alert_admit_card_released   BOOLEAN DEFAULT TRUE,
    alert_result_declared       BOOLEAN DEFAULT TRUE,
    alert_answer_key_released   BOOLEAN DEFAULT FALSE,

    -- Quiet hours
    quiet_hours_enabled         BOOLEAN DEFAULT TRUE,
    quiet_hours_start           TIME DEFAULT '22:00',
    quiet_hours_end             TIME DEFAULT '07:00',

    -- Language
    notification_language       VARCHAR(10) DEFAULT 'en',

    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (user_id)
);

-- ─── Step 5: exams table ──────────────────────────────────────────────────────

CREATE TABLE exams (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                VARCHAR(200) UNIQUE NOT NULL,
    name                VARCHAR(300) NOT NULL,
    short_name          VARCHAR(100),

    -- Classification
    category            exam_category_enum NOT NULL,
    conducting_body     VARCHAR(200) NOT NULL,
    level               exam_level_enum NOT NULL,
    state_code          state_code_enum,

    -- Vacancies
    total_vacancies     INTEGER,
    vacancies_by_category JSONB,
    -- Structure: { "general": 1200, "obc": 847, "sc": 423, "st": 212, "ews": 282, "pwd_locomotor": 45, "ex_servicemen": 85 }

    -- Key dates
    notification_date   DATE,
    application_start   DATE,
    application_end     DATE NOT NULL,
    exam_date           DATE,
    admit_card_date     DATE,
    result_date         DATE,

    -- Eligibility criteria (stored as explicit columns for query performance)
    min_age             SMALLINT,
    max_age_general     SMALLINT,
    max_age_obc         SMALLINT,
    max_age_sc_st       SMALLINT,
    max_age_ews         SMALLINT,
    max_age_pwd_general SMALLINT,
    max_age_pwd_obc     SMALLINT,
    max_age_pwd_sc_st   SMALLINT,
    max_age_ex_serviceman SMALLINT,
    age_cutoff_date     DATE,

    required_qualification qualification_level_enum NOT NULL,
    required_streams    TEXT[],
    min_marks_percentage NUMERIC(5,2),
    allows_final_year   BOOLEAN DEFAULT FALSE,
    nationality_requirement nationality_enum DEFAULT 'INDIAN',
    gender_restriction  gender_enum,
    physical_requirements JSONB,
    marital_status_requirement marital_status_enum,

    -- Source & verification
    official_notification_url TEXT NOT NULL,
    notification_verified     BOOLEAN DEFAULT FALSE,
    data_source               VARCHAR(50) DEFAULT 'MANUAL',
    is_active                 BOOLEAN DEFAULT TRUE,
    is_cancelled              BOOLEAN DEFAULT FALSE,
    cancellation_reason       TEXT,

    -- Fees
    application_fee_general   NUMERIC(8,2),
    application_fee_sc_st     NUMERIC(8,2),
    application_fee_pwd       NUMERIC(8,2),
    application_fee_women     NUMERIC(8,2),
    fee_payment_mode          TEXT[],

    -- Content
    description         TEXT,
    syllabus_summary    TEXT,
    selection_process   TEXT[],

    -- Metadata
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          UUID REFERENCES users(id),
    last_verified_at    TIMESTAMPTZ
);

-- ─── Step 6: tracked_exams table ─────────────────────────────────────────────

CREATE TABLE tracked_exams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    status          tracked_status_enum DEFAULT 'TRACKING',
    application_number  VARCHAR(100),
    roll_number         VARCHAR(100),
    marks_obtained      NUMERIC(7,2),
    rank_obtained       INTEGER,
    tracked_at      TIMESTAMPTZ DEFAULT NOW(),
    applied_at      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, exam_id)
);

-- ─── Step 7: notification_log table ──────────────────────────────────────────

CREATE TABLE notification_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_id         UUID REFERENCES exams(id) ON DELETE SET NULL,
    channel         VARCHAR(20) NOT NULL,  -- 'EMAIL' | 'PUSH'
    type            VARCHAR(50) NOT NULL,  -- 'NEW_EXAM' | 'DEADLINE' | 'ADMIT_CARD' | 'RESULT'
    subject         TEXT,
    resend_email_id VARCHAR(200),         -- Resend's message ID for webhook tracking
    status          VARCHAR(30) DEFAULT 'SENT',  -- 'SENT' | 'DELIVERED' | 'OPENED' | 'BOUNCED' | 'SPAM' | 'FAILED'
    sent_at         TIMESTAMPTZ DEFAULT NOW(),
    opened_at       TIMESTAMPTZ,
    clicked_at      TIMESTAMPTZ
);

-- ─── Step 8: scraper_log table (for PDF pipeline) ─────────────────────────────

CREATE TABLE scraper_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id   VARCHAR(200) NOT NULL,
    pdf_url     TEXT,
    exam_name   TEXT,
    status      VARCHAR(30) DEFAULT 'QUEUED',  -- 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED'
    error       TEXT,
    queued_at   TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- ─── Step 9: Indexes for query performance ────────────────────────────────────

-- Exams: the most-queried table
CREATE INDEX idx_exams_application_end ON exams(application_end) WHERE is_active = TRUE;
CREATE INDEX idx_exams_category ON exams(category) WHERE is_active = TRUE;
CREATE INDEX idx_exams_state ON exams(state_code);
CREATE INDEX idx_exams_qualification ON exams(required_qualification);
CREATE INDEX idx_exams_vacancies ON exams USING GIN(vacancies_by_category);
CREATE INDEX idx_exams_active_end ON exams(is_active, application_end, category);

-- User lookups
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_last_active ON users(last_active_at);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- Tracked exams lookups
CREATE INDEX idx_tracked_exams_user ON tracked_exams(user_id, status);
CREATE INDEX idx_tracked_exams_exam ON tracked_exams(exam_id);

-- Notification log
CREATE INDEX idx_notification_log_user ON notification_log(user_id, sent_at DESC);
CREATE INDEX idx_notification_log_resend ON notification_log(resend_email_id) WHERE resend_email_id IS NOT NULL;

-- ─── Step 10: Row Level Security (RLS) ──────────────────────────────────────
-- Supabase RLS: users can only access their own rows.
-- The backend uses the service-role key which bypasses RLS — this protects direct Supabase client calls.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can only read/write their own data
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own profile" ON user_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own notifications" ON notification_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own tracked exams" ON tracked_exams FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can read own notification log" ON notification_log FOR SELECT USING (auth.uid() = user_id);

-- Exams are public read (anyone can browse)
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exams are publicly readable" ON exams FOR SELECT USING (is_active = TRUE AND is_cancelled = FALSE);
