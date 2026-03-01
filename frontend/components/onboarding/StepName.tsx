'use client'

import { useState } from 'react'

interface StepNameProps {
    initialValue?: string
    onNext: (name: string) => void
}

export default function StepName({ initialValue = '', onNext }: StepNameProps) {
    const [name, setName] = useState(initialValue)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h1 style={{ fontSize: 'clamp(32px, 7vw, 40px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 16, lineHeight: 1.15 }}>
                What should we<br />call you?
            </h1>
            <p style={{ color: '#a1a1a6', fontSize: 17, marginBottom: 40, lineHeight: 1.4 }}>
                Your real name helps us personalize notifications.
            </p>

            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    placeholder="Enter full name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && name.trim().length >= 2 && onNext(name.trim())}
                    autoFocus
                    style={{
                        width: '100%',
                        background: '#1c1c1e',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 16,
                        padding: '18px 20px',
                        fontSize: 17,
                        color: '#fff',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        WebkitAppearance: 'none'
                    }}
                    onFocus={e => e.target.style.borderColor = '#0a84ff'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
            </div>

            <div style={{ flex: 1, minHeight: 24 }} />

            <button
                onClick={() => onNext(name.trim())}
                disabled={name.trim().length < 2}
                style={{
                    background: name.trim().length < 2 ? '#2c2c2e' : '#fff',
                    color: name.trim().length < 2 ? '#86868b' : '#000',
                    padding: '16px',
                    borderRadius: 980,
                    fontSize: 17,
                    fontWeight: 600,
                    border: 'none',
                    cursor: name.trim().length < 2 ? 'not-allowed' : 'pointer',
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
