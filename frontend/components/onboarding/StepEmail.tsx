'use client'

import { useState, useRef, useEffect } from 'react'

interface StepEmailProps {
    onComplete: (email: string) => void
}

export default function StepEmail({ onComplete }: StepEmailProps) {
    const [email, setEmail] = useState('')
    const [stage, setStage] = useState<'EMAIL' | 'OTP'>('EMAIL')
    const [otp, setOtp] = useState(['', '', '', '', '', ''])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [countdown, setCountdown] = useState(0)
    const [attempts, setAttempts] = useState(3)
    const otpRefs = useRef<(HTMLInputElement | null)[]>([])

    // Countdown timer for resend
    useEffect(() => {
        if (countdown <= 0) return
        const t = setTimeout(() => setCountdown(c => c - 1), 1000)
        return () => clearTimeout(t)
    }, [countdown])

    function handleEmailChange(val: string) {
        setEmail(val.trim())
        setError('')
    }

    async function handleSendOtp() {
        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            setError('Please enter a valid email address')
            return
        }
        setLoading(true)
        setError('')
        try {
            // Simulate API request (kept lightweight)
            await new Promise(r => setTimeout(r, 600))
            setStage('OTP')
            setCountdown(60)
            setTimeout(() => otpRefs.current[0]?.focus(), 50)
        } catch {
            setError('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    function handleOtpChange(index: number, val: string) {
        const digit = val.replace(/\D/g, '').slice(-1)
        const newOtp = [...otp]
        newOtp[index] = digit
        setOtp(newOtp)
        setError('')

        if (digit && index < 5) {
            otpRefs.current[index + 1]?.focus()
        }

        if (digit && index === 5) {
            const full = [...newOtp.slice(0, 5), digit].join('')
            if (full.length === 6) verifyOtp(full)
        }
    }

    function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus()
        }
    }

    function handleOtpPaste(e: React.ClipboardEvent) {
        e.preventDefault()
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
        const newOtp = [...otp]
        pasted.split('').forEach((d, i) => { if (i < 6) newOtp[i] = d })
        setOtp(newOtp)
        if (pasted.length === 6) verifyOtp(pasted)
        else otpRefs.current[pasted.length]?.focus()
    }

    async function verifyOtp(code: string) {
        setLoading(true)
        setError('')
        try {
            await new Promise(r => setTimeout(r, 600))

            if (code.length === 6) {
                onComplete(email)
            }
        } catch {
            setAttempts(a => a - 1)
            setError(`Incorrect code. ${attempts - 1} attempt${attempts - 1 !== 1 ? 's' : ''} remaining.`)
            if (attempts <= 1) {
                setStage('EMAIL')
                setOtp(['', '', '', '', '', ''])
                setAttempts(3)
            }
        } finally {
            setLoading(false)
        }
    }

    if (stage === 'OTP') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <h2 style={{ fontSize: 'clamp(28px, 6vw, 34px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 12, lineHeight: 1.15 }}>
                    Enter the code.
                </h2>
                <p style={{ color: '#86868b', fontSize: 16, marginBottom: 8, lineHeight: 1.5 }}>
                    We sent a 6-digit code to <strong style={{ color: '#fff', fontWeight: 600 }}>{email}</strong>
                </p>
                <button
                    onClick={() => { setStage('EMAIL'); setOtp(['', '', '', '', '', '']) }}
                    style={{ background: 'none', border: 'none', color: '#0a84ff', fontSize: 14, fontWeight: 500, cursor: 'pointer', padding: 0, marginBottom: 40, textAlign: 'left' }}
                >
                    Change email
                </button>

                <div style={{ display: 'flex', gap: 8, marginBottom: 24 }} onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                        <input
                            key={i}
                            ref={el => { otpRefs.current[i] = el }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={e => handleOtpChange(i, e.target.value)}
                            onKeyDown={e => handleOtpKeyDown(i, e)}
                            disabled={loading}
                            style={{
                                flex: 1,
                                minWidth: 0,
                                height: 56,
                                textAlign: 'center',
                                fontSize: 24,
                                fontWeight: 600,
                                background: '#1c1c1e',
                                color: '#fff',
                                border: `1px solid ${error ? '#ff3b30' : digit ? '#0a84ff' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: 12,
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                padding: 0
                            }}
                            onFocus={e => e.target.style.borderColor = '#0a84ff'}
                            onBlur={e => e.target.style.borderColor = error ? '#ff3b30' : digit ? '#0a84ff' : 'rgba(255,255,255,0.1)'}
                        />
                    ))}
                </div>

                {error && <p style={{ color: '#ff3b30', fontSize: 14, marginBottom: 16, fontWeight: 500 }}>{error}</p>}

                <button
                    onClick={() => verifyOtp(otp.join(''))}
                    disabled={loading || otp.join('').length < 6}
                    style={{
                        background: (loading || otp.join('').length < 6) ? '#2c2c2e' : '#fff',
                        color: (loading || otp.join('').length < 6) ? '#86868b' : '#000',
                        padding: '16px',
                        borderRadius: 980,
                        fontSize: 17,
                        fontWeight: 600,
                        border: 'none',
                        cursor: (loading || otp.join('').length < 6) ? 'not-allowed' : 'pointer',
                        transition: 'background 0.2s, color 0.2s',
                        width: '100%',
                        marginBottom: 16
                    }}
                >
                    {loading ? 'Verifying...' : 'Continue'}
                </button>

                <div style={{ textAlign: 'center' }}>
                    {countdown > 0 ? (
                        <span style={{ fontSize: 14, color: '#86868b' }}>Resend code in {countdown}s</span>
                    ) : (
                        <button
                            onClick={handleSendOtp}
                            disabled={loading}
                            style={{ background: 'none', border: 'none', color: '#0a84ff', fontSize: 14, cursor: 'pointer', padding: 0 }}
                        >
                            Resend code
                        </button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h1 style={{ fontSize: 'clamp(32px, 7vw, 40px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 16, lineHeight: 1.15 }}>
                Track your exams.<br />Zero spam.
            </h1>
            <p style={{ color: '#a1a1a6', fontSize: 17, marginBottom: 40, lineHeight: 1.4 }}>
                Enter your email to sign up or log in. No passwords required.
            </p>

            <div style={{ position: 'relative', marginBottom: 20 }}>
                <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={e => handleEmailChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) && handleSendOtp()}
                    style={{
                        width: '100%',
                        background: '#1c1c1e',
                        border: `1px solid ${error ? '#ff3b30' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 16,
                        padding: '18px 20px',
                        fontSize: 17,
                        color: '#fff',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        WebkitAppearance: 'none'
                    }}
                    onFocus={e => e.target.style.borderColor = '#0a84ff'}
                    onBlur={e => e.target.style.borderColor = error ? '#ff3b30' : 'rgba(255,255,255,0.1)'}
                />
            </div>

            {error && <p style={{ color: '#ff3b30', fontSize: 14, marginBottom: 16, fontWeight: 500 }}>{error}</p>}

            <button
                onClick={handleSendOtp}
                disabled={!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) || loading}
                style={{
                    background: (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) || loading) ? '#2c2c2e' : '#fff',
                    color: (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) || loading) ? '#86868b' : '#000',
                    padding: '16px',
                    borderRadius: 980,
                    fontSize: 17,
                    fontWeight: 600,
                    border: 'none',
                    cursor: (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) || loading) ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s, color 0.2s',
                    width: '100%',
                    marginBottom: 32
                }}
            >
                {loading ? 'Sending...' : 'Continue'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '0 0 32px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                <span style={{ fontSize: 13, color: '#86868b', fontWeight: 500 }}>or continue with</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            </div>

            <button
                onClick={() => alert('Google OAuth — configure Supabase to enable')}
                style={{
                    background: '#1c1c1e',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    padding: '14px',
                    borderRadius: 980,
                    fontSize: 16,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#2c2c2e'}
                onMouseOut={e => e.currentTarget.style.background = '#1c1c1e'}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
            </button>
        </div>
    )
}
