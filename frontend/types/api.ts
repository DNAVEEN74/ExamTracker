// ─── Enum Types (match PostgreSQL ENUMs exactly) ─────────────────────────────

export type OnboardingMode = 'FOCUSED' | 'DISCOVERY' | 'VACANCY_AWARE' | 'COMPREHENSIVE'
export type Category = 'GENERAL' | 'OBC_NCL' | 'OBC_CL' | 'SC' | 'ST' | 'EWS'
export type QualificationLevel =
    | 'CLASS_10' | 'CLASS_12' | 'ITI' | 'DIPLOMA'
    | 'GRADUATION' | 'POST_GRADUATION' | 'DOCTORATE'
    | 'PROFESSIONAL_CA' | 'PROFESSIONAL_CS' | 'PROFESSIONAL_ICWA'
    | 'PROFESSIONAL_LLB' | 'PROFESSIONAL_MBBS' | 'PROFESSIONAL_BED'
export type Nationality = 'INDIAN' | 'NEPAL_BHUTAN' | 'PIO' | 'OCI'
export type Gender = 'MALE' | 'FEMALE' | 'THIRD_GENDER' | 'PREFER_NOT_TO_SAY'
export type MaritalStatus = 'UNMARRIED' | 'MARRIED' | 'DIVORCED' | 'WIDOWED'
export type ExamCategory =
    | 'SSC' | 'RAILWAY' | 'BANKING' | 'UPSC_CIVIL'
    | 'STATE_PSC' | 'DEFENCE' | 'POLICE' | 'TEACHING' | 'PSU' | 'OTHER'
export type ExamLevel = 'CENTRAL' | 'STATE' | 'PSU' | 'DEFENCE' | 'BANKING'
export type TrackedStatus =
    | 'TRACKING' | 'APPLIED' | 'APPEARED' | 'RESULT_AWAITED'
    | 'SELECTED' | 'NOT_SELECTED' | 'WITHDRAWN'
export type EligibilityFlag = 'ELIGIBLE' | 'LIKELY_ELIGIBLE' | 'CHECK_REQUIRED' | 'INELIGIBLE'
export type ExamStatus = 'DRAFT' | 'NEEDS_REVIEW' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED'

export type StateCode =
    | 'IN-AP' | 'IN-AR' | 'IN-AS' | 'IN-BR' | 'IN-CT' | 'IN-GA' | 'IN-GJ'
    | 'IN-HR' | 'IN-HP' | 'IN-JH' | 'IN-KA' | 'IN-KL' | 'IN-MP' | 'IN-MH'
    | 'IN-MN' | 'IN-ML' | 'IN-MZ' | 'IN-NL' | 'IN-OD' | 'IN-PB' | 'IN-RJ'
    | 'IN-SK' | 'IN-TN' | 'IN-TS' | 'IN-TR' | 'IN-UP' | 'IN-UK' | 'IN-WB'
    | 'IN-AN' | 'IN-CH' | 'IN-DN' | 'IN-DL' | 'IN-JK' | 'IN-LA' | 'IN-LD' | 'IN-PY'

// ─── Database Table Types ─────────────────────────────────────────────────────

export interface User {
    id: string
    email: string | null
    display_name: string
    email_verified: boolean
    auth_provider: 'email' | 'google'
    google_id: string | null
    onboarding_mode: OnboardingMode
    onboarding_completed: boolean
    onboarding_step: number
    created_at: string
    updated_at: string
    last_active_at: string
    is_deleted: boolean
    deleted_at: string | null
}

export interface UserProfile {
    id: string
    user_id: string
    date_of_birth: string
    category: Category
    highest_qualification: QualificationLevel
    qualification_stream: string | null
    marks_percentage: number | null
    is_final_year: boolean
    expected_completion: string | null
    additional_qualifications: string[] | null
    nationality: Nationality
    domicile_state: StateCode
    current_state: StateCode | null
    exam_states: StateCode[]
    languages_known: string[] | null
    gender: Gender
    height_cm: number | null
    has_vision_correction: boolean | null
    is_pwd: boolean
    pwd_type: string | null
    pwd_percentage: number | null
    is_ex_serviceman: boolean
    ex_service_type: string | null
    ex_service_years: number | null
    marital_status: MaritalStatus | null
    is_government_employee: boolean
    has_sports_achievement: boolean
    sports_level: string | null
    exam_categories: ExamCategory[]
    profile_completeness: number
    created_at: string
    updated_at: string
}

export interface NotificationPreferences {
    id: string
    user_id: string
    email_enabled: boolean
    email_frequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY'
    push_enabled: boolean
    alert_new_eligible_exam: boolean
    alert_deadline_approaching: boolean
    alert_deadline_days_before: number
    alert_admit_card_released: boolean
    alert_result_declared: boolean
    alert_answer_key_released: boolean
    quiet_hours_enabled: boolean
    quiet_hours_start: string
    quiet_hours_end: string
    notification_language: 'en' | 'hi'
    created_at: string
    updated_at: string
}

export interface Exam {
    id: string
    slug: string
    name: string
    short_name: string | null
    category: ExamCategory
    conducting_body: string
    level: ExamLevel
    state_code: StateCode | null
    total_vacancies: number | null
    vacancies_by_category: Record<string, number> | null
    notification_date: string | null
    application_start: string | null
    application_end: string
    exam_date: string | null
    admit_card_date: string | null
    result_date: string | null
    min_age: number | null
    max_age_general: number | null
    max_age_obc: number | null
    max_age_sc_st: number | null
    max_age_ews: number | null
    max_age_pwd_general: number | null
    max_age_pwd_obc: number | null
    max_age_pwd_sc_st: number | null
    max_age_ex_serviceman: number | null
    age_cutoff_date: string | null
    required_qualification: QualificationLevel
    required_streams: string[] | null
    min_marks_percentage: number | null
    allows_final_year: boolean
    nationality_requirement: Nationality
    gender_restriction: Gender | null
    physical_requirements: Record<string, unknown> | null
    marital_status_requirement: MaritalStatus | null
    official_notification_url: string
    notification_verified: boolean
    data_source: 'MANUAL' | 'SCRAPER' | 'RSS' | 'API'
    is_active: boolean
    is_cancelled: boolean
    cancellation_reason: string | null
    application_fee_general: number | null
    application_fee_sc_st: number | null
    application_fee_pwd: number | null
    application_fee_women: number | null
    fee_payment_mode: string[] | null
    description: string | null
    syllabus_summary: string | null
    selection_process: string[] | null
    created_at: string
    updated_at: string
    created_by: string | null
    last_verified_at: string | null
    // Virtual fields
    age_at_cutoff?: number
    vacancies_for_my_category?: number
    eligibility_flag?: EligibilityFlag
}

export interface TrackedExam {
    id: string
    user_id: string
    exam_id: string
    status: TrackedStatus
    application_number: string | null
    roll_number: string | null
    marks_obtained: number | null
    rank_obtained: number | null
    tracked_at: string
    applied_at: string | null
    updated_at: string
    exam?: Exam
}

// ─── API Response Shapes ──────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
    success: boolean
    data?: T
    error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

export interface UserWithProfile {
    user: User
    profile: UserProfile | null
    notification_preferences: NotificationPreferences | null
}

export interface DashboardData {
    eligible_exams: Exam[]
    closing_soon: Exam[]
    newly_opened: Exam[]
    total_tracked: number
    upcoming_deadlines: TrackedExam[]
}

export interface EligibilitySummary {
    total_eligible: number
    closing_soon: number
    newly_opened: number
}
