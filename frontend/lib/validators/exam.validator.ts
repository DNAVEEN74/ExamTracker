import { z } from 'zod'

export const createExamSchema = z.object({
    name: z.string().min(3).max(300),
    short_name: z.string().max(100).optional(),
    category: z.enum(['SSC', 'RAILWAY', 'BANKING', 'UPSC_CIVIL', 'STATE_PSC', 'DEFENCE', 'POLICE', 'TEACHING', 'PSU', 'OTHER']),
    conducting_body: z.string().min(2).max(200),
    level: z.enum(['CENTRAL', 'STATE', 'PSU', 'DEFENCE', 'BANKING']),
    state_code: z.string().optional(),
    total_vacancies: z.number().int().positive().optional(),
    vacancies_by_category: z.record(z.string(), z.number()).optional(),
    notification_date: z.string().optional(),
    application_start: z.string().optional(),
    application_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    exam_date: z.string().optional(),
    admit_card_date: z.string().optional(),
    result_date: z.string().optional(),
    min_age: z.number().int().min(14).max(60).optional(),
    max_age_general: z.number().int().min(14).max(65).optional(),
    max_age_obc: z.number().int().optional(),
    max_age_sc_st: z.number().int().optional(),
    max_age_ews: z.number().int().optional(),
    max_age_pwd_general: z.number().int().optional(),
    max_age_pwd_obc: z.number().int().optional(),
    max_age_pwd_sc_st: z.number().int().optional(),
    max_age_ex_serviceman: z.number().int().optional(),
    age_cutoff_date: z.string().optional(),
    required_qualification: z.enum([
        'CLASS_10', 'CLASS_12', 'ITI', 'DIPLOMA',
        'GRADUATION', 'POST_GRADUATION', 'DOCTORATE',
        'PROFESSIONAL_CA', 'PROFESSIONAL_CS', 'PROFESSIONAL_ICWA',
        'PROFESSIONAL_LLB', 'PROFESSIONAL_MBBS', 'PROFESSIONAL_BED',
    ]),
    required_streams: z.array(z.string()).optional(),
    min_marks_percentage: z.number().min(0).max(100).optional(),
    allows_final_year: z.boolean().default(false),
    nationality_requirement: z.enum(['INDIAN', 'NEPAL_BHUTAN', 'PIO', 'OCI']).default('INDIAN'),
    gender_restriction: z.enum(['MALE', 'FEMALE', 'THIRD_GENDER', 'PREFER_NOT_TO_SAY']).optional(),
    physical_requirements: z.record(z.string(), z.unknown()).optional(),
    marital_status_requirement: z.enum(['UNMARRIED', 'MARRIED', 'DIVORCED', 'WIDOWED']).optional(),
    official_notification_url: z.string().url('Must be a valid URL'),
    application_fee_general: z.number().min(0).optional(),
    application_fee_sc_st: z.number().min(0).optional(),
    application_fee_pwd: z.number().min(0).optional(),
    application_fee_women: z.number().min(0).optional(),
    fee_payment_mode: z.array(z.string()).optional(),
    description: z.string().max(2000).optional(),
    syllabus_summary: z.string().optional(),
    selection_process: z.array(z.string()).optional(),
})

export const updateExamSchema = createExamSchema.partial()

export const trackExamSchema = z.object({
    exam_id: z.string().uuid('exam_id must be a valid UUID'),
})

export type CreateExamInput = z.infer<typeof createExamSchema>
export type UpdateExamInput = z.infer<typeof updateExamSchema>
export type TrackExamInput = z.infer<typeof trackExamSchema>
