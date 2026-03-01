'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'

interface StepCompleteProps {
    displayName: string
    onSave: () => void
}

export default function StepComplete({ displayName, onSave }: StepCompleteProps) {
    const [mounted, setMounted] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>

            <div style={{
                width: 80, height: 80, borderRadius: '50%', background: '#32d74b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 32,
                transform: mounted ? 'scale(1)' : 'scale(0.5)',
                opacity: mounted ? 1 : 0,
                transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s',
                boxShadow: '0 8px 32px rgba(50, 215, 75, 0.4)'
            }}>
                <Check size={40} color="#000" strokeWidth={3} />
            </div>

            <h1 style={{
                fontSize: 'clamp(32px, 7vw, 40px)', fontWeight: 700, color: '#fff',
                letterSpacing: '-0.02em', marginBottom: 16, lineHeight: 1.15,
                transform: mounted ? 'translateY(0)' : 'translateY(10px)',
                opacity: mounted ? 1 : 0,
                transition: 'transform 0.5s ease 0.1s, opacity 0.5s 0.1s'
            }}>
                You're all set,<br />{displayName.split(' ')[0]}.
            </h1>

            <p style={{
                color: '#a1a1a6', fontSize: 17, marginBottom: 48, lineHeight: 1.4,
                transform: mounted ? 'translateY(0)' : 'translateY(10px)',
                opacity: mounted ? 1 : 0,
                transition: 'transform 0.5s ease 0.2s, opacity 0.5s 0.2s'
            }}>
                Your profile is personalized. We'll automatically match you with eligible exams and notify you of upcoming deadlines.
            </p>

            <button
                onClick={() => { setSaving(true); onSave(); }}
                disabled={saving}
                style={{
                    background: '#fff',
                    color: '#000',
                    padding: '16px',
                    borderRadius: 980,
                    fontSize: 17,
                    fontWeight: 600,
                    border: 'none',
                    cursor: saving ? 'wait' : 'pointer',
                    transition: 'transform 0.2s, background 0.2s',
                    width: '100%',
                    transform: mounted ? 'translateY(0)' : 'translateY(10px)',
                    opacity: mounted ? 1 : 0,
                    transitionDelay: '0.3s'
                }}
            >
                {saving ? 'Taking you there...' : 'Go to Dashboard'}
            </button>
        </div>
    )
}
