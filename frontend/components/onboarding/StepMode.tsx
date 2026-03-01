'use client'

import { useState } from 'react'

type Mode = 'FOCUSED' | 'DISCOVERY' | 'VACANCY_AWARE'

interface StepModeProps {
    initialValue?: Mode | null
    name: string
    onNext: (data: { mode: Mode; minVacancy: number | null }) => void
}

const MODES: { id: Mode; title: string; desc: string }[] = [
    {
        id: 'FOCUSED',
        title: 'Laser Focused',
        desc: 'I know exactly which exams I want (e.g., only SSC CGL).'
    },
    {
        id: 'DISCOVERY',
        title: 'Open to Options',
        desc: 'Show me any exam I am eligible for across all categories.'
    },
    {
        id: 'VACANCY_AWARE',
        title: 'High Vacancy Only',
        desc: 'Only notify me about exams with many openings.'
    }
]

export default function StepMode({ initialValue, name, onNext }: StepModeProps) {
    const [selected, setSelected] = useState<Mode | null>(initialValue || null)
    const [minVacancy, setMinVacancy] = useState<string>('')

    function handleNext() {
        if (!selected) return

        let vacancyThreshold = null
        if (selected === 'VACANCY_AWARE') {
            vacancyThreshold = parseInt(minVacancy, 10)
            if (isNaN(vacancyThreshold) || vacancyThreshold < 1) {
                vacancyThreshold = 500 // fallback default
            }
        }

        onNext({ mode: selected, minVacancy: vacancyThreshold })
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h1 style={{ fontSize: 'clamp(32px, 7vw, 40px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 16, lineHeight: 1.15 }}>
                Hi {name.split(' ')[0]},<br />how do you study?
            </h1>
            <p style={{ color: '#a1a1a6', fontSize: 17, marginBottom: 40, lineHeight: 1.4 }}>
                This helps us tune your email alerts. Don't worry, you can change this later.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
                {MODES.map(mode => (
                    <button
                        key={mode.id}
                        onClick={() => setSelected(mode.id)}
                        style={{
                            textAlign: 'left',
                            background: selected === mode.id ? 'rgba(10, 132, 255, 0.15)' : '#1c1c1e',
                            border: `2px solid ${selected === mode.id ? '#0a84ff' : 'rgba(255,255,255,0.05)'}`,
                            borderRadius: 20,
                            padding: '24px 20px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6
                        }}
                    >
                        <span style={{ fontSize: 18, fontWeight: 600, color: selected === mode.id ? '#0a84ff' : '#fff', letterSpacing: '-0.01em' }}>
                            {mode.title}
                        </span>
                        <span style={{ fontSize: 15, color: selected === mode.id ? 'rgba(255,255,255,0.8)' : '#86868b', lineHeight: 1.4 }}>
                            {mode.desc}
                        </span>

                        {mode.id === 'VACANCY_AWARE' && selected === 'VACANCY_AWARE' && (
                            <div
                                style={{ marginTop: 12, animation: 'fadeUp 0.3s ease-out' }}
                                onClick={e => e.stopPropagation()} // Prevent toggling when clicking input
                            >
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Minimum Vacancies
                                </label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    placeholder="e.g. 500"
                                    value={minVacancy}
                                    onChange={e => setMinVacancy(e.target.value)}
                                    style={{
                                        width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(10, 132, 255, 0.3)',
                                        borderRadius: 12, padding: '14px 16px', fontSize: 16, color: '#fff',
                                        outline: 'none', transition: 'border-color 0.2s', WebkitAppearance: 'none'
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#0a84ff'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(10, 132, 255, 0.3)'}
                                />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}} />

            <button
                onClick={handleNext}
                disabled={!selected || (selected === 'VACANCY_AWARE' && !minVacancy.trim())}
                style={{
                    background: (!selected || (selected === 'VACANCY_AWARE' && !minVacancy.trim())) ? '#2c2c2e' : '#fff',
                    color: (!selected || (selected === 'VACANCY_AWARE' && !minVacancy.trim())) ? '#86868b' : '#000',
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
