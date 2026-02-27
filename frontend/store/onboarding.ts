import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
    OnboardingMode,
    Category,
    QualificationLevel,
    Gender,
    StateCode,
    ExamCategory,
} from '@/types'

interface OnboardingStore {
    // Current step (0–9)
    step: number
    // Step data
    mode: OnboardingMode | null
    display_name: string
    date_of_birth: string
    category: Category | null
    highest_qualification: QualificationLevel | null
    qualification_stream: string | null
    marks_percentage: number | null
    is_final_year: boolean
    domicile_state: StateCode | null
    exam_states: StateCode[]
    exam_categories: ExamCategory[]
    gender: Gender | null
    is_pwd: boolean
    pwd_type: string | null
    pwd_percentage: number | null
    is_ex_serviceman: boolean
    ex_service_years: number | null
    // Actions
    setStep: (step: number) => void
    nextStep: () => void
    prevStep: () => void
    setMode: (mode: OnboardingMode) => void
    setDisplayName: (name: string) => void
    setDateOfBirth: (dob: string) => void
    setCategory: (category: Category) => void
    setQualification: (level: QualificationLevel, stream?: string) => void
    setMarksPercentage: (pct: number | null) => void
    setIsFinalYear: (val: boolean) => void
    setDomicileState: (state: StateCode) => void
    setExamStates: (states: StateCode[]) => void
    setExamCategories: (categories: ExamCategory[]) => void
    setGender: (gender: Gender) => void
    setIsPwd: (val: boolean, type?: string, pct?: number) => void
    setIsExServiceman: (val: boolean, years?: number) => void
    reset: () => void
}

const initialState = {
    step: 0,
    mode: null,
    display_name: '',
    date_of_birth: '',
    category: null,
    highest_qualification: null,
    qualification_stream: null,
    marks_percentage: null,
    is_final_year: false,
    domicile_state: null,
    exam_states: [] as StateCode[],
    exam_categories: [] as ExamCategory[],
    gender: null,
    is_pwd: false,
    pwd_type: null,
    pwd_percentage: null,
    is_ex_serviceman: false,
    ex_service_years: null,
}

export const useOnboardingStore = create<OnboardingStore>()(
    persist(
        (set) => ({
            ...initialState,
            setStep: (step) => set({ step }),
            nextStep: () => set((s) => ({ step: s.step + 1 })),
            prevStep: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
            setMode: (mode) => set({ mode }),
            setDisplayName: (display_name) => set({ display_name }),
            setDateOfBirth: (date_of_birth) => set({ date_of_birth }),
            setCategory: (category) => set({ category }),
            setQualification: (highest_qualification, qualification_stream) =>
                set({ highest_qualification, qualification_stream: qualification_stream ?? null }),
            setMarksPercentage: (marks_percentage) => set({ marks_percentage }),
            setIsFinalYear: (is_final_year) => set({ is_final_year }),
            setDomicileState: (domicile_state) => set({ domicile_state }),
            setExamStates: (exam_states) => set({ exam_states }),
            setExamCategories: (exam_categories) => set({ exam_categories }),
            setGender: (gender) => set({ gender }),
            setIsPwd: (is_pwd, pwd_type, pwd_percentage) =>
                set({ is_pwd, pwd_type: pwd_type ?? null, pwd_percentage: pwd_percentage ?? null }),
            setIsExServiceman: (is_ex_serviceman, ex_service_years) =>
                set({ is_ex_serviceman, ex_service_years: ex_service_years ?? null }),
            reset: () => set(initialState),
        }),
        {
            name: 'examtracker-onboarding', // persisted to localStorage — user can resume
        }
    )
)
