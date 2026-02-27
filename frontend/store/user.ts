import { create } from 'zustand'
import type { User, UserProfile, SubscriptionTier } from '@/types'

interface UserStore {
    user: User | null
    profile: UserProfile | null
    isLoading: boolean
    setUser: (user: User | null) => void
    setProfile: (profile: UserProfile | null) => void
    setLoading: (loading: boolean) => void
    isAuthenticated: () => boolean
    isPremium: () => boolean
    needsOnboarding: () => boolean
    clear: () => void
}

export const useUserStore = create<UserStore>((set, get) => ({
    user: null,
    profile: null,
    isLoading: true,
    setUser: (user) => set({ user }),
    setProfile: (profile) => set({ profile }),
    setLoading: (isLoading) => set({ isLoading }),
    isAuthenticated: () => !!get().user,
    isPremium: () => {
        const tier = get().user?.subscription_tier
        return tier === 'PREMIUM' || tier === 'PREMIUM_ANNUAL'
    },
    needsOnboarding: () => !get().user?.onboarding_completed,
    clear: () => set({ user: null, profile: null }),
}))
