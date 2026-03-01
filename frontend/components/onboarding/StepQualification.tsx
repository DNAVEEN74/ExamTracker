'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

export type QualLevel =
    | 'CLASS_10' | 'CLASS_12' | 'ITI' | 'DIPLOMA'
    | 'GRADUATION' | 'POST_GRADUATION' | 'DOCTORATE'
    | 'PROFESSIONAL_CA' | 'PROFESSIONAL_LLB' | 'PROFESSIONAL_MBBS' | 'PROFESSIONAL_BED'

const LEVELS: { id: QualLevel; label: string }[] = [
    { id: 'CLASS_10', label: '10th Pass' },
    { id: 'CLASS_12', label: '12th Pass' },
    { id: 'ITI', label: 'ITI Certificate' },
    { id: 'DIPLOMA', label: 'Diploma' },
    { id: 'GRADUATION', label: 'Bachelor\'s Degree' },
    { id: 'POST_GRADUATION', label: 'Master\'s Degree' },
    { id: 'PROFESSIONAL_BED', label: 'B.Ed / Teaching' },
    { id: 'PROFESSIONAL_LLB', label: 'LL.B / Law' },
    { id: 'PROFESSIONAL_MBBS', label: 'MBBS / Medical' },
]

export interface QualificationEntry {
    id: string
    qualification: QualLevel
    stream: string
    marks: number | null
    isFinalYear: boolean
}

interface StepQualificationProps {
    initialValues?: QualificationEntry[]
    onNext: (quals: QualificationEntry[]) => void
}

export default function StepQualification({
    initialValues = [], onNext
}: StepQualificationProps) {
    const [quals, setQuals] = useState<QualificationEntry[]>(initialValues)
    const [isAdding, setIsAdding] = useState(initialValues.length === 0)

    // Form Temporary State
    const [qual, setQual] = useState<QualLevel | null>(null)
    const [stream, setStream] = useState('')
    const [marks, setMarks] = useState('')
    const [isFinalYear, setIsFinalYear] = useState(false)
    const [error, setError] = useState('')

    const needsStream = qual && !['CLASS_10'].includes(qual)

    function handleAdd() {
        if (!qual) return setError('Please select a qualification.')
        if (needsStream && !stream.trim()) return setError('Please enter your stream/subject.')

        let marksNum = null
        if (marks.trim()) {
            marksNum = parseFloat(marks)
            if (isNaN(marksNum) || marksNum < 30 || marksNum > 100) {
                return setError('Please enter valid percentage (e.g., 65.5).')
            }
        }

        const newEntry: QualificationEntry = {
            id: Math.random().toString(36).substring(7),
            qualification: qual,
            stream: stream.trim(),
            marks: marksNum,
            isFinalYear
        }

        setQuals(prev => [...prev, newEntry])

        // Reset form
        setQual(null)
        setStream('')
        setMarks('')
        setIsFinalYear(false)
        setError('')
        setIsAdding(false)
    }

    function handleRemove(id: string) {
        setQuals(prev => prev.filter(q => q.id !== id))
        if (quals.length === 1) {
            setIsAdding(true)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h1 style={{ fontSize: 'clamp(28px, 6vw, 36px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 16, lineHeight: 1.15 }}>
                Your Qualifications
            </h1>
            <p style={{ color: '#a1a1a6', fontSize: 16, marginBottom: 24, lineHeight: 1.4 }}>
                Add your education history. You can add multiple (e.g., 10th + Diploma + B.Tech) to unlock more jobs.
            </p>

            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* List of Added Qualifications */}
                {quals.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {quals.map(q => {
                            const levelLabel = LEVELS.find(l => l.id === q.qualification)?.label
                            return (
                                <div key={q.id} style={{
                                    background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 16, padding: '16px', display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'center', animation: 'fadeUp 0.3s ease-out'
                                }}>
                                    <div>
                                        <div style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 2 }}>{levelLabel}</div>
                                        <div style={{ color: '#86868b', fontSize: 13 }}>
                                            {q.stream ? `${q.stream} • ` : ''}
                                            {q.isFinalYear ? 'Final Year' : q.marks ? `${q.marks}%` : 'Graduated'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(q.id)}
                                        style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}

                {!isAdding && quals.length > 0 && (
                    <button
                        onClick={() => setIsAdding(true)}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px dashed rgba(255,255,255,0.2)',
                            borderRadius: 16, padding: '16px', fontSize: 16, fontWeight: 500, cursor: 'pointer',
                            transition: 'background 0.2s', width: '100%'
                        }}
                    >
                        <Plus size={18} /> Add Another Qualification
                    </button>
                )}

                {/* Form to Add New Qualification */}
                {isAdding && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.3s ease-out', padding: quals.length > 0 ? '20px 0 0 0' : 0, borderTop: quals.length > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#86868b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Education Level
                            </label>
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={qual || ''}
                                    onChange={(e) => {
                                        setQual(e.target.value as QualLevel)
                                        setStream('')
                                        setError('')
                                    }}
                                    style={{
                                        width: '100%', background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 16, padding: '18px 20px', fontSize: 17, color: qual ? '#fff' : '#86868b',
                                        outline: 'none', transition: 'border-color 0.2s', WebkitAppearance: 'none', cursor: 'pointer'
                                    }}
                                >
                                    <option value="" disabled>Select degree</option>
                                    {LEVELS.map(l => (
                                        <option key={l.id} value={l.id}>{l.label}</option>
                                    ))}
                                </select>
                                <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#86868b' }}>▼</div>
                            </div>
                        </div>

                        {needsStream && (
                            <div style={{ animation: 'fadeUp 0.3s ease-out' }}>
                                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#86868b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Stream / Branch
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., PCM, B.Tech CS..."
                                    value={stream}
                                    onChange={e => { setStream(e.target.value); setError('') }}
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

                        {qual && (
                            <div style={{ animation: 'fadeUp 0.3s ease-out' }}>
                                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#86868b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Marks % (Optional)
                                </label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="e.g., 65.5"
                                    value={marks}
                                    onChange={e => { setMarks(e.target.value); setError('') }}
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

                        {qual && !['CLASS_10', 'CLASS_12'].includes(qual) && (
                            <label style={{
                                display: 'flex', alignItems: 'center', gap: 16, background: '#1c1c1e',
                                padding: '16px 20px', borderRadius: 16, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)',
                                animation: 'fadeUp 0.3s ease-out'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 17, fontWeight: 500, color: '#fff' }}>I am in my final year</div>
                                    <div style={{ fontSize: 14, color: '#86868b' }}>Some exams allow appearing students</div>
                                </div>
                                <div style={{
                                    width: 50, height: 30, borderRadius: 100, background: isFinalYear ? '#32d74b' : '#38383a',
                                    position: 'relative', transition: 'background 0.3s'
                                }}>
                                    <div style={{
                                        width: 26, height: 26, borderRadius: '50%', background: '#fff',
                                        position: 'absolute', top: 2, left: isFinalYear ? 22 : 2,
                                        transition: 'left 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }} />
                                </div>
                                <input type="checkbox" checked={isFinalYear} onChange={e => setIsFinalYear(e.target.checked)} style={{ display: 'none' }} />
                            </label>
                        )}

                        {error && <p style={{ color: '#ff3b30', fontSize: 14, fontWeight: 500 }}>{error}</p>}

                        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                            {quals.length > 0 && (
                                <button
                                    onClick={() => { setIsAdding(false); setError(''); setQual(null); }}
                                    style={{ flex: 1, background: '#1c1c1e', color: '#fff', padding: '16px', borderRadius: 980, fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={handleAdd}
                                style={{ flex: 2, background: '#0a84ff', color: '#fff', padding: '16px', borderRadius: 980, fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer' }}
                            >
                                Save This Level
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}} />

            <button
                onClick={() => onNext(quals)}
                disabled={quals.length === 0 || isAdding}
                style={{
                    background: quals.length === 0 || isAdding ? '#2c2c2e' : '#fff',
                    color: quals.length === 0 || isAdding ? '#86868b' : '#000',
                    padding: '16px', borderRadius: 980, fontSize: 17, fontWeight: 600,
                    border: 'none', cursor: quals.length === 0 || isAdding ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s, color 0.2s', width: '100%', marginTop: 'auto', flexShrink: 0
                }}
            >
                {quals.length > 0 && isAdding ? 'Save Qualification First' : 'Continue'}
            </button>
        </div>
    )
}
