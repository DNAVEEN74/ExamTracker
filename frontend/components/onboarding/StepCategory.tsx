'use client'

import { useState } from 'react'

type Category = 'GENERAL' | 'OBC_NCL' | 'OBC_CL' | 'SC' | 'ST' | 'EWS'

interface StepCategoryProps {
    initialValue: Category | null
    onNext: (category: Category) => void
}

const CATEGORIES = [
    {
        id: 'GENERAL' as Category,
        label: 'General',
        desc: 'No category reservation',
    },
    {
        id: 'OBC_NCL' as Category,
        label: 'OBC – Non Creamy Layer',
        desc: 'Family income ≤ ₹8 lakh/year. Eligible for OBC reservation.',
    },
    {
        id: 'OBC_CL' as Category,
        label: 'OBC – Creamy Layer',
        desc: 'Family income > ₹8 lakh/year. Treated as General in most exams.',
    },
    {
        id: 'SC' as Category,
        label: 'Scheduled Caste (SC)',
        desc: 'Listed in the Scheduled Castes order.',
    },
    {
        id: 'ST' as Category,
        label: 'Scheduled Tribe (ST)',
        desc: 'Listed in the Scheduled Tribes order.',
    },
    {
        id: 'EWS' as Category,
        label: 'Economically Weaker Section (EWS)',
        desc: 'General category, family income < ₹8 lakh/year. 10% quota.',
    },
]

export default function StepCategory({ initialValue, onNext }: StepCategoryProps) {
    const [selected, setSelected] = useState<Category | null>(initialValue)

    return (
        <div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                What is your category?
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>
                This determines your age limit, fee waiver, and reserved vacancies.
                We never share or display this to anyone.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {CATEGORIES.map(cat => (
                    <div
                        key={cat.id}
                        onClick={() => setSelected(cat.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && setSelected(cat.id)}
                        style={{
                            padding: '14px 16px',
                            borderRadius: 'var(--radius-sm)',
                            border: `2px solid ${selected === cat.id ? 'var(--accent)' : 'var(--border)'}`,
                            background: selected === cat.id ? 'var(--accent-light)' : 'var(--background-card)',
                            cursor: 'pointer',
                            transition: 'border-color 0.15s ease, background 0.15s ease',
                        }}
                    >
                        <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 2 }}>
                            {selected === cat.id ? '● ' : '○ '}{cat.label}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{cat.desc}</div>
                    </div>
                ))}
            </div>

            {/* OBC clarification tip */}
            {(selected === 'OBC_NCL' || selected === 'OBC_CL') && (
                <div style={{
                    background: 'var(--info-light)', border: '1px solid rgba(96,165,250,0.2)',
                    borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: 16,
                    fontSize: 13, color: 'var(--info)',
                }}>
                    ℹ For exams that use OBC-NCL vs OBC-CL distinction (like SSC), we will correctly apply
                    your selection. This is one of the most common mistakes aspirants make.
                </div>
            )}

            <button
                className="btn btn-primary btn-full"
                onClick={() => selected && onNext(selected)}
                disabled={!selected}
            >
                Continue
            </button>
        </div>
    )
}
