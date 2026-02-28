import { create } from 'zustand'
import type { User, UserProfile } from '@/types'

interface UserStore {
    user: User | null
    profile: UserProfile | null
    isLoading: boolean
    setUser: (user: User | null) => void
    setProfile: (profile: UserProfile | null) => void
    setLoading: (loading: boolean) => void
    isAuthenticated: () => boolean
    needsOnboarding: () => boolean
    clear: () => void
}

export const useUserStore = create<UserStore>((set, get) => ({
    user: null,
    profile: null,
    isLoading: true,
    setUser: (user: User | null) => set({ user }),
    setProfile: (profile: UserProfile | null) => set({ profile }),
    setLoading: (isLoading: boolean) => set({ isLoading }),
    isAuthenticated: () => !!get().user,
    needsOnboarding: () => !get().user?.onboarding_completed,
    clear: () => set({ user: null, profile: null }),
}))
