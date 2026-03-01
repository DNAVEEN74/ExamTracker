'use client'

import { useState } from 'react'

interface StepDOBProps {
    initialValue?: string
    onNext: (dob: string) => void
}

export default function StepDOB({ initialValue = '', onNext }: StepDOBProps) {
    const [dob, setDob] = useState(initialValue)
    const [error, setError] = useState('')

    function handleNext() {
        if (!dob) {
            setError('Please select a date.')
            return
        }

        const date = new Date(dob)
        const ageDifMs = Date.now() - date.getTime()
        const ageDate = new Date(ageDifMs)
        const age = Math.abs(ageDate.getUTCFullYear() - 1970)

        if (age < 15 || age > 60) {
            setError('Age must be between 15 and 60 for most exams.')
            return
        }

        setError('')
        onNext(dob)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h1 style={{ fontSize: 'clamp(32px, 7vw, 40px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 16, lineHeight: 1.15 }}>
                When were<br />you born?
            </h1>
            <p style={{ color: '#a1a1a6', fontSize: 17, marginBottom: 40, lineHeight: 1.4 }}>
                We use this to calculate your exact age limits on cutoff dates.
            </p>

            <div style={{ position: 'relative' }}>
                {/* Native date picker styled like an Apple input */}
                <input
                    type="date"
                    value={dob}
                    onChange={e => { setDob(e.target.value); setError('') }}
                    onKeyDown={e => e.key === 'Enter' && dob && handleNext()}
                    style={{
                        width: '100%',
                        background: '#1c1c1e',
                        border: `1px solid ${error ? '#ff3b30' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 16,
                        padding: '18px 20px',
                        fontSize: 17,
                        color: dob ? '#fff' : '#86868b',
                        fontFamily: "inherit",
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        WebkitAppearance: 'none'
                    }}
                    onFocus={e => e.target.style.borderColor = '#0a84ff'}
                    onBlur={e => e.target.style.borderColor = error ? '#ff3b30' : 'rgba(255,255,255,0.1)'}
                />

                {/* Instant Feedback "Wow" Moment embedded right below */}
                {dob && !error && (
                    <div style={{
                        marginTop: 20,
                        background: 'rgba(50, 215, 75, 0.15)',
                        border: '1px solid rgba(50, 215, 75, 0.3)',
                        borderRadius: 16,
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        animation: 'fadeUp 0.3s ease-out'
                    }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 10, background: '#32d74b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <p style={{ fontSize: 14, color: '#32d74b', fontWeight: 500, lineHeight: 1.4 }}>
                            Perfect. We will dynamically calculate your age as of every exam's cutoff date.
                        </p>
                    </div>
                )}

                {error && <p style={{ color: '#ff3b30', fontSize: 14, marginTop: 16, fontWeight: 500 }}>{error}</p>}
            </div>

            {/* Injected CSS for the keyframe */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                /* Removes the native calendar icon in some browsers to keep it clean */
                input[type="date"]::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                    opacity: 0.5;
                    cursor: pointer;
                }
            `}} />

            <div style={{ flex: 1, minHeight: 24 }} />

            <button
                onClick={handleNext}
                disabled={!dob}
                style={{
                    background: !dob ? '#2c2c2e' : '#fff',
                    color: !dob ? '#86868b' : '#000',
                    padding: '16px',
                    borderRadius: 980,
                    fontSize: 17,
                    fontWeight: 600,
                    border: 'none',
                    cursor: !dob ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s, color 0.2s',
                    width: '100%',
                    flexShrink: 0
                }}
            >
                Continue
            </button>
        </div>
    )
}
