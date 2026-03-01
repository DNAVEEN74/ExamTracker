'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'

export type ExamCat = string

// Hardcoded for demo/onboarding purposes.
// In production, this would likely come from the database.
const EXAM_CATS: { id: string; label: string; desc: string; group: string }[] = [
    // SSC
    { id: 'SSC_CGL', label: 'SSC CGL', desc: 'Combined Graduate Level', group: 'SSC' },
    { id: 'SSC_CHSL', label: 'SSC CHSL', desc: 'Combined Higher Secondary Level', group: 'SSC' },
    { id: 'SSC_MTS', label: 'SSC MTS', desc: 'Multi Tasking Staff', group: 'SSC' },
    { id: 'SSC_GD', label: 'SSC GD Constable', desc: 'General Duty Constable', group: 'SSC' },
    { id: 'SSC_CPO', label: 'SSC CPO', desc: 'Central Police Organization', group: 'SSC' },
    { id: 'SSC_JE', label: 'SSC JE', desc: 'Junior Engineer', group: 'SSC' },
    { id: 'SSC_ALL', label: 'All SSC Exams', desc: 'Notify me for any SSC exam', group: 'SSC' },

    // Railway
    { id: 'RRB_NTPC', label: 'RRB NTPC', desc: 'Non Technical Popular Categories', group: 'Railway' },
    { id: 'RRB_GROUP_D', label: 'RRB Group D', desc: 'Level 1 Posts', group: 'Railway' },
    { id: 'RRB_ALP', label: 'RRB ALP & Tech', desc: 'Assistant Loco Pilot', group: 'Railway' },
    { id: 'RRB_JE', label: 'RRB JE', desc: 'Junior Engineer', group: 'Railway' },
    { id: 'RRB_ALL', label: 'All Railway Exams', desc: 'Notify me for any RRB exam', group: 'Railway' },

    // Banking
    { id: 'IBPS_PO', label: 'IBPS PO', desc: 'Probationary Officer', group: 'Banking' },
    { id: 'IBPS_CLERK', label: 'IBPS Clerk', desc: 'Clerical Cadre', group: 'Banking' },
    { id: 'SBI_PO', label: 'SBI PO', desc: 'State Bank PO', group: 'Banking' },
    { id: 'SBI_CLERK', label: 'SBI Clerk', desc: 'Junior Associates', group: 'Banking' },
    { id: 'RBI_GRADE_B', label: 'RBI Grade B', desc: 'Officer Grade', group: 'Banking' },
    { id: 'BANKING_ALL', label: 'All Banking Exams', desc: 'Any banking job', group: 'Banking' },

    // UPSC & State PSC
    { id: 'UPSC_CSE', label: 'UPSC Civil Services', desc: 'IAS, IPS, IFS', group: 'Civil Services' },
    { id: 'UPSC_NDA', label: 'UPSC NDA & NA', desc: 'National Defence Academy', group: 'Defence' },
    { id: 'UPSC_CDS', label: 'UPSC CDS', desc: 'Combined Defence Services', group: 'Defence' },
    { id: 'STATE_PSC_ALL', label: 'State PSC (All)', desc: 'State Civil Services', group: 'Civil Services' },

    // Others
    { id: 'TEACHING_CTET', label: 'CTET', desc: 'Central Teacher Eligibility Test', group: 'Teaching' },
    { id: 'TEACHING_ALL', label: 'All Teaching Exams', desc: 'State TETs, DSSSB, KVS', group: 'Teaching' },
    { id: 'DEFENCE_ALL', label: 'All Defence Exams', desc: 'Army, Navy, Air Force, CAPF', group: 'Defence' },
    { id: 'POLICE_ALL', label: 'State Police Exams', desc: 'SI, Constable', group: 'Police' },
    { id: 'PSU_ALL', label: 'PSU Exams', desc: 'GATE and Non-GATE based', group: 'PSU' },
]

interface StepExamCategoriesProps {
    mode: 'FOCUSED' | 'DISCOVERY' | 'VACANCY_AWARE' | null
    initialValue?: ExamCat[]
    onNext: (cats: ExamCat[]) => void
}

export default function StepExamCategories({ mode, initialValue = [], onNext }: StepExamCategoriesProps) {
    // If Discovery mode, we default to ALL.
    const [selected, setSelected] = useState<ExamCat[]>(
        mode === 'DISCOVERY' ? ['ALL'] : initialValue
    )
    const [search, setSearch] = useState('')

    const filteredCats = useMemo(() => {
        if (!search.trim()) return EXAM_CATS
        const q = search.toLowerCase()
        return EXAM_CATS.filter(c =>
            c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)
        )
    }, [search])

    function toggle(id: ExamCat) {
        if (id === 'ALL') {
            setSelected(['ALL'])
            return
        }

        // If they had ALL selected, and select something specific, clear ALL.
        let updated = selected.filter(x => x !== 'ALL')

        if (updated.includes(id)) {
            updated = updated.filter(x => x !== id)
        } else {
            updated = [...updated, id]
        }
        setSelected(updated)
    }

    if (mode === 'DISCOVERY') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeUp 0.3s ease-out' }}>
                <h1 style={{ fontSize: 'clamp(28px, 6vw, 36px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 12, lineHeight: 1.15 }}>
                    Open to options!
                </h1>
                <p style={{ color: '#a1a1a6', fontSize: 16, marginBottom: 24, lineHeight: 1.4 }}>
                    Since you're exploring, we've set you up to receive alerts for <strong style={{ color: '#fff' }}>All Eligible Exams</strong> based on your profile.
                </p>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingBottom: 24 }}>
                    <div style={{
                        background: 'rgba(10, 132, 255, 0.15)',
                        border: '2px solid #0a84ff',
                        borderRadius: 24,
                        padding: '32px',
                        textAlign: 'center',
                        width: '100%',
                        maxWidth: 300,
                        boxShadow: '0 8px 32px rgba(10, 132, 255, 0.2)'
                    }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
                        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>All Categories</h3>
                        <p style={{ fontSize: 14, color: '#a1a1a6' }}>SSC, UPSC, Railway, State PSC, Defence & more.</p>
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes fadeUp {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}} />

                <button
                    onClick={() => onNext(['ALL'])}
                    style={{
                        background: '#fff', color: '#000', padding: '16px', borderRadius: 980,
                        fontSize: 17, fontWeight: 600, border: 'none', cursor: 'pointer',
                        transition: 'background 0.2s, color 0.2s', width: '100%', marginTop: 'auto', flexShrink: 0
                    }}
                >
                    Sounds Good
                </button>
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h1 style={{ fontSize: 'clamp(28px, 6vw, 36px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 12, lineHeight: 1.15 }}>
                Which exams<br />interest you?
            </h1>
            <p style={{ color: '#a1a1a6', fontSize: 16, marginBottom: 20, lineHeight: 1.4 }}>
                Select exactly what you want on your radar.
            </p>

            {/* Apple Style Search Bar */}
            <div style={{ position: 'relative', marginBottom: 20, flexShrink: 0 }}>
                <Search size={18} color="#86868b" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                    type="text"
                    placeholder="Search exams (e.g., CGL, UPSC)"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        width: '100%', background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12, padding: '14px 16px 14px 44px', fontSize: 16, color: '#fff',
                        outline: 'none', transition: 'border-color 0.2s', WebkitAppearance: 'none'
                    }}
                    onFocus={e => e.target.style.borderColor = '#0a84ff'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
                {filteredCats.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#86868b', fontSize: 15 }}>
                        No categories found matching "{search}"
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        {filteredCats.map(cat => {
                            const isSelected = selected.includes(cat.id)
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => toggle(cat.id)}
                                    style={{
                                        textAlign: 'left',
                                        background: isSelected ? '#0a84ff' : '#1c1c1e',
                                        border: `1px solid ${isSelected ? '#0a84ff' : 'rgba(255,255,255,0.08)'}`,
                                        borderRadius: 100,
                                        padding: '12px 20px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                >
                                    <span style={{ fontSize: 16, fontWeight: 600, color: isSelected ? '#fff' : '#e5e5ea', letterSpacing: '-0.01em' }}>
                                        {cat.label}
                                    </span>
                                    <span style={{ fontSize: 12, color: isSelected ? 'rgba(255,255,255,0.8)' : '#86868b', marginTop: 2 }}>
                                        {cat.desc}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            <button
                onClick={() => onNext(selected)}
                disabled={selected.length === 0}
                style={{
                    background: selected.length === 0 ? '#2c2c2e' : '#fff',
                    color: selected.length === 0 ? '#86868b' : '#000',
                    padding: '16px', borderRadius: 980, fontSize: 17, fontWeight: 600,
                    border: 'none', cursor: selected.length === 0 ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s, color 0.2s', width: '100%', marginTop: 'auto', flexShrink: 0
                }}
            >
                Continue
            </button>
        </div>
    )
}
