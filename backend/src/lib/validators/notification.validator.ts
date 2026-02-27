import { z } from 'zod'

export const updateNotificationPreferencesSchema = z.object({
    email_enabled: z.boolean().optional(),
    email_frequency: z.enum(['IMMEDIATE', 'DAILY', 'WEEKLY']).optional(),
    push_enabled: z.boolean().optional(),
    sms_enabled: z.boolean().optional(),
    alert_new_eligible_exam: z.boolean().optional(),
    alert_deadline_approaching: z.boolean().optional(),
    alert_deadline_days_before: z.number().int().min(1).max(30).optional(),
    alert_admit_card_released: z.boolean().optional(),
    alert_result_declared: z.boolean().optional(),
    alert_answer_key_released: z.boolean().optional(),
    quiet_hours_enabled: z.boolean().optional(),
    quiet_hours_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    quiet_hours_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    notification_language: z.enum(['en', 'hi']).optional(),
})

export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>
