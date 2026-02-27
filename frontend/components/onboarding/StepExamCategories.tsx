'use client'

import { useState } from 'react'

type ExamCategory =
    | 'SSC' | 'RAILWAY' | 'BANKING' | 'UPSC_CIVIL'
    | 'STATE_PSC' | 'DEFENCE' | 'POLICE' | 'TEACHING' | 'PSU' | 'OTHER'

interface StepExamCategoriesProps {
    initialValue: ExamCategory[]
    onNext: (categories: ExamCategory[]) => void
}

const CATEGORIES = [
    { id: 'SSC' as ExamCategory, emoji: '📋', label: 'SSC', desc: 'CGL, CHSL, MTS, CPO, GD' },
    { id: 'RAILWAY' as ExamCategory, emoji: '🚂', label: 'Railway', desc: 'RRB NTPC, Group D, ALP' },
    { id: 'BANKING' as ExamCategory, emoji: '🏦', label: 'Banking', desc: 'IBPS PO, SBI, RRB, Clerk' },
    { id: 'UPSC_CIVIL' as ExamCategory, emoji: '🏛️', label: 'UPSC Civil Services', desc: 'IAS, IPS, IFS, IRS' },
    { id: 'STATE_PSC' as ExamCategory, emoji: '🗺️', label: 'State PSC', desc: 'State civil services' },
    { id: 'DEFENCE' as ExamCategory, emoji: '⚔️', label: 'Defence', desc: 'NDA, CDS, AFCAT, MNS' },
    { id: 'POLICE' as ExamCategory, emoji: '👮', label: 'Police & Para-Military', desc: 'CISF, CRPF, BSF, SSB' },
    { id: 'TEACHING' as ExamCategory, emoji: '📚', label: 'Teaching', desc: 'CTET, KVS, NVS, TGT/PGT' },
    { id: 'PSU' as ExamCategory, emoji: '🏭', label: 'PSU', desc: 'GATE-based: BHEL, ONGC, NTPC' },
    { id: 'OTHER' as ExamCategory, emoji: '📎', label: 'Other', desc: 'High Court, Post Office, FCI' },
]

export default function StepExamCategories({ initialValue, onNext }: StepExamCategoriesProps) {
    const [selected, setSelected] = useState<ExamCategory[]>(initialValue)

    function toggle(id: ExamCategory) {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        )
    }

    return (
        <div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Which exam types interest you?
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>
                Select all that apply. This helps us prioritise your feed.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                {CATEGORIES.map(cat => {
                    const isSelected = selected.includes(cat.id)
                    return (
                        <div
                            key={cat.id}
                            onClick={() => toggle(cat.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={e => e.key === 'Enter' && toggle(cat.id)}
                            style={{
                                padding: '14px 12px',
                                borderRadius: 'var(--radius-sm)',
                                border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                                background: isSelected ? 'var(--accent-light)' : 'var(--background-card)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <div style={{ fontSize: 20, marginBottom: 4 }}>{cat.emoji}</div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>
                                {cat.label}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.3 }}>
                                {cat.desc}
                            </div>
                        </div>
                    )
                })}
            </div>

            <button
                className="btn btn-primary btn-full"
                onClick={() => onNext(selected)}
                disabled={selected.length === 0}
            >
                Continue {selected.length > 0 && `(${selected.length} selected)`}
            </button>

            <button
                className="btn btn-ghost btn-full"
                onClick={() => onNext(CATEGORIES.map(c => c.id))} // select all
                style={{ marginTop: 8 }}
            >
                Show me everything I&apos;m eligible for
            </button>
        </div>
    )
}
