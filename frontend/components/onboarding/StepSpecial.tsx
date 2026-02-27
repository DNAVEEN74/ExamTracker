'use client'

import { useState } from 'react'

type Gender = 'MALE' | 'FEMALE' | 'THIRD_GENDER' | 'PREFER_NOT_TO_SAY'

interface StepSpecialProps {
    initialGender: Gender | null
    initialIsPwd: boolean
    initialPwdType: string
    initialIsExServiceman: boolean
    onNext: (data: {
        gender: Gender
        isPwd: boolean
        pwdType: string
        isExServiceman: boolean
    }) => void
}

const GENDERS: { id: Gender; label: string }[] = [
    { id: 'MALE', label: 'Male' },
    { id: 'FEMALE', label: 'Female' },
    { id: 'THIRD_GENDER', label: 'Third Gender' },
    { id: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
]

const PWD_TYPES = [
    'Locomotor Disability',
    'Visual Impairment',
    'Hearing Impairment',
    'Intellectual Disability',
    'Multiple Disabilities',
    'Other',
]

export default function StepSpecial({ initialGender, initialIsPwd, initialPwdType, initialIsExServiceman, onNext }: StepSpecialProps) {
    const [gender, setGender] = useState<Gender | null>(initialGender)
    const [isPwd, setIsPwd] = useState(initialIsPwd)
    const [pwdType, setPwdType] = useState(initialPwdType)
    const [isExServiceman, setIsExServiceman] = useState(initialIsExServiceman)

    function handleSubmit() {
        if (!gender) return
        onNext({ gender, isPwd, pwdType, isExServiceman })
    }

    return (
        <div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                A few more details
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>
                These unlock additional reservations and age relaxations you may qualify for.
            </p>

            {/* Gender */}
            <p className="section-label" style={{ marginBottom: 10 }}>Gender</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                {GENDERS.map(g => (
                    <div
                        key={g.id}
                        onClick={() => setGender(g.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && setGender(g.id)}
                        style={{
                            padding: '14px 16px', borderRadius: 'var(--radius-sm)', textAlign: 'center',
                            border: `2px solid ${gender === g.id ? 'var(--accent)' : 'var(--border)'}`,
                            background: gender === g.id ? 'var(--accent-light)' : 'var(--background-card)',
                            cursor: 'pointer', transition: 'all 0.15s ease',
                            fontWeight: gender === g.id ? 600 : 400,
                            fontSize: 14, color: 'var(--text-primary)',
                        }}
                    >
                        {g.label}
                    </div>
                ))}
            </div>

            {/* Women-specific note */}
            {gender === 'FEMALE' && (
                <div style={{
                    background: 'var(--success-light)', border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 16,
                    fontSize: 13, color: 'var(--success)',
                }}>
                    ✓ Women get 5-year age relaxation in many exams (SSC, Railway, Police). We&apos;ll factor this in.
                </div>
            )}

            {/* Person with Disability */}
            <div style={{ marginBottom: 16 }}>
                <label style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px', marginBottom: isPwd ? 10 : 0,
                    background: isPwd ? 'var(--accent-light)' : 'var(--background-card)',
                    border: `2px solid ${isPwd ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    transition: 'all 0.15s ease',
                }}>
                    <input
                        type="checkbox"
                        checked={isPwd}
                        onChange={e => setIsPwd(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
                            Person with Benchmark Disability (PwBD)
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            40%+ disability — 3% reservation + 10-year age relaxation
                        </div>
                    </div>
                </label>

                {isPwd && (
                    <select
                        className="input"
                        value={pwdType}
                        onChange={e => setPwdType(e.target.value)}
                    >
                        <option value="" disabled>Select disability type</option>
                        {PWD_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Ex-serviceman */}
            <label style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', marginBottom: 24,
                background: isExServiceman ? 'var(--accent-light)' : 'var(--background-card)',
                border: `2px solid ${isExServiceman ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                transition: 'all 0.15s ease',
            }}>
                <input
                    type="checkbox"
                    checked={isExServiceman}
                    onChange={e => setIsExServiceman(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
                <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
                        Ex-Serviceman / Defence Veteran
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        Special quota + age relaxation equal to service period
                    </div>
                </div>
            </label>

            <button
                className="btn btn-primary btn-full"
                onClick={handleSubmit}
                disabled={!gender}
            >
                Continue
            </button>
        </div>
    )
}
