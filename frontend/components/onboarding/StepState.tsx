'use client'

import { useState } from 'react'

const STATES = [
    { code: 'IN-AP', name: 'Andhra Pradesh' },
    { code: 'IN-AR', name: 'Arunachal Pradesh' },
    { code: 'IN-AS', name: 'Assam' },
    { code: 'IN-BR', name: 'Bihar' },
    { code: 'IN-CT', name: 'Chhattisgarh' },
    { code: 'IN-GA', name: 'Goa' },
    { code: 'IN-GJ', name: 'Gujarat' },
    { code: 'IN-HR', name: 'Haryana' },
    { code: 'IN-HP', name: 'Himachal Pradesh' },
    { code: 'IN-JH', name: 'Jharkhand' },
    { code: 'IN-KA', name: 'Karnataka' },
    { code: 'IN-KL', name: 'Kerala' },
    { code: 'IN-MP', name: 'Madhya Pradesh' },
    { code: 'IN-MH', name: 'Maharashtra' },
    { code: 'IN-MN', name: 'Manipur' },
    { code: 'IN-ML', name: 'Meghalaya' },
    { code: 'IN-MZ', name: 'Mizoram' },
    { code: 'IN-NL', name: 'Nagaland' },
    { code: 'IN-OD', name: 'Odisha' },
    { code: 'IN-PB', name: 'Punjab' },
    { code: 'IN-RJ', name: 'Rajasthan' },
    { code: 'IN-SK', name: 'Sikkim' },
    { code: 'IN-TN', name: 'Tamil Nadu' },
    { code: 'IN-TS', name: 'Telangana' },
    { code: 'IN-TR', name: 'Tripura' },
    { code: 'IN-UP', name: 'Uttar Pradesh' },
    { code: 'IN-UK', name: 'Uttarakhand' },
    { code: 'IN-WB', name: 'West Bengal' },
    { code: 'IN-AN', name: 'Andaman & Nicobar Islands' },
    { code: 'IN-CH', name: 'Chandigarh' },
    { code: 'IN-DL', name: 'Delhi' },
    { code: 'IN-JK', name: 'Jammu & Kashmir' },
    { code: 'IN-LA', name: 'Ladakh' },
    { code: 'IN-PY', name: 'Puducherry' },
]

interface StepStateProps {
    initialDomicile: string | null
    initialExamStates: string[]
    onNext: (data: { domicile: string; examStates: string[] }) => void
}

export default function StepState({ initialDomicile, initialExamStates, onNext }: StepStateProps) {
    const [domicile, setDomicile] = useState(initialDomicile ?? '')
    const [examStates, setExamStates] = useState<string[]>(initialExamStates)
    const [applyNationally, setApplyNationally] = useState(initialExamStates.length === 0)

    function toggleExamState(code: string) {
        setExamStates(prev =>
            prev.includes(code) ? prev.filter(s => s !== code) : [...prev, code]
        )
    }

    function handleSubmit() {
        if (!domicile) return
        onNext({ domicile, examStates: applyNationally ? [] : examStates })
    }

    return (
        <div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Which state are you from?
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>
                Domicile state is used for state-quota reservations and domicile-specific exams.
            </p>

            {/* Domicile state */}
            <p className="section-label" style={{ marginBottom: 8 }}>Home / Domicile State</p>
            <select
                className="input"
                value={domicile}
                onChange={e => setDomicile(e.target.value)}
                style={{ marginBottom: 24 }}
            >
                <option value="" disabled>Select your domicile state</option>
                {STATES.map(s => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                ))}
            </select>

            {/* Exam states */}
            <p className="section-label" style={{ marginBottom: 8 }}>Which states do you want to apply in?</p>

            <label style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', marginBottom: 12,
                background: applyNationally ? 'var(--accent-light)' : 'var(--background-card)',
                borderRadius: 'var(--radius-sm)',
                border: `2px solid ${applyNationally ? 'var(--accent)' : 'var(--border)'}`,
                cursor: 'pointer',
            }}>
                <input
                    type="checkbox"
                    checked={applyNationally}
                    onChange={e => { setApplyNationally(e.target.checked); if (e.target.checked) setExamStates([]) }}
                    style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
                <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
                        All India (Central government exams)
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        SSC, UPSC, IBPS, Railway — no state restriction
                    </div>
                </div>
            </label>

            {!applyNationally && (
                <div style={{
                    background: 'var(--background-card)', borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)', padding: '16px', marginBottom: 16,
                    maxHeight: 240, overflowY: 'auto',
                }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                        Select states you wish to apply for state-level exams:
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {STATES.map(s => (
                            <label key={s.code} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={examStates.includes(s.code)}
                                    onChange={() => toggleExamState(s.code)}
                                    style={{ accentColor: 'var(--accent)' }}
                                />
                                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{s.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <button
                className="btn btn-primary btn-full"
                onClick={handleSubmit}
                disabled={!domicile || (!applyNationally && examStates.length === 0)}
            >
                Continue
            </button>
        </div>
    )
}
