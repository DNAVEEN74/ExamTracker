import db from '@/lib/db'
import type { NotificationPreferences } from '@/types/api'

/** Get notification preferences for a user */
export async function getPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
        const data = await db.notificationPreferences.findUnique({
            where: { user_id: userId }
        })
        return data as unknown as NotificationPreferences | null
    } catch (error: any) {
        throw new Error(`Failed to get preferences: ${error.message}`)
    }
}

/** Upsert notification preferences */
export async function upsertPreferences(
    userId: string,
    data: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
    try {
        const prefs = await db.notificationPreferences.upsert({
            where: { user_id: userId },
            update: { ...data } as any,
            create: { user_id: userId, ...data } as any
        })
        return prefs as unknown as NotificationPreferences
    } catch (error: any) {
        throw new Error(`Failed to upsert preferences: ${error.message}`)
    }
}

/** Disable email for user on hard bounce */
export async function disableEmailForUser(userId: string) {
    try {
        await db.notificationPreferences.update({
            where: { user_id: userId },
            data: { email_enabled: false }
        })
    } catch (error: any) {
        console.error('Failed to disable email:', error.message)
    }
}

/** Create the initial default notification preferences row after onboarding */
export async function createDefaultPreferences(userId: string) {
    try {
        await db.notificationPreferences.upsert({
            where: { user_id: userId },
            update: {}, // Don't overwrite if they exist
            create: {
                user_id: userId,
                email_enabled: true,
                email_frequency: 'WEEKLY',
                push_enabled: true,
                alert_new_eligible_exam: true,
                alert_deadline_approaching: true,
                alert_deadline_days_before: 7,
                alert_admit_card_released: true,
                alert_result_declared: true,
                alert_answer_key_released: false,
                quiet_hours_enabled: true,
                quiet_hours_start: '22:00',
                quiet_hours_end: '07:00',
                notification_language: 'en',
            }
        })
    } catch (error: any) {
        console.error('Failed to create default preferences:', error)
    }
}
