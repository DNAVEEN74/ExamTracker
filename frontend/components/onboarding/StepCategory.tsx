'use client'

import { useState } from 'react'

type Category = 'GENERAL' | 'OBC_NCL' | 'OBC_CL' | 'SC' | 'ST' | 'EWS'

interface StepCategoryProps {
    initialValue?: Category | null
    onNext: (c: Category) => void
}

const CATEGORIES: { id: Category; label: string; desc?: string }[] = [
    { id: 'GENERAL', label: 'General / Unreserved (UR)' },
    { id: 'EWS', label: 'Economically Weaker Section (EWS)', desc: '10% Reservation in mostly all Central/State exams' },
    { id: 'OBC_NCL', label: 'OBC - Non Creamy Layer', desc: '27% Reservation + 3 Years Age Relaxation generally' },
    { id: 'OBC_CL', label: 'OBC - Creamy Layer', desc: 'Considered as General for Central Exams' },
    { id: 'SC', label: 'Scheduled Caste (SC)', desc: '15% Reservation + 5 Years Age Relaxation generally' },
    { id: 'ST', label: 'Scheduled Tribe (ST)', desc: '7.5% Reservation + 5 Years Age Relaxation generally' },
]

export default function StepCategory({ initialValue, onNext }: StepCategoryProps) {
    const [selected, setSelected] = useState<Category | null>(initialValue || null)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h1 style={{ fontSize: 'clamp(32px, 7vw, 40px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 16, lineHeight: 1.15 }}>
                What is your<br />category?
            </h1>
            <p style={{ color: '#a1a1a6', fontSize: 17, marginBottom: 40, lineHeight: 1.4 }}>
                This is strictly used for matching you with the correct relaxations and vacancy counts.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelected(cat.id)}
                        style={{
                            textAlign: 'left',
                            background: selected === cat.id ? 'rgba(10, 132, 255, 0.15)' : '#1c1c1e',
                            border: `2px solid ${selected === cat.id ? '#0a84ff' : 'rgba(255,255,255,0.05)'}`,
                            borderRadius: 16,
                            padding: '16px 20px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                        }}
                    >
                        <span style={{ fontSize: 17, fontWeight: 600, color: selected === cat.id ? '#0a84ff' : '#fff', letterSpacing: '-0.01em' }}>
                            {cat.label}
                        </span>
                        {cat.desc && (
                            <span style={{ fontSize: 13, color: selected === cat.id ? 'rgba(255,255,255,0.7)' : '#86868b', lineHeight: 1.4 }}>
                                {cat.desc}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <button
                onClick={() => selected && onNext(selected)}
                disabled={!selected}
                style={{
                    background: !selected ? '#2c2c2e' : '#fff',
                    color: !selected ? '#86868b' : '#000',
                    padding: '16px',
                    borderRadius: 980,
                    fontSize: 17,
                    fontWeight: 600,
                    border: 'none',
                    cursor: !selected ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s, color 0.2s',
                    width: '100%',
                    marginTop: 'auto',
                    flexShrink: 0
                }}
            >
                Continue
            </button>
        </div>
    )
}
