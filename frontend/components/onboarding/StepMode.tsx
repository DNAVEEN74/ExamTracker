'use client'

import { useState } from 'react'

type Mode = 'FOCUSED' | 'DISCOVERY' | 'VACANCY_AWARE'

interface StepModeProps {
    initialValue: Mode | null
    name: string
    onNext: (mode: Mode) => void
}

const MODES = [
    {
        id: 'FOCUSED' as Mode,
        emoji: '🎯',
        title: 'Focused',
        desc: 'I know which exams I want. Just track those.',
        badge: null,
    },
    {
        id: 'DISCOVERY' as Mode,
        emoji: '🔍',
        title: 'Discovery',
        desc: 'Show me all government exams I\'m eligible for right now.',
        badge: 'Most Popular',
        badgeColor: 'var(--accent)',
    },
    {
        id: 'VACANCY_AWARE' as Mode,
        emoji: '✅',
        title: 'Vacancy-Aware',
        desc: 'Only show exams where MY category actually has vacancies.',
        badge: 'Unique Feature',
        badgeColor: 'var(--info)',
    },
]

export default function StepMode({ initialValue, name, onNext }: StepModeProps) {
    const [selected, setSelected] = useState<Mode | null>(initialValue)

    return (
        <div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Hi {name}! How do you want to use ExamTracker?
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
                You can change this anytime from settings.
            </p>

            {MODES.map(mode => (
                <div
                    key={mode.id}
                    className={`mode-card${selected === mode.id ? ' selected' : ''}`}
                    onClick={() => setSelected(mode.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setSelected(mode.id)}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 22 }}>{mode.emoji}</span>
                            <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>
                                {mode.title}
                            </span>
                        </div>
                        {mode.badge && (
                            <span style={{
                                fontSize: 11, fontWeight: 600,
                                padding: '3px 8px', borderRadius: 4,
                                background: mode.badgeColor ? `${mode.badgeColor}22` : 'var(--accent-light)',
                                color: mode.badgeColor ?? 'var(--accent)',
                                whiteSpace: 'nowrap',
                            }}>
                                {mode.badge}
                            </span>
                        )}
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {mode.desc}
                    </p>
                </div>
            ))}

            <button
                className="btn btn-primary btn-full"
                onClick={() => selected && onNext(selected)}
                disabled={!selected}
                style={{ marginTop: 8 }}
            >
                Continue
            </button>
        </div>
    )
}
