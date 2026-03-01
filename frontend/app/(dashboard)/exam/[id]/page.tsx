'use client'

import { useState } from 'react'
import { ArrowLeft, Crosshair, Share, Calendar, Briefcase, Info, Download, IndianRupee, MapPin, ExternalLink, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ── Realistic Mock Data (Based on AI Extraction Schema) ────────────────
const EXAM_DETAIL = {
    id: 'ssc-cgl-2024',
    title: 'SSC Combined Graduate Level (CGL) 2024',
    agency: 'Staff Selection Commission (SSC)',
    postName: 'Inspector (Income Tax/CGST), Assistant Section Officer, Assistant Audit Officer & Others',
    advertisementNumber: 'F. No. HQ-PPII03(1)/1/2024-PP_II',
    description: 'The SSC CGL is a national-level exam conducted to recruit staff for various Group B and Group C posts in ministries, departments, and organizations of the Government of India.',
    tags: ['Graduation Required', 'Central Govt', 'All India Base'],
    vacancies: '17,727 (Tentative)',
    salary: '₹44,900 - ₹1,42,400 (Level 7)',
    location: 'All India',
    dates: {
        notificationDate: 'June 24, 2024',
        applyStart: 'June 24, 2024',
        applyEnd: 'July 24, 2024 (23:00)',
        correctionWindow: 'August 10 - August 11, 2024',
        examDate: 'September - October 2024 (Tier 1)'
    },
    eligibility: {
        age: '18 to 32 Years (varies by post. Age reckoned as on 01-08-2024)',
        education: 'Bachelor’s Degree from a recognized University or Institute. Students in their final year can also apply (degree required before 01-08-2024).',
        special: 'Desirable qualifications for Auditor/Junior Statistical Officer apply.'
    },
    fees: {
        general: '₹ 100/-',
        women_sc_st_pwd_esm: 'Exempted (Nil)',
        paymentMode: 'BHIM UPI, Net Banking, Visa, Mastercard, Maestro, RuPay Credit or Debit cards'
    },
    files: {
        notificationPdf: 'https://ssc.nic.in/portal/cgl-notification.pdf',
        officialWebsite: 'https://ssc.nic.in'
    }
}

// ── Component ──────────────────────────────────────────────────────────
export default function ExamDetailPage() {
    const router = useRouter()
    const [isTracked, setIsTracked] = useState(false)
    const [showAd, setShowAd] = useState(true)

    return (
        <div style={{ paddingBottom: 160, maxWidth: 600, margin: '0 auto' }}>

            {/* Sticky Header */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 10,
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
                <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: '#0a84ff', display: 'flex', alignItems: 'center', gap: 4, fontSize: 17, cursor: 'pointer', padding: 0 }}>
                    <ArrowLeft size={22} />
                    Back
                </button>
                <div style={{ display: 'flex', gap: 16 }}>
                    <button
                        onClick={() => setIsTracked(!isTracked)}
                        style={{ background: 'transparent', border: 'none', color: isTracked ? '#32d74b' : '#fff', cursor: 'pointer', padding: 0 }}
                    >
                        <Crosshair size={22} />
                    </button>
                    <button style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}>
                        <Share size={22} />
                    </button>
                </div>
            </div>

            {/* Hero Section */}
            <div style={{ padding: '24px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 13, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    {EXAM_DETAIL.agency}
                </div>
                <h1 style={{ fontSize: 32, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 16 }}>
                    {EXAM_DETAIL.title}
                </h1>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                    {EXAM_DETAIL.tags.map(t => (
                        <span key={t} style={{ background: 'rgba(10, 132, 255, 0.15)', color: '#0a84ff', fontSize: 12, padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>
                            {t}
                        </span>
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#1c1c1e', padding: '16px', borderRadius: 16, marginBottom: 20 }}>
                    <MapPin color="#ff453a" size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                        <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{EXAM_DETAIL.postName}</div>
                        <div style={{ color: '#86868b', fontSize: 13, marginTop: 4 }}>Job Location: {EXAM_DETAIL.location}</div>
                    </div>
                </div>

                <p style={{ color: '#a1a1a6', fontSize: 15, lineHeight: 1.5 }}>
                    {EXAM_DETAIL.description}
                </p>
            </div>

            {/* Action Buttons (Download & Track) */}
            <div style={{ padding: '24px 16px', display: 'flex', gap: 12 }}>
                <button style={{
                    flex: 1, background: '#1c1c1e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
                    padding: '14px', borderRadius: 16, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}>
                    <Download size={18} />
                    Notification PDF
                </button>

                <button
                    onClick={() => setIsTracked(!isTracked)}
                    style={{
                        flex: 1, background: isTracked ? 'rgba(50, 215, 75, 0.1)' : '#0a84ff',
                        color: isTracked ? '#32d74b' : '#fff', border: 'none',
                        padding: '14px', borderRadius: 16, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}>
                    <Crosshair size={18} />
                    {isTracked ? 'Tracking Active' : 'Track This Exam'}
                </button>
            </div>


            {/* Apple Settings-Style Blocks */}
            <div style={{ padding: '0 16px', marginTop: 16 }}>
                <h2 style={{ fontSize: 14, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: 16, marginBottom: 8, fontWeight: 600 }}>Key Details</h2>
                <div style={{ background: '#1c1c1e', borderRadius: 16, overflow: 'hidden' }}>
                    <BlockRow icon={<Briefcase size={20} color="#32d74b" />} label="Total Vacancies" value={EXAM_DETAIL.vacancies} />
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginLeft: 52 }} />
                    <BlockRow icon={<IndianRupee size={20} color="#0a84ff" />} label="Expected Salary" value={EXAM_DETAIL.salary} />
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginLeft: 52 }} />
                    <BlockRow icon={<Info size={20} color="#bf5af2" />} label="Advt. Number" value={EXAM_DETAIL.advertisementNumber} />
                </div>
            </div>

            <div style={{ padding: '0 16px', marginTop: 32 }}>
                <h2 style={{ fontSize: 14, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: 16, marginBottom: 8, fontWeight: 600 }}>Important Dates</h2>
                <div style={{ background: '#1c1c1e', borderRadius: 16, overflow: 'hidden' }}>
                    <BlockRow icon={<Calendar size={20} color="#86868b" />} label="Notification Released" value={EXAM_DETAIL.dates.notificationDate} />
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginLeft: 52 }} />
                    <BlockRow icon={<Calendar size={20} color="#32d74b" />} label="Application Start" value={EXAM_DETAIL.dates.applyStart} />
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginLeft: 52 }} />
                    <BlockRow icon={<Calendar size={20} color="#ff453a" />} label="Last Date to Apply" value={EXAM_DETAIL.dates.applyEnd} />
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginLeft: 52 }} />
                    <BlockRow icon={<Calendar size={20} color="#ff9f0a" />} label="Correction Window" value={EXAM_DETAIL.dates.correctionWindow} />
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginLeft: 52 }} />
                    <BlockRow icon={<Calendar size={20} color="#5e5ce6" />} label="Tentative Exam Date" value={EXAM_DETAIL.dates.examDate} />
                </div>
            </div>

            <div style={{ padding: '0 16px', marginTop: 32 }}>
                <h2 style={{ fontSize: 14, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: 16, marginBottom: 8, fontWeight: 600 }}>Eligibility & Fees</h2>
                <div style={{ background: '#1c1c1e', borderRadius: 16, padding: '20px' }}>
                    <div style={{ fontSize: 16, color: '#fff', fontWeight: 600, marginBottom: 4 }}>Age Limit</div>
                    <div style={{ fontSize: 14, color: '#a1a1a6', marginBottom: 20, lineHeight: 1.4 }}>{EXAM_DETAIL.eligibility.age}</div>

                    <div style={{ fontSize: 16, color: '#fff', fontWeight: 600, marginBottom: 4 }}>Educational Qualification</div>
                    <div style={{ fontSize: 14, color: '#a1a1a6', marginBottom: 20, lineHeight: 1.4 }}>{EXAM_DETAIL.eligibility.education}</div>

                    <div style={{ fontSize: 16, color: '#fff', fontWeight: 600, marginBottom: 4 }}>Application Fee</div>
                    <div style={{ fontSize: 14, color: '#a1a1a6', lineHeight: 1.4 }}>
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                            <li style={{ marginBottom: 4 }}>General/OBC: <strong style={{ color: '#fff' }}>{EXAM_DETAIL.fees.general}</strong></li>
                            <li>Women/SC/ST/PwD/ESM: <strong style={{ color: '#32d74b' }}>{EXAM_DETAIL.fees.women_sc_st_pwd_esm}</strong></li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Apply Button (End of Content) */}
            <div style={{ padding: '40px 16px 80px', display: 'flex', justifyContent: 'center' }}>
                <button style={{
                    background: '#fff', color: '#000', width: '100%', maxWidth: 400,
                    padding: '16px', borderRadius: 980, fontSize: 17, fontWeight: 600, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}>
                    Apply on Official Website
                    <ExternalLink size={18} />
                </button>
            </div>

            {/* Sticky Native Ad */}
            <div style={{
                position: 'fixed', bottom: 84, left: 0, right: 0, // Above bottom nav
                zIndex: 10, display: 'flex', justifyContent: 'center', pointerEvents: 'none' // Allow clicking through empty space
            }}>
                {showAd && (
                    <div style={{
                        margin: '0 16px 16px', width: '100%', maxWidth: 568, pointerEvents: 'auto',
                        background: 'linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%)',
                        borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)',
                        padding: '16px', boxShadow: '0 -4px 20px rgba(0,0,0,0.5)', position: 'relative'
                    }}>
                        <button
                            onClick={() => setShowAd(false)}
                            style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: 4, color: '#a1a1a6', cursor: 'pointer' }}
                        >
                            <X size={16} />
                        </button>
                        <div style={{ fontSize: 10, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Advertisement</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <h4 style={{ color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Oswaal Books SSC CGL</h4>
                                <p style={{ color: '#86868b', fontSize: 12 }}>30% off mocks with code EXAM30</p>
                            </div>
                            <button style={{ background: '#0a84ff', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600 }}>Get it</button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    )
}

function BlockRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: 12 }}>
            <div style={{ width: 28, display: 'flex', justifyContent: 'center' }}>
                {icon}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, color: '#fff', fontWeight: 500 }}>{label}</div>
            </div>
            <div style={{ fontSize: 14, color: '#a1a1a6', textAlign: 'right', maxWidth: '50%' }}>
                {value}
            </div>
        </div>
    )
}
