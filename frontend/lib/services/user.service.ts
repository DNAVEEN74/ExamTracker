import { supabaseAdmin as supabase } from '@/lib/supabase/admin'
import type { UserWithProfile, UserProfile } from '@/types/api'

/** Fetch a user row joined with their profile and notification preferences */
export async function getUserWithProfile(userId: string): Promise<UserWithProfile | null> {
    const { data: user, error: userErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('is_deleted', false)
        .single()

    if (userErr || !user) return null

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

    const { data: notifPrefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

    return {
        user,
        profile: profile ?? null,
        notification_preferences: notifPrefs ?? null,
    }
}

/** Create the users table row after first OTP verification */
export async function createUser(data: {
    id: string
    email: string
    display_name?: string
}) {
    const { data: user, error } = await supabase
        .from('users')
        .insert({
            id: data.id,
            email: data.email,
            display_name: data.display_name ?? 'Aspirant',
            email_verified: true,
            auth_provider: 'email',
        })
        .select()
        .single()

    if (error) throw new Error(`Failed to create user: ${error.message}`)
    return user
}

/** Upsert user_profiles row incrementally (called after each onboarding step) */
export async function upsertProfile(
    userId: string,
    data: Partial<UserProfile> & { display_name?: string; onboarding_step?: number }
) {
    const { display_name, onboarding_step, ...profileData } = data

    const userUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (display_name !== undefined) userUpdates.display_name = display_name
    if (onboarding_step !== undefined) userUpdates.onboarding_step = onboarding_step

    if (Object.keys(userUpdates).length > 1) {
        await supabase.from('users').update(userUpdates).eq('id', userId)
    }

    if (Object.keys(profileData).length > 0) {
        const { error } = await supabase
            .from('user_profiles')
            .upsert(
                { user_id: userId, ...profileData, updated_at: new Date().toISOString() },
                { onConflict: 'user_id' }
            )
        if (error) throw new Error(`Failed to upsert profile: ${error.message}`)
    }

    return true
}

/** Mark onboarding as complete in the users table */
export async function markOnboardingComplete(userId: string) {
    const { error } = await supabase
        .from('users')
        .update({
            onboarding_completed: true,
            onboarding_step: 10,
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

    if (error) throw new Error(`Failed to mark onboarding complete: ${error.message}`)
    return true
}

/** Bump last_active_at to now */
export async function updateLastActive(userId: string) {
    await supabase
        .from('users')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', userId)
}

/** Check whether a user row exists for this Supabase auth id */
export async function userExists(userId: string): Promise<boolean> {
    const { data } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .eq('is_deleted', false)
        .maybeSingle()
    return !!data
}
