'use client'

import { Bell } from 'lucide-react'
import Link from 'next/link'

// ── Static Mock Data ───────────────────────────────────────────────────
const USER_NAME = 'Naveen'

const STATS = [
    { label: 'Eligible Exams', value: '12', color: '#0a84ff' },
    { label: 'Saved', value: '3', color: '#30d158' },
    { label: 'Ending Soon', value: '2', color: '#ff453a' },
]

const EXAM_FEED = [
    {
        id: 'ssc-cgl-2024',
        title: 'SSC Combined Graduate Level (CGL) 2024',
        agency: 'Staff Selection Commission (SSC)',
        tags: ['Graduation', 'Central Govt'],
        vacancies: '7,500 expected',
        lastDate: 'May 1, 2024',
        isHot: true
    },
    {
        id: 'rrb-alp-2024',
        title: 'RRB Assistant Loco Pilot (ALP)',
        agency: 'Railway Recruitment Board',
        tags: ['ITI / Diploma', 'Railway'],
        vacancies: '5,696',
        lastDate: 'Feb 19, 2024',
        isHot: false
    },
    {
        id: 'upsc-cse-2024',
        title: 'UPSC Civil Services Examination',
        agency: 'Union Public Service Commission',
        tags: ['Graduation', 'All India Services'],
        vacancies: '1,056',
        lastDate: 'March 5, 2024',
        isHot: false
    }
]

// ── Component ──────────────────────────────────────────────────────────
export default function DashboardPage() {
    return (
        <div style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>

            {/* Top Sticky Nav */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 10,
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px', margin: '-20px -16px 20px -16px',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 600, color: '#f5f5f7', letterSpacing: '-0.01em' }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#0a84ff', display: 'block', flexShrink: 0 }} />
                    <span style={{ position: 'relative', top: '1px' }}>ExamTracker</span>
                </div>
                <button style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
                    <Bell size={18} />
                </button>
            </div>

            {/* Welcome Header */}
            <header style={{ marginBottom: 24 }}>
                <p style={{ color: '#86868b', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 4 }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
                    Welcome back, {USER_NAME}
                </h1>
            </header>

            {/* Quick Stats (Horizontal Scroll) */}
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, msOverflowStyle: 'none', scrollbarWidth: 'none' }} className="hide-scrollbar">
                {STATS.map((s, i) => (
                    <div key={i} style={{
                        background: '#1c1c1e',
                        borderRadius: 20,
                        padding: '16px 20px',
                        minWidth: 140,
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <div style={{ fontSize: 28, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value}</div>
                        <div style={{ fontSize: 14, color: '#86868b', fontWeight: 500 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 16, marginTop: 16 }}>Latest for You</h2>

            {/* Feed */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {EXAM_FEED.map((exam, index) => (
                    <div key={exam.id}>
                        {/* Apple-styled Feed Card */}
                        <Link href={`/exam/${exam.id}`} style={{ textDecoration: 'none' }}>
                            <div style={{
                                background: '#1c1c1e',
                                borderRadius: 24,
                                padding: 20,
                                border: '1px solid rgba(255,255,255,0.08)',
                                transition: 'transform 0.2s',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                    <div style={{ fontSize: 13, color: '#86868b', fontWeight: 500 }}>{exam.agency}</div>
                                    {exam.isHot && (
                                        <div style={{ background: 'rgba(255, 69, 58, 0.15)', color: '#ff453a', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 100, textTransform: 'uppercase' }}>
                                            Trending
                                        </div>
                                    )}
                                </div>

                                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 16 }}>
                                    {exam.title}
                                </h3>

                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                                    {exam.tags.map(t => (
                                        <span key={t} style={{ background: '#2c2c2e', color: '#a1a1a6', fontSize: 12, padding: '6px 10px', borderRadius: 8, fontWeight: 500 }}>
                                            {t}
                                        </span>
                                    ))}
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.05)', height: 1, marginBottom: 16 }} />

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <div>
                                        <div style={{ fontSize: 12, color: '#86868b', marginBottom: 4 }}>Vacancies</div>
                                        <div style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>{exam.vacancies}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 12, color: '#86868b', marginBottom: 4 }}>Apply By</div>
                                        <div style={{ fontSize: 14, color: '#ffcc00', fontWeight: 600 }}>{exam.lastDate}</div>
                                    </div>
                                </div>

                                <button onClick={(e) => { e.preventDefault(); console.log('Tracked ' + exam.id) }} style={{
                                    width: '100%', background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none',
                                    padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6
                                }}>
                                    Track Exam
                                </button>
                            </div>
                        </Link>

                        {/* Native Mock Advertisement after 2nd post */}
                        {index === 1 && (
                            <div style={{ marginTop: 16, marginBottom: 16 }}>
                                <div style={{ fontSize: 11, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, textAlign: 'center' }}>
                                    Advertisement
                                </div>
                                <div style={{
                                    background: 'linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%)',
                                    borderRadius: 24,
                                    padding: 24,
                                    border: '1px solid rgba(255,255,255,0.04)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: 140,
                                    textAlign: 'center'
                                }}>
                                    <h4 style={{ color: '#fff', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Oswaal Books — SSC CGL Tier 1</h4>
                                    <p style={{ color: '#86868b', fontSize: 14, marginBottom: 16, lineHeight: 1.4 }}>Get 30% off on all mock test papers. Use code <strong style={{ color: '#fff' }}>EXAM30</strong>.</p>
                                    <button style={{ background: '#0a84ff', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 100, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                                        Claim Offer
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .hide-scrollbar::-webkit-scrollbar { display: none; }
            `}} />
        </div>
    )
}
