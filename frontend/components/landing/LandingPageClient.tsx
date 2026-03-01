'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Bell, FileText, Shield, ChevronRight, ChevronDown, Train, Building2, GraduationCap, Sword, Mail, ClipboardList } from 'lucide-react'
import { useState } from 'react'

export function LandingPageClient() {
    const [openFaq, setOpenFaq] = useState<number | null>(null)

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.7, ease: 'easeOut' as const }
        }
    }

    const faqs = [
        { q: 'Is ExamTracker really free?', a: 'Yes, 100% free. We are supported by minimal, non-intrusive ads. There are no premium plans, no paywalls, and no credit cards required — ever.' },
        { q: 'Which exams do you cover?', a: 'We cover 150+ exams including SSC (CGL, CHSL, MTS), Railway (NTPC, Group D), Banking (IBPS, SBI), UPSC, and major State PSC exams across India.' },
        { q: 'How accurate are your eligibility checks?', a: 'We parse the official notification PDFs directly. Our system extracts exact age limits, educational qualifications, and category-wise vacancies from the source document.' },
        { q: 'Do I need to download PDFs myself?', a: 'No. That\'s exactly what we do for you. The moment a new notification is published, our system reads and processes it automatically.' },
        { q: 'Can I track state-level exams too?', a: 'Yes. We cover state PSC exams in addition to central government exams. Support for more state boards is being added continuously.' },
    ]

    const examOrgs = [
        { label: 'SSC', icon: <GraduationCap size={18} />, desc: 'Staff Selection Commission' },
        { label: 'Railway', icon: <Train size={18} />, desc: 'RRB / RRC' },
        { label: 'Banking', icon: <Building2 size={18} />, desc: 'IBPS / SBI / RBI' },
        { label: 'Defence', icon: <Sword size={18} />, desc: 'Army / Navy / Air Force' },
        { label: 'UPSC', icon: <Shield size={18} />, desc: 'Civil Services' },
    ]

    return (
        <main style={{ minHeight: '100vh', background: '#000000', color: '#f5f5f7', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>

            {/* ── Sticky Nav ───────────────────────────────────────────────── */}
            <nav style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.72)', backdropFilter: 'saturate(180%) blur(20px)',
                WebkitBackdropFilter: 'saturate(180%) blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}>
                <div style={{ width: '100%', maxWidth: 1024, padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 17, fontWeight: 600, color: '#f5f5f7', textDecoration: 'none', letterSpacing: '-0.01em', lineHeight: 1 }}>
                        <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#0a84ff', display: 'block', flexShrink: 0 }} />
                        <span style={{ position: 'relative', top: '1px' }}>ExamTracker</span>
                    </a>
                    <div style={{ display: 'flex', gap: 24, fontSize: 13, fontWeight: 500, color: '#a1a1a6', alignItems: 'center' }}>
                        <a href="#how-it-works" className="hidden sm:block" style={{ color: 'inherit', textDecoration: 'none' }}>Features</a>
                        <a href="#setup" className="hidden sm:block" style={{ color: 'inherit', textDecoration: 'none' }}>Profile</a>
                        <a href="#faq" className="hidden sm:block" style={{ color: 'inherit', textDecoration: 'none' }}>FAQ</a>
                        <Link href="/register" style={{ background: '#fff', color: '#000', padding: '6px 14px', borderRadius: 980, fontWeight: 600, textDecoration: 'none' }}>
                            Sign In
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <section style={{ paddingTop: 160, paddingBottom: 40, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <motion.div
                    style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto', padding: '0 24px' }}
                    variants={containerVariants} initial="hidden" animate="visible"
                >
                    <motion.h1
                        variants={itemVariants}
                        style={{ fontSize: 'clamp(44px, 8vw, 84px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 24, padding: '0 8px', background: 'linear-gradient(180deg, #fff 0%, #a1a1a6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                    >
                        Your exams.<br />Tracked automatically.
                    </motion.h1>

                    <motion.p
                        variants={itemVariants}
                        style={{ fontSize: 'clamp(20px, 4vw, 24px)', fontWeight: 500, color: '#a1a1a6', letterSpacing: '-0.01em', margin: '0 auto 40px', maxWidth: 500, lineHeight: 1.4 }}
                    >
                        Pro-level eligibility intelligence. For free.
                    </motion.p>

                    <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <Link href="/register" style={{ background: '#0a84ff', color: '#fff', padding: '16px 32px', borderRadius: 980, fontSize: 17, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            Get started free <ChevronRight size={18} />
                        </Link>
                    </motion.div>

                    <motion.div variants={itemVariants} style={{ marginTop: 40 }}>
                        <p style={{ fontSize: 13, color: '#86868b', fontWeight: 500 }}>Takes 3 minutes • No credit card required</p>
                    </motion.div>
                </motion.div>

                {/* Hero Visualization */}
                <motion.div
                    initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.5, ease: 'easeOut' as const }}
                    style={{ marginTop: 60, height: 420, maxWidth: 900, margin: '60px auto 0', background: 'linear-gradient(180deg, #1c1c1e 0%, #000 100%)', borderTopLeftRadius: 40, borderTopRightRadius: 40, borderTop: '1px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}
                >
                    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)', width: '80%', height: 1, background: 'radial-gradient(circle, rgba(10,132,255,0.4) 0%, transparent 100%)' }} />
                    <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>

                        {/* Card: eligible */}
                        <div style={{ width: '100%', maxWidth: 440, background: '#1c1c1e', padding: '16px 20px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: 16, opacity: 0.95 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(10, 132, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <FileText size={20} color="#0a84ff" />
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 2 }}>SSC CGL 2026</div>
                                <div style={{ fontSize: 13, color: '#32d74b', fontWeight: 500 }}>You qualify for 12 posts</div>
                            </div>
                            <div style={{ background: '#0a84ff', color: '#fff', fontSize: 13, fontWeight: 600, padding: '6px 16px', borderRadius: 100 }}>Apply</div>
                        </div>

                        {/* Card: complete profile */}
                        <div style={{ width: '90%', maxWidth: 380, background: '#1c1c1e', padding: '14px 20px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 16, opacity: 0.65 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <FileText size={16} color="#86868b" />
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <div style={{ fontSize: 15, fontWeight: 500, color: '#86868b', marginBottom: 2 }}>RRB NTPC</div>
                                <div style={{ fontSize: 12, color: '#555' }}>Complete your profile to check eligibility</div>
                            </div>
                        </div>

                        {/* Skeleton */}
                        <div style={{ width: '80%', maxWidth: 320, background: '#1c1c1e', padding: '14px 20px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: 16, opacity: 0.25 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
                            <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* ── Trust Stats ──────────────────────────────────────────────── */}
            <section style={{ padding: '0 24px 60px', background: '#000', textAlign: 'center' }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    transition={{ duration: 0.7, ease: 'easeOut' as const }}
                    style={{ maxWidth: 600, margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '60px', padding: '0 0 32px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: 'clamp(36px, 5vw, 44px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>150+</div>
                        <div style={{ fontSize: 16, color: '#86868b', fontWeight: 500, marginTop: 8 }}>Exams Tracked</div>
                    </div>
                    <div style={{ width: 1, height: 60, background: 'rgba(255,255,255,0.1)' }} />
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: 'clamp(36px, 5vw, 44px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>100%</div>
                        <div style={{ fontSize: 16, color: '#86868b', fontWeight: 500, marginTop: 8 }}>Free for Aspirants</div>
                    </div>
                </motion.div>
            </section>

            {/* ── Setup Explanation (first per ui.md flow) ─────────────────── */}
            <section id="setup" style={{ padding: '100px 24px', background: '#000' }}>
                <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: 24 }}>
                        <ClipboardList size={56} color="#f5f5f7" style={{ flexShrink: 0 }} />
                    </div>
                    <h2 style={{ fontSize: 'clamp(32px, 6vw, 44px)', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 20, lineHeight: 1.15 }}>
                        One detailed setup.<br />Zero confusion later.
                    </h2>
                    <p style={{ fontSize: 18, color: '#a1a1a6', maxWidth: 640, margin: '0 auto 60px', lineHeight: 1.5 }}>
                        When you join, we ask you to complete a 9-step profile. It takes a few minutes, but it allows us to perfectly match you with government jobs for the rest of your preparation. Here's why we need it:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                        {[
                            { title: 'Date of Birth & Category', desc: 'Age limits change based on your category (UR, OBC, SC, ST). We use this to calculate exact relaxations.' },
                            { title: 'Education Degrees', desc: 'Different posts need 10th, 12th, or Typing skills. We match your exact qualifications to the rules.' },
                            { title: 'Physical Details', desc: 'Police & defense jobs require exact height & chest measurements. We check this so you don\'t waste time.' },
                            { title: 'Special Quotas', desc: 'Are you an Ex-serviceman or PwD candidate? We find the specific seats reserved just for you.' }
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                style={{ background: '#1c1c1e', padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}
                            >
                                <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#fff', letterSpacing: '-0.01em' }}>{item.title}</h4>
                                <p style={{ fontSize: 14, color: '#86868b', lineHeight: 1.5 }}>{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How ExamTracker Helps You (after setup per ui.md) ────────── */}
            <section id="how-it-works" style={{ padding: '100px 24px', background: '#000' }}>
                <div style={{ maxWidth: 860, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 60 }}>
                        <h2 style={{ fontSize: 'clamp(32px, 6vw, 44px)', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 16, lineHeight: 1.15 }}>
                            We do the hard work.<br />You focus on studying.
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: '-50px' }}
                            transition={{ duration: 0.7, ease: 'easeOut' as const }}
                            style={{ background: '#1c1c1e', borderRadius: 32, padding: '40px 32px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
                        >
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <h3 style={{ fontSize: 26, fontWeight: 600, marginBottom: 12, lineHeight: 1.25, letterSpacing: '-0.01em' }}>Find out if you<br />qualify, instantly.</h3>
                                <p style={{ fontSize: 16, color: '#a1a1a6', lineHeight: 1.5 }}>
                                    Government exam notices are big PDFs with confusing rules. Our system reads them and tells you exactly which posts you can apply for based on your age, category, and education.
                                </p>
                            </div>
                            <div style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.05 }}>
                                <FileText size={180} />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: '-50px' }}
                            transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' as const }}
                            style={{ background: '#1c1c1e', borderRadius: 32, padding: '40px 32px', display: 'flex', flexDirection: 'column' }}
                        >
                            <Mail size={40} color="#0a84ff" style={{ marginBottom: 20, flexShrink: 0 }} />
                            <h3 style={{ fontSize: 26, fontWeight: 600, marginBottom: 12, lineHeight: 1.25, letterSpacing: '-0.01em' }}>Email Alerts for<br />every update.</h3>
                            <p style={{ fontSize: 16, color: '#a1a1a6', lineHeight: 1.5 }}>
                                Start dates, last dates, fee deadlines, and exam dates. We send you direct email reminders so you never miss an opportunity again.
                            </p>
                        </motion.div>
                    </div>

                    {/* Mid-page CTA (varied copy) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                        transition={{ duration: 0.7, ease: 'easeOut' as const }}
                        style={{ textAlign: 'center', marginTop: 60 }}
                    >
                        <Link href="/register" style={{ background: 'transparent', color: '#f5f5f7', padding: '14px 28px', borderRadius: 980, fontSize: 16, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.2)' }}>
                            See which exams you qualify for <ChevronRight size={16} />
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* ── Popular Exam Bodies ──────────────────────────────────────── */}
            <section style={{ padding: '0 24px 100px', background: '#000' }}>
                <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
                    <p style={{ fontSize: 14, color: '#555', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 32 }}>
                        Tracking exams from 50+ organizations
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                        {examOrgs.map((org, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                transition={{ delay: i * 0.08 }}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1c1c1e', padding: '10px 20px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.06)' }}
                            >
                                <span style={{ color: '#86868b' }}>{org.icon}</span>
                                <span style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f7' }}>{org.label}</span>
                                <span style={{ fontSize: 12, color: '#555', display: 'none' }}>{org.desc}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Pricing (Free) ───────────────────────────────────────────── */}
            <section style={{ padding: '100px 24px', background: '#000', borderTop: '1px solid #1c1c1e' }}>
                <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontSize: 'clamp(36px, 7vw, 56px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 20, background: 'linear-gradient(180deg, #fff 0%, #a1a1a6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        100% Free. Always.
                    </h2>
                    <p style={{ fontSize: 22, color: '#f5f5f7', fontWeight: 500, marginBottom: 16 }}>
                        No premium walls. No hidden fees.
                    </p>
                    <p style={{ fontSize: 16, color: '#86868b', maxWidth: 480, margin: '0 auto', lineHeight: 1.5 }}>
                        Aspirants have enough expenses with coaching and forms. We are proudly ad-supported and completely free to use.
                    </p>
                </div>
            </section>

            {/* ── FAQ ─────────────────────────────────────────────────────── */}
            <section id="faq" style={{ padding: '100px 24px', background: '#000', borderTop: '1px solid #1c1c1e' }}>
                <div style={{ maxWidth: 680, margin: '0 auto' }}>
                    <h2 style={{ fontSize: 'clamp(28px, 5vw, 36px)', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 48, textAlign: 'center', lineHeight: 1.15 }}>
                        Common questions.
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {faqs.map((faq, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                transition={{ delay: i * 0.05 }}
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                            >
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, textAlign: 'left' }}
                                >
                                    <span style={{ fontSize: 17, fontWeight: 500, color: '#f5f5f7', letterSpacing: '-0.01em' }}>{faq.q}</span>
                                    <motion.span
                                        animate={{ rotate: openFaq === i ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ flexShrink: 0, color: '#86868b' }}
                                    >
                                        <ChevronDown size={20} />
                                    </motion.span>
                                </button>
                                <AnimatePresence initial={false}>
                                    {openFaq === i && (
                                        <motion.div
                                            key="answer"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.25, ease: 'easeOut' as const }}
                                            style={{ overflow: 'hidden' }}
                                        >
                                            <p style={{ fontSize: 15, color: '#86868b', lineHeight: 1.6, paddingBottom: 20 }}>{faq.a}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Final CTA ────────────────────────────────────────────────── */}
            <section style={{ padding: '100px 24px', textAlign: 'center', background: '#1c1c1e' }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                    transition={{ duration: 0.7, ease: 'easeOut' as const }}
                    style={{ maxWidth: 440, margin: '0 auto' }}
                >
                    <h2 style={{ fontSize: 32, fontWeight: 600, marginBottom: 12, letterSpacing: '-0.01em' }}>
                        Ready to start?
                    </h2>
                    <p style={{ fontSize: 16, color: '#86868b', marginBottom: 32, lineHeight: 1.5 }}>
                        Sign up free. No spam, only important updates.
                    </p>
                    <Link href="/register" style={{ background: '#fff', color: '#000', padding: '14px 28px', borderRadius: 980, fontSize: 16, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
                        Sign up for free
                    </Link>
                </motion.div>
            </section>

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <footer style={{ padding: '40px 24px', background: '#000', borderTop: '1px solid #1c1c1e' }}>
                <div style={{ maxWidth: 1024, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
                        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600, color: '#f5f5f7', textDecoration: 'none', letterSpacing: '-0.01em', lineHeight: 1 }}>
                            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#0a84ff', display: 'block', flexShrink: 0 }} />
                            <span style={{ position: 'relative', top: '1px' }}>ExamTracker</span>
                        </a>
                        <div style={{ display: 'flex', gap: 24 }}>
                            <a href="#" style={{ fontSize: 13, color: '#86868b', textDecoration: 'none', fontWeight: 500 }}>Privacy Policy</a>
                            <a href="#" style={{ fontSize: 13, color: '#86868b', textDecoration: 'none', fontWeight: 500 }}>Terms of Use</a>
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 10 }}>
                        <p style={{ fontSize: 12, color: '#555' }}>Copyright © 2026 ExamTracker India. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </main>
    )
}
