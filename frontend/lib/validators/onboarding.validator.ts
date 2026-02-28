import { z } from 'zod'

export const onboardingModeSchema = z.object({
    mode: z.enum(['FOCUSED', 'DISCOVERY', 'VACANCY_AWARE', 'COMPREHENSIVE']),
})

const STATE_CODES = [
    'IN-AP', 'IN-AR', 'IN-AS', 'IN-BR', 'IN-CT', 'IN-GA', 'IN-GJ',
    'IN-HR', 'IN-HP', 'IN-JH', 'IN-KA', 'IN-KL', 'IN-MP', 'IN-MH',
    'IN-MN', 'IN-ML', 'IN-MZ', 'IN-NL', 'IN-OD', 'IN-PB', 'IN-RJ',
    'IN-SK', 'IN-TN', 'IN-TS', 'IN-TR', 'IN-UP', 'IN-UK', 'IN-WB',
    'IN-AN', 'IN-CH', 'IN-DN', 'IN-DL', 'IN-JK', 'IN-LA', 'IN-LD', 'IN-PY',
] as const

/** Partial profile update — all fields optional for incremental onboarding saves */
export const updateProfileSchema = z.object({
    display_name: z.string().min(1).max(50).optional(),
    date_of_birth: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format')
        .refine((val) => {
            const dob = new Date(val)
            const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
            return age >= 14 && age <= 60
        }, 'Date of birth must result in an age between 14 and 60')
        .optional(),
    category: z.enum(['GENERAL', 'OBC_NCL', 'OBC_CL', 'SC', 'ST', 'EWS']).optional(),
    highest_qualification: z.enum([
        'CLASS_10', 'CLASS_12', 'ITI', 'DIPLOMA',
        'GRADUATION', 'POST_GRADUATION', 'DOCTORATE',
        'PROFESSIONAL_CA', 'PROFESSIONAL_CS', 'PROFESSIONAL_ICWA',
        'PROFESSIONAL_LLB', 'PROFESSIONAL_MBBS', 'PROFESSIONAL_BED',
    ]).optional(),
    qualification_stream: z.string().max(100).optional(),
    marks_percentage: z.number().min(0).max(100).optional(),
    is_final_year: z.boolean().optional(),
    expected_completion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    additional_qualifications: z.array(z.string()).optional(),
    nationality: z.enum(['INDIAN', 'NEPAL_BHUTAN', 'PIO', 'OCI']).optional(),
    domicile_state: z.enum(STATE_CODES).optional(),
    current_state: z.enum(STATE_CODES).optional(),
    exam_states: z.array(z.enum(STATE_CODES)).optional(),
    languages_known: z.array(z.string()).optional(),
    exam_categories: z.array(
        z.enum(['SSC', 'RAILWAY', 'BANKING', 'UPSC_CIVIL', 'STATE_PSC', 'DEFENCE', 'POLICE', 'TEACHING', 'PSU', 'OTHER'])
    ).optional(),
    gender: z.enum(['MALE', 'FEMALE', 'THIRD_GENDER', 'PREFER_NOT_TO_SAY']).optional(),
    height_cm: z.number().int().min(100).max(250).optional(),
    has_vision_correction: z.boolean().optional(),
    is_pwd: z.boolean().optional(),
    pwd_type: z.string().optional(),
    pwd_percentage: z.number().int().min(0).max(100).optional(),
    is_ex_serviceman: z.boolean().optional(),
    ex_service_type: z.string().optional(),
    ex_service_years: z.number().int().min(0).max(40).optional(),
    marital_status: z.enum(['UNMARRIED', 'MARRIED', 'DIVORCED', 'WIDOWED']).optional(),
    is_government_employee: z.boolean().optional(),
    has_sports_achievement: z.boolean().optional(),
    sports_level: z.enum(['NATIONAL', 'STATE', 'DISTRICT']).optional(),
    onboarding_step: z.number().int().min(0).max(10).optional(),
})

export type OnboardingModeInput = z.infer<typeof onboardingModeSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
