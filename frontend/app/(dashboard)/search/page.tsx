'use client'

import { useState } from 'react'
import { Search as SearchIcon, Filter, Crosshair } from 'lucide-react'
import Link from 'next/link'

// ── Static Mock Data ───────────────────────────────────────────────────
const CATEGORIES = ['All Exams', 'Central Govt', 'Railway', 'Banking', 'UPSC', 'State PSC', 'Defence']

const ALL_EXAMS = [
    {
        id: 'ssc-cgl-2024',
        title: 'SSC Combined Graduate Level (CGL) 2024',
        agency: 'Staff Selection Commission (SSC)',
        category: 'Central Govt',
        vacancies: '17,727 (Tentative)',
        lastDate: 'July 24, 2024',
        eligibilityStatus: 'Eligible', // Mock flag for UI
        tracked: false
    },
    {
        id: 'rrb-ntpc-2024',
        title: 'RRB Non-Technical Popular Categories',
        agency: 'Railway Recruitment Board',
        category: 'Railway',
        vacancies: '11,558',
        lastDate: 'October 15, 2024',
        eligibilityStatus: 'Eligible',
        tracked: true
    },
    {
        id: 'ibps-po-2024',
        title: 'IBPS Probationary Officers (PO)',
        agency: 'Institute of Banking Personnel Selection',
        category: 'Banking',
        vacancies: '4,455',
        lastDate: 'August 21, 2024',
        eligibilityStatus: 'Not Eligible (Age)',
        tracked: false
    },
    {
        id: 'upsc-cse-2024',
        title: 'UPSC Civil Services Examination',
        agency: 'Union Public Service Commission',
        category: 'UPSC',
        vacancies: '1,056',
        lastDate: 'March 5, 2024',
        eligibilityStatus: 'Eligible',
        tracked: false
    },
    {
        id: 'afcat-2-2024',
        title: 'Air Force Common Admission Test 2',
        agency: 'Indian Air Force',
        category: 'Defence',
        vacancies: '304',
        lastDate: 'June 28, 2024',
        eligibilityStatus: 'Not Eligible (Qualification)',
        tracked: false
    }
]

// ── Component ──────────────────────────────────────────────────────────
export default function SearchPage() {
    const [activeCategory, setActiveCategory] = useState(CATEGORIES[0])
    const [searchQuery, setSearchQuery] = useState('')

    // Mock filtering logic
    const filteredExams = ALL_EXAMS.filter(exam => {
        const matchesCategory = activeCategory === 'All Exams' || exam.category === activeCategory
        const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) || exam.agency.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesCategory && matchesSearch
    })

    return (
        <div style={{ paddingBottom: 100, maxWidth: 600, margin: '0 auto', background: '#000', minHeight: '100dvh' }}>

            {/* Header & Sticky Search Bar */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 10,
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', flexDirection: 'column', gap: 16
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ fontSize: 34, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
                        Search
                    </h1>
                </div>

                {/* Search Input styled like Apple iOS */}
                <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{
                        flex: 1, background: '#1c1c1e', borderRadius: 12, padding: '8px 12px',
                        display: 'flex', alignItems: 'center', gap: 8
                    }}>
                        <SearchIcon size={20} color="#86868b" />
                        <input
                            type="text"
                            placeholder="Search exams, agencies..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                background: 'transparent', border: 'none', color: '#fff', fontSize: 17,
                                width: '100%', outline: 'none'
                            }}
                        />
                    </div>
                    <button style={{ background: 'transparent', border: 'none', color: '#0a84ff', padding: '0 8px', fontSize: 17, cursor: 'pointer' }}>
                        <Filter size={24} />
                    </button>
                </div>

                {/* Horizontal Scroll Pill Filter */}
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, msOverflowStyle: 'none', scrollbarWidth: 'none' }} className="hide-scrollbar">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            style={{
                                background: activeCategory === cat ? '#fff' : '#1c1c1e',
                                color: activeCategory === cat ? '#000' : '#f5f5f7',
                                border: '1px solid',
                                borderColor: activeCategory === cat ? '#fff' : 'rgba(255,255,255,0.08)',
                                borderRadius: 100, padding: '6px 16px', fontSize: 14, fontWeight: 600,
                                whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </header>

            {/* List Content */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {filteredExams.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#86868b', marginTop: 60, fontSize: 15 }}>
                        No exams found matching your search.
                    </div>
                ) : (
                    filteredExams.map((exam) => (
                        <div key={exam.id} style={{
                            background: '#1c1c1e', borderRadius: 20, padding: 16,
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <div style={{ fontSize: 12, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {exam.agency}
                                </div>
                                <div style={{
                                    fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 6,
                                    background: exam.eligibilityStatus === 'Eligible' ? 'rgba(50, 215, 75, 0.15)' : 'rgba(255, 69, 58, 0.15)',
                                    color: exam.eligibilityStatus === 'Eligible' ? '#32d74b' : '#ff453a'
                                }}>
                                    {exam.eligibilityStatus}
                                </div>
                            </div>

                            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#fff', lineHeight: 1.3, marginBottom: 16 }}>
                                {exam.title}
                            </h3>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: 12, color: '#86868b' }}>Vacancies</div>
                                    <div style={{ fontSize: 14, color: '#f5f5f7', fontWeight: 500 }}>{exam.vacancies}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 12, color: '#86868b' }}>Closing Date</div>
                                    <div style={{ fontSize: 14, color: '#ffcc00', fontWeight: 500 }}>{exam.lastDate}</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <Link href={`/exam/${exam.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                                    <button style={{
                                        width: '100%', background: '#2c2c2e', color: '#fff', border: 'none',
                                        padding: '12px', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer'
                                    }}>
                                        View Details
                                    </button>
                                </Link>
                                <button style={{
                                    flex: 1, background: exam.tracked ? 'rgba(50, 215, 75, 0.1)' : '#0a84ff',
                                    color: exam.tracked ? '#32d74b' : '#fff', border: 'none',
                                    padding: '12px', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6
                                }}>
                                    <Crosshair size={18} />
                                    {exam.tracked ? 'Tracking' : 'Track'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .hide-scrollbar::-webkit-scrollbar { display: none; }
            `}} />
        </div>
    )
}
