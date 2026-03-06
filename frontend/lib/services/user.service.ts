import db from '@/lib/db'
import type { UserWithProfile, UserProfile } from '@/types/api'

/** Fetch a user row joined with their profile and notification preferences */
export async function getUserWithProfile(userId: string): Promise<UserWithProfile | null> {
    try {
        const user = await db.user.findUnique({
            where: { id: userId, is_deleted: false },
            include: {
                profile: true,
                preferences: true
            }
        })

        if (!user) return null

        const { profile, preferences, ...baseUser } = user
        return {
            user: baseUser as any,
            profile: profile as unknown as UserProfile | null,
            notification_preferences: preferences as any,
        }
    } catch (error) {
        return null
    }
}

/** Create the users table row after first OTP verification */
export async function createUser(data: {
    id: string
    email: string
    display_name?: string
}) {
    try {
        const user = await db.user.create({
            data: {
                id: data.id,
                email: data.email,
                display_name: data.display_name ?? 'Aspirant',
                email_verified: true,
                auth_provider: 'email',
            }
        })
        return user
    } catch (error: any) {
        throw new Error(`Failed to create user: ${error.message}`)
    }
}

/** Upsert user_profiles row incrementally (called after each onboarding step) */
export async function upsertProfile(
    userId: string,
    data: Partial<UserProfile> & { display_name?: string; onboarding_step?: number }
) {
    const { display_name, onboarding_step, ...profileData } = data

    try {
        const userUpdates: any = {}
        if (display_name !== undefined) userUpdates.display_name = display_name
        if (onboarding_step !== undefined) userUpdates.onboarding_step = onboarding_step

        if (Object.keys(userUpdates).length > 0) {
            await db.user.update({
                where: { id: userId },
                data: userUpdates
            })
        }

        if (Object.keys(profileData).length > 0) {
            await db.userProfile.upsert({
                where: { user_id: userId },
                update: profileData as any,
                create: { ...profileData, user_id: userId } as any
            })
        }
        return true
    } catch (error: any) {
        throw new Error(`Failed to upsert profile: ${error.message}`)
    }
}

/** Mark onboarding as complete in the users table */
export async function markOnboardingComplete(userId: string) {
    try {
        await db.user.update({
            where: { id: userId },
            data: {
                onboarding_completed: true,
                onboarding_step: 10,
            }
        })
        return true
    } catch (error: any) {
        throw new Error(`Failed to mark onboarding complete: ${error.message}`)
    }
}

/** Bump last_active_at to now */
export async function updateLastActive(userId: string) {
    try {
        await db.user.update({
            where: { id: userId },
            data: { last_active_at: new Date() }
        })
    } catch (error) {
        // Safe to ignore non-critical update errors
    }
}

/** Check whether a user row exists */
export async function userExists(userId: string): Promise<boolean> {
    try {
        const user = await db.user.findUnique({
            where: { id: userId, is_deleted: false },
            select: { id: true }
        })
        return !!user
    } catch (error) {
        return false
    }
}
