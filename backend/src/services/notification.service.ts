import { Resend } from 'resend'
import { supabase } from '../config/supabase'
import { env } from '../config/env'
import type { NotificationPreferences } from '../types'

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

/** Send a transactional email via Resend */
export async function sendEmail(params: {
    to: string
    subject: string
    html: string
    from?: string
    tags?: Record<string, string>
}): Promise<{ id: string } | null> {
    if (!resend) {
        console.warn('⚠️  RESEND_API_KEY not set — email not sent (dev mode)')
        return null
    }

    const { data, error } = await resend.emails.send({
        from: params.from ?? env.RESEND_FROM_ALERTS,
        to: params.to,
        subject: params.subject,
        html: params.html,
    })

    if (error) {
        console.error('Resend send error:', error)
        throw new Error(`Email send failed: ${error.message}`)
    }

    return { id: data!.id }
}

/** Get notification preferences for a user */
export async function getPreferences(userId: string): Promise<NotificationPreferences | null> {
    const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

    if (error) throw new Error(`Failed to get preferences: ${error.message}`)
    return data
}

/** Upsert notification preferences */
export async function upsertPreferences(
    userId: string,
    data: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
    const { data: prefs, error } = await supabase
        .from('notification_preferences')
        .upsert(
            { user_id: userId, ...data, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
        )
        .select()
        .single()

    if (error) throw new Error(`Failed to upsert preferences: ${error.message}`)
    return prefs
}

/** Record WhatsApp opt-in with timestamp and IP (DPDPA 2023 compliance) */
export async function recordWhatsAppConsent(userId: string, ip: string) {
    const consentTimestamp = new Date().toISOString()

    const { error } = await supabase
        .from('notification_preferences')
        .upsert(
            {
                user_id: userId,
                whatsapp_enabled: true,
                whatsapp_consent_timestamp: consentTimestamp,
                whatsapp_consent_ip: ip,
                updated_at: consentTimestamp,
            },
            { onConflict: 'user_id' }
        )

    if (error) throw new Error(`Failed to record WhatsApp consent: ${error.message}`)
    return { whatsapp_enabled: true, consent_timestamp: consentTimestamp }
}

/** Get paginated notification history */
export async function getNotificationHistory(
    userId: string,
    page: number,
    limit: number
) {
    const offset = (page - 1) * limit

    const { data, count, error } = await supabase
        .from('notification_log')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('sent_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (error) {
        // notification_log table may not be created yet
        if (error.code === '42P01') return { logs: [], total: 0 }
        throw new Error(`Failed to get notification history: ${error.message}`)
    }

    return { logs: data ?? [], total: count ?? 0 }
}

/** Update notification_log status from Resend webhook events */
export async function updateNotificationLogFromWebhook(
    emailId: string,
    update: {
        status?: string
        opened_at?: string
        clicked_at?: string
    }
) {
    await supabase
        .from('notification_log')
        .update(update)
        .eq('resend_email_id', emailId)
}

/** Disable email for user on hard bounce */
export async function disableEmailForUser(userId: string) {
    await supabase
        .from('notification_preferences')
        .update({ email_enabled: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
}

/** Create the initial default notification preferences row after onboarding */
export async function createDefaultPreferences(userId: string) {
    const { error } = await supabase
        .from('notification_preferences')
        .upsert(
            {
                user_id: userId,
                email_enabled: true,
                email_frequency: 'WEEKLY',
                push_enabled: true,
                whatsapp_enabled: false,
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
            },
            { onConflict: 'user_id', ignoreDuplicates: true }
        )

    if (error) console.error('Failed to create default preferences:', error)
}
