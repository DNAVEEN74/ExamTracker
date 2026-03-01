'use client'

import { ChevronLeft } from 'lucide-react'
import { useEffect, useState } from 'react'

interface OnboardingLayoutProps {
    step: number        // 0-9 (step 0 = email registration, no progress bar)
    totalSteps?: number // default 9
    onBack?: () => void
    children: React.ReactNode
}

export default function OnboardingLayout({
    step,
    totalSteps = 9,
    onBack,
    children,
}: OnboardingLayoutProps) {
    const showProgress = step > 0
    const progress = showProgress ? (step / totalSteps) * 100 : 0
    const [mounted, setMounted] = useState(false)

    // Using a fast CSS-only mount animation instead of Framer Motion for tier 3/4 network performance
    useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <div style={{
            minHeight: '100dvh',
            background: '#000000',
            color: '#f5f5f7',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        }}>
            {/* ── Apple-Style Header ─────────────────────────────────────── */}
            <header style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(0, 0, 0, 0.72)',
                backdropFilter: 'saturate(180%) blur(20px)',
                WebkitBackdropFilter: 'saturate(180%) blur(20px)',
                borderBottom: showProgress ? 'none' : '1px solid rgba(255,255,255,0.08)',
                height: 60,
            }}>
                {/* Back button or Placeholder */}
                <div style={{ width: 80, display: 'flex', alignItems: 'center' }}>
                    {onBack && step > 0 && (
                        <button
                            onClick={onBack}
                            style={{
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: '#0a84ff', fontSize: 17, display: 'flex',
                                alignItems: 'center', margin: 0, padding: 0,
                                transition: 'opacity 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.opacity = '0.7'}
                            onMouseOut={e => e.currentTarget.style.opacity = '1'}
                        >
                            <ChevronLeft size={24} style={{ marginLeft: -8 }} />
                            Back
                        </button>
                    )}
                </div>

                {/* Step counter */}
                {showProgress && (
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#86868b', letterSpacing: '0.05em' }}>
                        STEP {step} OF {totalSteps}
                    </div>
                )}
                {!showProgress && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#0a84ff', display: 'block' }} />
                        <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em' }}>ExamTracker</span>
                    </div>
                )}

                {/* Right Placeholder for balancing */}
                <div style={{ width: 80 }} />
            </header>

            {/* ── Progress Bar ───────────────────────────────────────────── */}
            {showProgress && (
                <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', width: '100%' }}>
                    <div
                        style={{
                            height: '100%',
                            background: '#0a84ff',
                            width: `${progress}%`,
                            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                    />
                </div>
            )}

            {/* ── Content Area ───────────────────────────────────────────── */}
            <main style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '48px 24px 32px',
                maxWidth: 480,
                width: '100%',
                margin: '0 auto',
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(10px)',
                transition: 'opacity 0.4s ease, transform 0.4s ease'
            }}>
                {children}
            </main>
        </div>
    )
}
