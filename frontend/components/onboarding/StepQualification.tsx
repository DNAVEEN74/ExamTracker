'use client'

import { useState } from 'react'

type QualLevel =
    | 'CLASS_10' | 'CLASS_12' | 'ITI' | 'DIPLOMA'
    | 'GRADUATION' | 'POST_GRADUATION' | 'DOCTORATE'
    | 'PROFESSIONAL_CA' | 'PROFESSIONAL_LLB' | 'PROFESSIONAL_MBBS' | 'PROFESSIONAL_BED'

interface StepQualificationProps {
    initialQual: QualLevel | null
    initialStream: string
    initialMarks: number | null
    initialFinalYear: boolean
    onNext: (data: { qualification: QualLevel; stream: string; marks: number | null; isFinalYear: boolean }) => void
}

const QUALIFICATIONS: { id: QualLevel; label: string; hasStream?: boolean }[] = [
    { id: 'CLASS_10', label: '10th Pass (Matriculation)' },
    { id: 'CLASS_12', label: '12th Pass (Intermediate)', hasStream: true },
    { id: 'ITI', label: 'ITI (Trade Certificate)', hasStream: true },
    { id: 'DIPLOMA', label: 'Diploma (Polytechnic)', hasStream: true },
    { id: 'GRADUATION', label: 'Graduation (Any Bachelor\'s)', hasStream: true },
    { id: 'POST_GRADUATION', label: 'Post Graduation (Master\'s)', hasStream: true },
    { id: 'DOCTORATE', label: 'Doctorate (PhD)', hasStream: true },
    { id: 'PROFESSIONAL_CA', label: 'CA / CMA / CS' },
    { id: 'PROFESSIONAL_LLB', label: 'LLB (Law)' },
    { id: 'PROFESSIONAL_MBBS', label: 'MBBS / Medical degree' },
    { id: 'PROFESSIONAL_BED', label: 'B.Ed (Teaching)' },
]

export default function StepQualification({ initialQual, initialStream, initialMarks, initialFinalYear, onNext }: StepQualificationProps) {
    const [qual, setQual] = useState<QualLevel | null>(initialQual)
    const [stream, setStream] = useState(initialStream)
    const [marks, setMarks] = useState<string>(initialMarks?.toString() ?? '')
    const [isFinalYear, setIsFinalYear] = useState(initialFinalYear)

    const selectedQual = QUALIFICATIONS.find(q => q.id === qual)
    const isValid = !!qual

    function handleSubmit() {
        if (!qual) return
        onNext({
            qualification: qual,
            stream,
            marks: marks ? parseFloat(marks) : null,
            isFinalYear,
        })
    }

    return (
        <div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                What&apos;s your highest qualification?
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                Many exams require specific degrees. We&apos;ll filter accordingly.
            </p>

            {/* Qualification selector */}
            <select
                className="input"
                value={qual ?? ''}
                onChange={e => setQual(e.target.value as QualLevel)}
                style={{ marginBottom: 16, cursor: 'pointer', paddingRight: 40 }}
            >
                <option value="" disabled>Select your highest qualification</option>
                {QUALIFICATIONS.map(q => (
                    <option key={q.id} value={q.id}>{q.label}</option>
                ))}
            </select>

            {/* Stream input (for grad/12th etc) */}
            {qual && selectedQual?.hasStream && (
                <input
                    className="input"
                    type="text"
                    placeholder="Stream / Subject (e.g. B.Com, B.Tech CSE, PCM)"
                    value={stream}
                    onChange={e => setStream(e.target.value)}
                    style={{ marginBottom: 16 }}
                />
            )}

            {/* Marks */}
            {qual && qual !== 'CLASS_10' && (
                <div style={{ position: 'relative', marginBottom: 12 }}>
                    <input
                        className="input"
                        type="number"
                        placeholder="Percentage / CGPA (optional)"
                        value={marks}
                        min={0} max={100}
                        onChange={e => setMarks(e.target.value)}
                        style={{ paddingRight: 40 }}
                    />
                    <span style={{
                        position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--text-tertiary)', fontSize: 14, pointerEvents: 'none',
                    }}>%</span>
                </div>
            )}

            {/* Final year toggle */}
            {qual && ['GRADUATION', 'POST_GRADUATION', 'DIPLOMA'].includes(qual) && (
                <label style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px', marginBottom: 16,
                    background: 'var(--background-card)',
                    borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                    cursor: 'pointer',
                }}>
                    <input
                        type="checkbox"
                        checked={isFinalYear}
                        onChange={e => setIsFinalYear(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                    <div>
                        <div style={{ fontWeight: 500, fontSize: 15, color: 'var(--text-primary)' }}>
                            Currently in final year
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            Many exams allow final-year students to apply provisionally
                        </div>
                    </div>
                </label>
            )}

            <button
                className="btn btn-primary btn-full"
                onClick={handleSubmit}
                disabled={!isValid}
            >
                Continue
            </button>
        </div>
    )
}
