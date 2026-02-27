'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface StepCompleteProps {
    displayName: string
    onSave: () => Promise<void>
}

export default function StepComplete({ displayName, onSave }: StepCompleteProps) {
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [done, setDone] = useState(false)

    // Immediately trigger save + redirect
    useEffect(() => {
        async function finish() {
            setSaving(true)
            try {
                await onSave()
                setDone(true)
                setTimeout(() => router.push('/dashboard'), 1500)
            } finally {
                setSaving(false)
            }
        }
        finish()
    }, []) // eslint-disable-line

    return (
        <div style={{ textAlign: 'center', paddingTop: 40 }}>
            {/* Animated checkmark */}
            <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'var(--success-light)',
                border: '2px solid rgba(16,185,129,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
                fontSize: 32,
                animation: done ? 'none' : 'pulse 1s infinite',
            }}>
                {done ? '✓' : '⏳'}
            </div>

            <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                {done ? `You're all set, ${displayName}!` : 'Setting up your profile…'}
            </h2>

            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.65, marginBottom: 32 }}>
                {done
                    ? 'Taking you to your personalised exam dashboard.'
                    : 'Running eligibility checks across all central government exams…'}
            </p>

            {/* Loading steps  */}
            {!done && (
                <div style={{ textAlign: 'left', maxWidth: 300, margin: '0 auto' }}>
                    {[
                        'Checking age limits per category…',
                        'Matching qualification requirements…',
                        'Filtering by domicile & exam states…',
                        'Computing your vacancy counts…',
                    ].map((step, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 0',
                            opacity: saving ? 1 : 0.4,
                            fontSize: 14, color: 'var(--text-secondary)',
                        }}>
                            <span style={{ color: 'var(--accent)', fontSize: 16 }}>
                                {saving ? '⟳' : '○'}
                            </span>
                            {step}
                        </div>
                    ))}
                </div>
            )}

            {saving && (
                <button
                    className="btn btn-ghost"
                    onClick={() => router.push('/dashboard')}
                    style={{ marginTop: 24 }}
                >
                    Skip and go to dashboard →
                </button>
            )}
        </div>
    )
}
