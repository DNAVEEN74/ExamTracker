-- ═══════════════════════════════════════════════════════════════════════════════
-- ExamTracker — Eligibility Matching PostgreSQL Function
-- Run this AFTER 001_initial.sql in Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable pg_trgm for full-text exam search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index for name-based search using trigram similarity
CREATE INDEX IF NOT EXISTS idx_exams_name_trgm ON exams USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_exams_short_name_trgm ON exams USING GIN(short_name gin_trgm_ops);

-- ─── Core Eligibility Matching Function ──────────────────────────────────────
-- Returns all active exams a specific user is eligible for.
-- Called from the backend as: supabase.rpc('get_eligible_exams_for_user', { user_id: '...' })

CREATE OR REPLACE FUNCTION get_eligible_exams_for_user(user_id UUID)
RETURNS TABLE(
    id UUID,
    slug TEXT,
    name TEXT,
    short_name TEXT,
    category exam_category_enum,
    conducting_body TEXT,
    level exam_level_enum,
    state_code state_code_enum,
    total_vacancies INTEGER,
    vacancies_by_category JSONB,
    notification_date DATE,
    application_start DATE,
    application_end DATE,
    exam_date DATE,
    admit_card_date DATE,
    result_date DATE,
    min_age SMALLINT,
    max_age_general SMALLINT,
    max_age_obc SMALLINT,
    max_age_sc_st SMALLINT,
    max_age_ews SMALLINT,
    official_notification_url TEXT,
    notification_verified BOOLEAN,
    description TEXT,
    selection_process TEXT[],
    application_fee_general NUMERIC,
    application_fee_sc_st NUMERIC,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    -- Computed fields
    age_at_cutoff NUMERIC,
    vacancies_for_my_category INTEGER,
    eligibility_flag TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_dob DATE;
    v_category category_enum;
    v_qualification qualification_level_enum;
    v_stream TEXT;
    v_marks NUMERIC;
    v_is_final_year BOOLEAN;
    v_expected_completion DATE;
    v_nationality nationality_enum;
    v_domicile_state state_code_enum;
    v_exam_states state_code_enum[];
    v_gender gender_enum;
    v_height SMALLINT;
    v_is_pwd BOOLEAN;
    v_is_esm BOOLEAN;
    v_esm_years SMALLINT;
    v_exam_categories exam_category_enum[];
    v_onboarding_mode onboarding_mode_enum;
    v_additional_quals TEXT[];
BEGIN
    -- Fetch user profile data
    SELECT
        up.date_of_birth, up.category, up.highest_qualification, up.qualification_stream,
        up.marks_percentage, up.is_final_year, up.expected_completion,
        up.nationality, up.domicile_state, up.exam_states, up.gender, up.height_cm,
        up.is_pwd, up.is_ex_serviceman, up.ex_service_years, up.exam_categories,
        up.additional_qualifications, u.onboarding_mode
    INTO
        v_dob, v_category, v_qualification, v_stream,
        v_marks, v_is_final_year, v_expected_completion,
        v_nationality, v_domicile_state, v_exam_states, v_gender, v_height,
        v_is_pwd, v_is_esm, v_esm_years, v_exam_categories,
        v_additional_quals, v_onboarding_mode
    FROM user_profiles up
    JOIN users u ON u.id = up.user_id
    WHERE up.user_id = get_eligible_exams_for_user.user_id;

    IF NOT FOUND THEN
        RETURN;  -- No profile yet
    END IF;

    RETURN QUERY
    SELECT
        e.id, e.slug, e.name, e.short_name,
        e.category, e.conducting_body, e.level, e.state_code,
        e.total_vacancies, e.vacancies_by_category,
        e.notification_date, e.application_start, e.application_end,
        e.exam_date, e.admit_card_date, e.result_date,
        e.min_age, e.max_age_general, e.max_age_obc, e.max_age_sc_st, e.max_age_ews,
        e.official_notification_url, e.notification_verified,
        e.description, e.selection_process,
        e.application_fee_general, e.application_fee_sc_st,
        e.created_at, e.updated_at,

        -- Age at the exam's specific cutoff date
        EXTRACT(YEAR FROM AGE(
            COALESCE(e.age_cutoff_date, e.application_end),
            v_dob
        )) AS age_at_cutoff,

        -- Vacancies for the user's category
        CASE v_category
            WHEN 'OBC_NCL' THEN (e.vacancies_by_category->>'obc')::int
            WHEN 'SC'      THEN (e.vacancies_by_category->>'sc')::int
            WHEN 'ST'      THEN (e.vacancies_by_category->>'st')::int
            WHEN 'EWS'     THEN (e.vacancies_by_category->>'ews')::int
            ELSE           (e.vacancies_by_category->>'general')::int
        END AS vacancies_for_my_category,

        -- Eligibility flag
        'ELIGIBLE'::TEXT AS eligibility_flag

    FROM exams e
    WHERE
        -- Active exam with open window
        e.is_active = TRUE
        AND e.is_cancelled = FALSE
        AND e.application_end >= CURRENT_DATE

        -- Age: minimum
        AND (e.min_age IS NULL OR
            EXTRACT(YEAR FROM AGE(COALESCE(e.age_cutoff_date, e.application_end), v_dob)) >= e.min_age)

        -- Age: maximum (category-specific upper age limit)
        AND (
            EXTRACT(YEAR FROM AGE(COALESCE(e.age_cutoff_date, e.application_end), v_dob)) <=
            CASE v_category
                WHEN 'OBC_NCL' THEN COALESCE(e.max_age_obc,     e.max_age_general, 999)
                WHEN 'OBC_CL'  THEN COALESCE(e.max_age_general,                    999)
                WHEN 'SC'      THEN COALESCE(e.max_age_sc_st,   e.max_age_general, 999)
                WHEN 'ST'      THEN COALESCE(e.max_age_sc_st,   e.max_age_general, 999)
                WHEN 'EWS'     THEN COALESCE(e.max_age_ews,     e.max_age_general, 999)
                ELSE                COALESCE(e.max_age_general,                    999)
            END
        )

        -- Education: qualification level comparison via ordinal
        AND (
            CASE v_qualification
                WHEN 'CLASS_10'          THEN 1
                WHEN 'CLASS_12'          THEN 2
                WHEN 'ITI'               THEN 3
                WHEN 'DIPLOMA'           THEN 4
                WHEN 'GRADUATION'        THEN 5
                WHEN 'POST_GRADUATION'   THEN 6
                WHEN 'DOCTORATE'         THEN 7
                ELSE 5  -- Professional degrees treated as graduation-equivalent
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
        -- OR final-year students allowed to apply
        OR (v_is_final_year = TRUE AND e.allows_final_year = TRUE
            AND v_expected_completion <= COALESCE(e.exam_date, e.application_end + INTERVAL '6 months'))

        -- Stream requirement
        AND (
            e.required_streams IS NULL
            OR e.required_streams = '{}'
            OR v_stream = ANY(e.required_streams)
            OR (v_additional_quals IS NOT NULL AND v_additional_quals && e.required_streams)
        )

        -- Marks percentage minimum
        AND (e.min_marks_percentage IS NULL OR v_marks IS NULL OR v_marks >= e.min_marks_percentage)

        -- Nationality
        AND (e.nationality_requirement = 'INDIAN' AND v_nationality = 'INDIAN')

        -- Gender restriction
        AND (e.gender_restriction IS NULL OR e.gender_restriction = v_gender)

        -- State restriction (central OR domicile match OR user opted into that state)
        AND (
            e.state_code IS NULL
            OR e.state_code = v_domicile_state
            OR (v_exam_states IS NOT NULL AND e.state_code = ANY(v_exam_states))
        )

        -- Exam category interest filter
        AND (
            v_exam_categories IS NULL
            OR e.category = ANY(v_exam_categories)
        )

        -- VACANCY_AWARE mode: only show exams with actual vacancies for the user's category
        AND (
            v_onboarding_mode != 'VACANCY_AWARE'
            OR e.vacancies_by_category IS NULL
            OR (
                CASE v_category
                    WHEN 'OBC_NCL' THEN (e.vacancies_by_category->>'obc')::int
                    WHEN 'SC'      THEN (e.vacancies_by_category->>'sc')::int
                    WHEN 'ST'      THEN (e.vacancies_by_category->>'st')::int
                    WHEN 'EWS'     THEN (e.vacancies_by_category->>'ews')::int
                    ELSE           (e.vacancies_by_category->>'general')::int
                END > 0
            )
        )

    ORDER BY e.application_end ASC;

END;
$$;

-- Grant execute permission to authenticated users (Supabase handles this via service role)
GRANT EXECUTE ON FUNCTION get_eligible_exams_for_user(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_eligible_exams_for_user(UUID) TO authenticated;
