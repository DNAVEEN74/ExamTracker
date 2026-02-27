'use client'

interface OnboardingLayoutProps {
    step: number        // 0-9 (step 0 = phone, no progress bar)
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

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--background)',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Header */}
            <header style={{
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: showProgress ? 'none' : '1px solid var(--border)',
            }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'var(--accent)', display: 'inline-block', flexShrink: 0,
                    }} />
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                        ExamTracker
                    </span>
                </div>

                {/* Back button */}
                {onBack && step > 0 && (
                    <button
                        onClick={onBack}
                        style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: 'var(--text-secondary)', fontSize: 14, display: 'flex',
                            alignItems: 'center', gap: 4, padding: '6px 0',
                        }}
                    >
                        ← Back
                    </button>
                )}

                {/* Step counter */}
                {showProgress && (
                    <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                        {step}/{totalSteps}
                    </span>
                )}
            </header>

            {/* Progress bar */}
            {showProgress && (
                <div className="progress-bar" style={{ borderRadius: 0 }}>
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {/* Content */}
            <main style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '40px 24px 32px',
                maxWidth: 480,
                width: '100%',
                margin: '0 auto',
            }}>
                {children}
            </main>
        </div>
    )
}
