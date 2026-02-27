'use client'

import { useState, useRef, useEffect } from 'react'

interface StepPhoneProps {
    onComplete: (phone: string) => void
}

export default function StepPhone({ onComplete }: StepPhoneProps) {
    const [phone, setPhone] = useState('')
    const [stage, setStage] = useState<'PHONE' | 'OTP'>('PHONE')
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

    function handlePhoneChange(val: string) {
        const digits = val.replace(/\D/g, '').slice(0, 10)
        setPhone(digits)
        setError('')
    }

    async function handleSendOtp() {
        if (phone.length !== 10) return
        setLoading(true)
        setError('')
        try {
            // TODO: call Supabase SMS OTP when credentials are configured
            // await supabase.auth.signInWithOtp({ phone: `+91${phone}` })
            await new Promise(r => setTimeout(r, 800)) // simulate network
            setStage('OTP')
            setCountdown(60)
            setTimeout(() => otpRefs.current[0]?.focus(), 100)
        } catch {
            setError('Failed to send OTP. Please try again.')
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

        // Auto-submit when all 6 digits entered
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
            // TODO: real Supabase OTP verification
            // const { error } = await supabase.auth.verifyOtp({ phone: `+91${phone}`, token: code, type: 'sms' })
            await new Promise(r => setTimeout(r, 600))

            // Dev mode: any 6-digit OTP passes
            if (code.length === 6) {
                onComplete(`+91${phone}`)
            }
        } catch {
            setAttempts(a => a - 1)
            setError(`Incorrect OTP. ${attempts - 1} attempt${attempts - 1 !== 1 ? 's' : ''} remaining.`)
            if (attempts <= 1) {
                setStage('PHONE')
                setOtp(['', '', '', '', '', ''])
                setAttempts(3)
            }
        } finally {
            setLoading(false)
        }
    }

    if (stage === 'OTP') {
        return (
            <div>
                <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                    Enter the OTP
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 4 }}>
                    We sent a 6-digit code to <strong style={{ color: 'var(--text-primary)' }}>+91 {phone}</strong>
                </p>
                <button
                    onClick={() => { setStage('PHONE'); setOtp(['', '', '', '', '', '']) }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 36 }}
                >
                    Change number
                </button>

                {/* OTP boxes */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 24 }} onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                        <input
                            key={i}
                            ref={el => { otpRefs.current[i] = el }}
                            className={`otp-input${error ? ' error' : ''}${digit ? ' filled' : ''}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={e => handleOtpChange(i, e.target.value)}
                            onKeyDown={e => handleOtpKeyDown(i, e)}
                            disabled={loading}
                            style={{ flex: 1 }}
                        />
                    ))}
                </div>

                {error && (
                    <p style={{ color: 'var(--error)', fontSize: 14, marginBottom: 16 }}>{error}</p>
                )}

                <button
                    className="btn btn-primary btn-full"
                    onClick={() => verifyOtp(otp.join(''))}
                    disabled={loading || otp.join('').length < 6}
                    style={{ marginBottom: 16 }}
                >
                    {loading ? 'Verifying…' : 'Verify OTP'}
                </button>

                {countdown > 0 ? (
                    <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-tertiary)' }}>
                        Resend OTP in {countdown}s
                    </p>
                ) : (
                    <button
                        className="btn btn-ghost btn-full"
                        onClick={handleSendOtp}
                        disabled={loading}
                    >
                        Resend OTP
                    </button>
                )}
            </div>
        )
    }

    return (
        <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Welcome to ExamTracker 👋
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 36 }}>
                Enter your phone number to get started. No passwords, ever.
            </p>

            {/* Phone input */}
            <div style={{ position: 'relative', marginBottom: 16 }}>
                <div style={{
                    position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)', fontSize: 16, fontWeight: 500,
                    pointerEvents: 'none', userSelect: 'none',
                }}>
                    +91
                </div>
                <input
                    className={`input${error ? ' error' : ''}`}
                    type="tel"
                    inputMode="numeric"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && phone.length === 10 && handleSendOtp()}
                    autoFocus
                    style={{ paddingLeft: 52 }}
                />
            </div>

            {error && <p style={{ color: 'var(--error)', fontSize: 14, marginBottom: 12 }}>{error}</p>}

            <button
                className="btn btn-primary btn-full"
                onClick={handleSendOtp}
                disabled={phone.length !== 10 || loading}
                style={{ marginBottom: 16 }}
            >
                {loading ? 'Sending…' : 'Send OTP'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <button
                className="btn btn-secondary btn-full"
                onClick={() => {
                    // TODO: trigger Supabase Google OAuth
                    // supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/auth/callback` } })
                    alert('Google OAuth — add Supabase credentials to .env.local to enable')
                }}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
            </button>

            <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.6 }}>
                By continuing, you agree to our Terms of Service.<br />
                We respect your privacy — no spam, ever.
            </p>
        </div>
    )
}
