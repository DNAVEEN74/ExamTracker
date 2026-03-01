'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import OnboardingLayout from '@/components/onboarding/OnboardingLayout'
import StepEmail from '@/components/onboarding/StepEmail'
import StepName from '@/components/onboarding/StepName'
import StepMode from '@/components/onboarding/StepMode'
import StepDOB from '@/components/onboarding/StepDOB'
import StepCategory from '@/components/onboarding/StepCategory'
import StepQualification from '@/components/onboarding/StepQualification'
import StepState from '@/components/onboarding/StepState'
import StepExamCategories from '@/components/onboarding/StepExamCategories'
import StepSpecial from '@/components/onboarding/StepSpecial'
import StepComplete from '@/components/onboarding/StepComplete'

// ── Types ──────────────────────────────────────────────────────────────
type Mode = 'FOCUSED' | 'DISCOVERY' | 'VACANCY_AWARE'
type Category = 'GENERAL' | 'OBC_NCL' | 'OBC_CL' | 'SC' | 'ST' | 'EWS'
type QualLevel =
    | 'CLASS_10' | 'CLASS_12' | 'ITI' | 'DIPLOMA'
    | 'GRADUATION' | 'POST_GRADUATION' | 'DOCTORATE'
    | 'PROFESSIONAL_CA' | 'PROFESSIONAL_LLB' | 'PROFESSIONAL_MBBS' | 'PROFESSIONAL_BED'

export interface QualificationEntry {
    id: string
    qualification: QualLevel
    stream: string
    marks: number | null
    isFinalYear: boolean
}

type Gender = 'MALE' | 'FEMALE' | 'THIRD_GENDER' | 'PREFER_NOT_TO_SAY'
type ExamCat = string

interface FormData {
    // Step 0
    email: string
    // Step 1
    display_name: string
    // Step 2
    mode: Mode | null
    min_vacancy: number | null
    // Step 3
    date_of_birth: string
    // Step 4
    category: Category | null
    // Step 5
    qualifications: QualificationEntry[]
    // Step 6
    domicile_state: string | null
    exam_states: string[]
    // Step 7
    exam_categories: ExamCat[]
    // Step 8
    gender: Gender | null
    is_pwd: boolean
    pwd_type: string
    is_ex_serviceman: boolean
}

const STORAGE_KEY = 'examtracker_onboarding'

const INITIAL: FormData = {
    email: '', display_name: '', mode: null, min_vacancy: null, date_of_birth: '',
    category: null, qualifications: [],
    domicile_state: null, exam_states: [], exam_categories: [],
    gender: null, is_pwd: false, pwd_type: '', is_ex_serviceman: false,
}

function loadSaved(): { step: number; data: FormData } {
    if (typeof window === 'undefined') return { step: 0, data: INITIAL }
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) return JSON.parse(raw)
    } catch { }
    return { step: 0, data: INITIAL }
}

function save(step: number, data: FormData) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }))
    } catch { }
}

// ── Component ──────────────────────────────────────────────────────────
function RegisterForm() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [step, setStep] = useState(0)
    const [data, setData] = useState<FormData>(INITIAL)
    const [hydrated, setHydrated] = useState(false)

    // Hydrate from localStorage / URL param on mount
    useEffect(() => {
        const { step: savedStep, data: savedData } = loadSaved()
        const urlStep = parseInt(searchParams.get('step') ?? '', 10)
        setData(savedData)
        setStep(isNaN(urlStep) ? savedStep : urlStep)
        setHydrated(true)
    }, []) // eslint-disable-line

    function update(patch: Partial<FormData>) {
        setData(prev => ({ ...prev, ...patch }))
    }

    function goNext(patch?: Partial<FormData>) {
        const updated = patch ? { ...data, ...patch } : data
        const next = step + 1
        setData(updated)
        setStep(next)
        save(next, updated)
        // Update URL without full navigation
        window.history.replaceState(null, '', `/register?step=${next}`)
        window.scrollTo(0, 0)
    }

    function goBack() {
        const prev = Math.max(0, step - 1)
        setStep(prev)
        save(prev, data)
        window.history.replaceState(null, '', `/register?step=${prev}`)
        window.scrollTo(0, 0)
    }

    async function handleComplete() {
        // TODO: when Supabase is configured, persist to DB:
        // await supabase.from('user_profiles').upsert({ user_id: userId, ...data, onboarding_completed: true })
        // For now: clear localStorage and redirect
        try { localStorage.removeItem(STORAGE_KEY) } catch { }
        await new Promise(r => setTimeout(r, 1800)) // simulate API call
        router.push('/dashboard')
    }

    // Don't render until hydrated (prevents localStorage flash)
    if (!hydrated) {
        return (
            <div style={{ minHeight: '100dvh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0a84ff', opacity: 0.5 }} />
            </div>
        )
    }

    // ── Step 0: Email / Google ─────────────────────────────────────────
    if (step === 0) {
        return (
            <OnboardingLayout step={0}>
                <StepEmail onComplete={email => { update({ email }); goNext({ email }) }} />
            </OnboardingLayout>
        )
    }

    // ── Step 1: Name ────────────────────────────────────────────────────
    if (step === 1) {
        return (
            <OnboardingLayout step={1} onBack={goBack}>
                <StepName
                    initialValue={data.display_name}
                    onNext={name => goNext({ display_name: name })}
                />
            </OnboardingLayout>
        )
    }

    // ── Step 2: Mode ────────────────────────────────────────────────────
    if (step === 2) {
        return (
            <OnboardingLayout step={2} onBack={goBack}>
                <StepMode
                    initialValue={data.mode}
                    name={data.display_name || 'there'}
                    onNext={({ mode, minVacancy }) => goNext({ mode, min_vacancy: minVacancy })}
                />
            </OnboardingLayout>
        )
    }

    // ── Step 3: Date of Birth (Wow Moment) ──────────────────────────────
    if (step === 3) {
        return (
            <OnboardingLayout step={3} onBack={goBack}>
                <StepDOB
                    initialValue={data.date_of_birth}
                    onNext={dob => goNext({ date_of_birth: dob })}
                />
            </OnboardingLayout>
        )
    }

    // ── Step 4: Category ────────────────────────────────────────────────
    if (step === 4) {
        return (
            <OnboardingLayout step={4} onBack={goBack}>
                <StepCategory
                    initialValue={data.category}
                    onNext={category => goNext({ category })}
                />
            </OnboardingLayout>
        )
    }

    // ── Step 5: Qualification ───────────────────────────────────────────
    if (step === 5) {
        return (
            <OnboardingLayout step={5} onBack={goBack}>
                <StepQualification
                    initialValues={data.qualifications}
                    onNext={quals => goNext({ qualifications: quals })}
                />
            </OnboardingLayout>
        )
    }

    // ── Step 6: State ───────────────────────────────────────────────────
    if (step === 6) {
        return (
            <OnboardingLayout step={6} onBack={goBack}>
                <StepState
                    initialDomicile={data.domicile_state}
                    initialExamStates={data.exam_states}
                    onNext={s => goNext({ domicile_state: s.domicile, exam_states: s.examStates })}
                />
            </OnboardingLayout>
        )
    }

    // ── Step 7: Exam Categories ─────────────────────────────────────────
    if (step === 7) {
        return (
            <OnboardingLayout step={7} onBack={goBack}>
                <StepExamCategories
                    mode={data.mode}
                    initialValue={data.exam_categories as ExamCat[]}
                    onNext={cats => goNext({ exam_categories: cats })}
                />
            </OnboardingLayout>
        )
    }

    // ── Step 8: Gender & Special ────────────────────────────────────────
    if (step === 8) {
        return (
            <OnboardingLayout step={8} onBack={goBack}>
                <StepSpecial
                    initialGender={data.gender}
                    initialIsPwd={data.is_pwd}
                    initialPwdType={data.pwd_type}
                    initialIsExServiceman={data.is_ex_serviceman}
                    onNext={s => goNext({
                        gender: s.gender,
                        is_pwd: s.isPwd,
                        pwd_type: s.pwdType,
                        is_ex_serviceman: s.isExServiceman,
                    })}
                />
            </OnboardingLayout>
        )
    }

    // ── Step 9: Complete ────────────────────────────────────────────────
    return (
        <OnboardingLayout step={9}>
            <StepComplete
                displayName={data.display_name || 'there'}
                onSave={handleComplete}
            />
        </OnboardingLayout>
    )
}

// ── Component ──────────────────────────────────────────────────────────
export default function RegisterPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#000' }} />}>
            <RegisterForm />
        </Suspense>
    )
}
