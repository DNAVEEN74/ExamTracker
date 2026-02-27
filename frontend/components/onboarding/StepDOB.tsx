'use client'

import { useState } from 'react'

interface StepDOBProps {
    initialValue: string
    onNext: (dob: string) => void
}

function computeAge(dob: string): number {
    if (!dob) return 0
    const today = new Date()
    const birth = new Date(dob)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
}

function getEligibleCount(age: number): { count: number; examples: string } {
    if (age < 18) return { count: 0, examples: 'You must be at least 18 to apply for government exams.' }
    if (age <= 25) return { count: 67, examples: 'SSC CGL, IBPS PO, Railway NTPC, RRB Group D, UPSC CSE, and 62 more.' }
    if (age <= 30) return { count: 52, examples: 'SSC CGL, IBPS PO, Railway NTPC, SSC CHSL, and 48 more.' }
    if (age <= 35) return { count: 38, examples: 'UPSC CSE, State PSC, SSC MTS, Teaching exams, and 34 more.' }
    if (age <= 40) return { count: 24, examples: 'Teaching & PSU exams, some State PSC roles, and 20 more.' }
    return { count: 8, examples: 'Select State teaching positions and PSU technical roles.' }
}

// Min DOB = 18 years ago, Max DOB = 50 years ago
const today = new Date()
const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().split('T')[0]
const minDate = new Date(today.getFullYear() - 50, today.getMonth(), today.getDate()).toISOString().split('T')[0]

export default function StepDOB({ initialValue, onNext }: StepDOBProps) {
    const defaultDOB = initialValue || `${today.getFullYear() - 25}-01-01`
    const [dob, setDob] = useState(defaultDOB)
    const age = computeAge(dob)
    const { count, examples } = getEligibleCount(age)

    return (
        <div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                What&apos;s your date of birth?
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
                Age limits vary by exam and category. This determines which exams you&apos;re eligible for.
            </p>

            <input
                className="input"
                type="date"
                value={dob}
                min={minDate}
                max={maxDate}
                onChange={e => setDob(e.target.value)}
                autoFocus
                style={{ marginBottom: 16, colorScheme: 'dark' }}
            />

            {/* The Wow Moment — instant feedback */}
            {dob && age >= 18 && (
                <div className="wow-card">
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                        ✓ You are {age} years old — eligible for {count} government exams right now
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>
                        {examples}
                    </div>
                </div>
            )}

            {dob && age < 18 && (
                <div style={{
                    background: 'var(--warning-light)', border: '1px solid rgba(245,158,11,0.25)',
                    borderRadius: 'var(--radius)', padding: 16, marginBottom: 16,
                    color: 'var(--warning)', fontSize: 14,
                }}>
                    ⚠ You must be at least 18 years old to apply for government exams.
                </div>
            )}

            <button
                className="btn btn-primary btn-full"
                onClick={() => onNext(dob)}
                disabled={!dob || age < 18}
                style={{ marginTop: 16 }}
            >
                Continue
            </button>

            <p className="text-xs" style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 12 }}>
                Your age is only used for eligibility matching. It&apos;s never shared.
            </p>
        </div>
    )
}
