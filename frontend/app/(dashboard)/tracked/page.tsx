'use client'

import { Clock, CheckCircle2, AlertCircle, ChevronRight, Crosshair } from 'lucide-react'
import Link from 'next/link'

// ── Static Mock Data ───────────────────────────────────────────────────
const TRACKED_EXAMS = [
    {
        id: 'rrb-ntpc-2024',
        agency: 'Railway Recruitment Board',
        title: 'RRB NTPC 2024',
        status: 'URGENT',
        daysLeft: 3,
        deadlineLabel: 'Apply Date Ends',
        deadlineDate: 'Oct 15, 2024',
        progress: 85 // represents time passed towards deadline
    },
    {
        id: 'upsc-cse-2024',
        agency: 'UPSC',
        title: 'Civil Services Examination',
        status: 'UPCOMING_EXAM',
        daysLeft: 18,
        deadlineLabel: 'Tier 1 Exam',
        deadlineDate: 'Nov 5, 2024',
        progress: 40
    },
    {
        id: 'ssc-cgl-2024',
        agency: 'Staff Selection Commission',
        title: 'SSC CGL 2024',
        status: 'OPEN',
        daysLeft: 45,
        deadlineLabel: 'Correction Window Opens',
        deadlineDate: 'Dec 1, 2024',
        progress: 10
    }
]

// ── Component ──────────────────────────────────────────────────────────
export default function TrackedPage() {
    return (
        <div style={{ paddingBottom: 100, maxWidth: 600, margin: '0 auto', background: '#000', minHeight: '100dvh' }}>

            {/* Header */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 10,
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                padding: '24px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
                <h1 style={{ fontSize: 34, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
                    Tracked
                </h1>
                <p style={{ color: '#86868b', fontSize: 15, marginTop: 8 }}>
                    3 active examinations
                </p>
            </header>

            {/* Timeline View */}
            <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                {TRACKED_EXAMS.map((exam, index) => {
                    const isUrgent = exam.status === 'URGENT'
                    const statusColor = isUrgent ? '#ff453a' : (exam.status === 'UPCOMING_EXAM' ? '#ff9f0a' : '#32d74b')

                    return (
                        <div key={exam.id} style={{ display: 'flex', gap: 16 }}>

                            {/* Timeline Node & Line */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
                                <div style={{
                                    width: 14, height: 14, borderRadius: '50%', background: statusColor,
                                    border: '3px solid #000', outline: `2px solid ${statusColor}`, outlineOffset: 2,
                                    marginTop: 4, zIndex: 2
                                }} />
                                {index !== TRACKED_EXAMS.length - 1 && (
                                    <div style={{ width: 2, flex: 1, background: 'rgba(255,255,255,0.1)', marginTop: 8, marginBottom: -24 }} />
                                )}
                            </div>

                            {/* Tracking Card */}
                            <div style={{ flex: 1 }}>
                                <Link href={`/exam/${exam.id}`} style={{ textDecoration: 'none' }}>
                                    <div style={{
                                        background: '#1c1c1e', borderRadius: 20, padding: 20,
                                        border: isUrgent ? `1px solid rgba(255, 69, 58, 0.3)` : '1px solid rgba(255,255,255,0.05)',
                                        boxShadow: isUrgent ? '0 8px 32px rgba(255, 69, 58, 0.1)' : 'none'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                            <div style={{ fontSize: 12, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {exam.agency}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: statusColor, fontSize: 13, fontWeight: 700 }}>
                                                {isUrgent ? <AlertCircle size={14} /> : <Clock size={14} />}
                                                {exam.daysLeft} Days Left
                                            </div>
                                        </div>

                                        <h3 style={{ fontSize: 18, fontWeight: 600, color: '#fff', lineHeight: 1.3, marginBottom: 16 }}>
                                            {exam.title}
                                        </h3>

                                        {/* Progress Bar mapped against time */}
                                        <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 100, marginBottom: 16, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${exam.progress}%`, background: statusColor, borderRadius: 100 }} />
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: 12 }}>
                                            <div>
                                                <div style={{ fontSize: 12, color: '#86868b', marginBottom: 2 }}>{exam.deadlineLabel}</div>
                                                <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{exam.deadlineDate}</div>
                                            </div>
                                            <ChevronRight size={20} color="#86868b" />
                                        </div>

                                    </div>
                                </Link>

                                {/* Action Buttons underneath card */}
                                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                                    <button style={{
                                        flex: 2, background: isUrgent ? '#fff' : '#2c2c2e',
                                        color: isUrgent ? '#000' : '#fff', border: 'none',
                                        padding: '12px', borderRadius: 100, fontSize: 14, fontWeight: 600, cursor: 'pointer'
                                    }}>
                                        Apply Now
                                    </button>
                                    <button style={{
                                        flex: 1, background: 'transparent', color: '#86868b', border: '1px solid rgba(255,255,255,0.1)',
                                        padding: '12px', borderRadius: 100, fontSize: 14, fontWeight: 500, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                    }}>
                                        <CheckCircle2 size={16} /> Untrack
                                    </button>
                                </div>
                            </div>

                        </div>
                    )
                })}
            </div>

            {/* Empty State Template (Hidden natively, here for logic scaling) */}
            {TRACKED_EXAMS.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <Crosshair size={28} color="#86868b" />
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Nothing tracked yet</h2>
                    <p style={{ color: '#86868b', fontSize: 15, marginBottom: 24, lineHeight: 1.5 }}>
                        Start tracking exams from the Dashboard or Search page to keep an eye on upcoming deadlines.
                    </p>
                    <Link href="/search" style={{ background: '#0a84ff', color: '#fff', padding: '12px 24px', borderRadius: 100, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
                        Find Exams
                    </Link>
                </div>
            )}

        </div>
    )
}
