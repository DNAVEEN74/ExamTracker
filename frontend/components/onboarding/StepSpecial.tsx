'use client'

import { useState } from 'react'

type Gender = 'MALE' | 'FEMALE' | 'THIRD_GENDER' | 'PREFER_NOT_TO_SAY'

interface StepSpecialProps {
    initialGender?: Gender | null
    initialIsPwd?: boolean
    initialPwdType?: string
    initialIsExServiceman?: boolean
    onNext: (data: {
        gender: Gender
        isPwd: boolean
        pwdType: string
        isExServiceman: boolean
    }) => void
}

export default function StepSpecial({
    initialGender, initialIsPwd, initialPwdType, initialIsExServiceman, onNext
}: StepSpecialProps) {
    const [gender, setGender] = useState<Gender | null>(initialGender || null)
    const [isPwd, setIsPwd] = useState(initialIsPwd || false)
    const [pwdType, setPwdType] = useState(initialPwdType || '')
    const [isEx, setIsEx] = useState(initialIsExServiceman || false)
    const [error, setError] = useState('')

    function handleNext() {
        if (!gender) return setError('Please select a gender')
        if (isPwd && !pwdType.trim()) return setError('Please specify PwD category')

        setError('')
        onNext({
            gender,
            isPwd,
            pwdType: pwdType.trim(),
            isExServiceman: isEx,
        })
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h1 style={{ fontSize: 'clamp(28px, 6vw, 36px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 12, lineHeight: 1.15 }}>
                Final details
            </h1>
            <p style={{ color: '#a1a1a6', fontSize: 16, marginBottom: 32, lineHeight: 1.4 }}>
                Gender and special categories affect application fees and specific post eligibility.
            </p>

            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Gender Segmented Control */}
                <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#86868b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Gender
                    </label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {[
                            { id: 'MALE', label: 'Male' },
                            { id: 'FEMALE', label: 'Female' },
                            { id: 'THIRD_GENDER', label: 'Third Gender' },
                        ].map(g => (
                            <button
                                key={g.id}
                                onClick={() => { setGender(g.id as Gender); setError('') }}
                                style={{
                                    flex: 1, minWidth: '30%',
                                    background: gender === g.id ? '#fff' : '#1c1c1e',
                                    color: gender === g.id ? '#000' : '#86868b',
                                    border: `1px solid ${gender === g.id ? '#fff' : 'rgba(255,255,255,0.1)'}`,
                                    padding: '14px', borderRadius: 12, fontSize: 15, fontWeight: 600,
                                    cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                {g.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Ex-Serviceman Toggle */}
                <label style={{
                    display: 'flex', alignItems: 'center', gap: 16, background: '#1c1c1e',
                    padding: '16px 20px', borderRadius: 16, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 17, fontWeight: 500, color: '#fff' }}>Ex-Serviceman</div>
                        <div style={{ fontSize: 14, color: '#86868b' }}>Check if you served in Defence</div>
                    </div>
                    {/* Apple switch */}
                    <div style={{
                        width: 50, height: 30, borderRadius: 100, background: isEx ? '#32d74b' : '#38383a',
                        position: 'relative', transition: 'background 0.3s'
                    }}>
                        <div style={{
                            width: 26, height: 26, borderRadius: '50%', background: '#fff',
                            position: 'absolute', top: 2, left: isEx ? 22 : 2,
                            transition: 'left 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
                    </div>
                    <input type="checkbox" checked={isEx} onChange={e => setIsEx(e.target.checked)} style={{ display: 'none' }} />
                </label>

                {/* PwD Toggle */}
                <label style={{
                    display: 'flex', alignItems: 'center', gap: 16, background: '#1c1c1e',
                    padding: '16px 20px', borderRadius: 16, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 17, fontWeight: 500, color: '#fff' }}>Person with Disability (PwD)</div>
                        <div style={{ fontSize: 14, color: '#86868b' }}>Check for PwD relaxations</div>
                    </div>
                    <div style={{
                        width: 50, height: 30, borderRadius: 100, background: isPwd ? '#32d74b' : '#38383a',
                        position: 'relative', transition: 'background 0.3s'
                    }}>
                        <div style={{
                            width: 26, height: 26, borderRadius: '50%', background: '#fff',
                            position: 'absolute', top: 2, left: isPwd ? 22 : 2,
                            transition: 'left 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
                    </div>
                    <input type="checkbox" checked={isPwd} onChange={e => setIsPwd(e.target.checked)} style={{ display: 'none' }} />
                </label>

                {isPwd && (
                    <div style={{ animation: 'fadeUp 0.3s ease-out' }}>
                        <input
                            type="text"
                            placeholder="Specify Type (e.g., OH, VH, HH)"
                            value={pwdType}
                            onChange={e => { setPwdType(e.target.value); setError('') }}
                            style={{
                                width: '100%', background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 16, padding: '18px 20px', fontSize: 17, color: '#fff',
                                outline: 'none', transition: 'border-color 0.2s'
                            }}
                            onFocus={e => e.target.style.borderColor = '#0a84ff'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                    </div>
                )}

                {error && <p style={{ color: '#ff3b30', fontSize: 14, fontWeight: 500, animation: 'fadeUp 0.2s' }}>{error}</p>}
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
                disabled={!gender}
                style={{
                    background: !gender ? '#2c2c2e' : '#fff',
                    color: !gender ? '#86868b' : '#000',
                    padding: '16px', borderRadius: 980, fontSize: 17, fontWeight: 600,
                    border: 'none', cursor: !gender ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s, color 0.2s', width: '100%', marginTop: 'auto', flexShrink: 0
                }}
            >
                Done
            </button>
        </div>
    )
}
