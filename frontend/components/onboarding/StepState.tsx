'use client'

import { useState } from 'react'

const STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu and Kashmir', 'Other UTs'
]

interface StepStateProps {
    initialDomicile?: string | null
    initialExamStates?: string[]
    onNext: (data: { domicile: string; examStates: string[] }) => void
}

export default function StepState({ initialDomicile, initialExamStates, onNext }: StepStateProps) {
    const [domicile, setDomicile] = useState(initialDomicile || '')
    // Defaulting to empty array. We can make multi-state selection later, 
    // but for streamlined Apple UX, we'll auto-check that their domicile state is tracked.
    const [examStates, setExamStates] = useState<string[]>(initialExamStates || [])
    const [error, setError] = useState('')

    function handleNext() {
        if (!domicile) {
            setError('Please select your home state.')
            return
        }

        // Auto-select domicile state for exam tracking if they haven't explicitly chosen others
        const finalExamStates = examStates.length > 0 ? examStates : [domicile]

        setError('')
        onNext({ domicile, examStates: finalExamStates })
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h1 style={{ fontSize: 'clamp(32px, 7vw, 40px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 16, lineHeight: 1.15 }}>
                Where are<br />you from?
            </h1>
            <p style={{ color: '#a1a1a6', fontSize: 17, marginBottom: 32, lineHeight: 1.4 }}>
                Many state PSC exams heavily prefer local students (Domicile reservations).
            </p>

            <div style={{ flex: 1, paddingBottom: 24, overflowY: 'auto' }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#86868b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Home State (Domicile)
                </label>
                <div style={{ position: 'relative' }}>
                    <select
                        value={domicile}
                        onChange={(e) => {
                            setDomicile(e.target.value)
                            setError('')
                        }}
                        style={{
                            width: '100%', background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 16, padding: '18px 20px', fontSize: 17, color: domicile ? '#fff' : '#86868b',
                            outline: 'none', transition: 'border-color 0.2s', WebkitAppearance: 'none', cursor: 'pointer'
                        }}
                    >
                        <option value="" disabled>Select your state...</option>
                        {STATES.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    {/* Native dropdown chevron */}
                    <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#86868b' }}>
                        ▼
                    </div>
                </div>

                {domicile && !error && (
                    <div style={{
                        marginTop: 24,
                        background: 'rgba(10, 132, 255, 0.1)',
                        border: '1px solid rgba(10, 132, 255, 0.2)',
                        borderRadius: 16,
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        animation: 'fadeUp 0.3s ease-out'
                    }}>
                        <div style={{ marginTop: 2 }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a84ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                        </div>
                        <p style={{ fontSize: 14, color: '#e5e5ea', lineHeight: 1.5 }}>
                            We've automatically subscribed you to Central Government exams (SSC, UPSC, etc) and State exams for <strong style={{ color: '#fff' }}>{domicile}</strong>.
                        </p>
                    </div>
                )}

                {error && <p style={{ color: '#ff3b30', fontSize: 14, marginTop: 16, fontWeight: 500 }}>{error}</p>}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}} />

            <button
                onClick={handleNext}
                disabled={!domicile}
                style={{
                    background: !domicile ? '#2c2c2e' : '#fff',
                    color: !domicile ? '#86868b' : '#000',
                    padding: '16px', borderRadius: 980, fontSize: 17, fontWeight: 600,
                    border: 'none', cursor: !domicile ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s, color 0.2s', width: '100%', marginTop: 'auto', flexShrink: 0
                }}
            >
                Continue
            </button>
        </div>
    )
}
