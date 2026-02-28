import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'ExamTracker India — Never Miss a Government Exam Deadline',
  description: 'Personal eligibility intelligence for Indian government job aspirants. Know which exams you qualify for, your category vacancies, and every deadline — all in one place.',
}

export default function LandingPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--background)' }}>

      {/* ── Sticky Nav ───────────────────────────────────── */}
      <nav className="nav">
        <a href="/" className="nav-logo">
          <span style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'var(--accent)',
            display: 'inline-block', flexShrink: 0,
          }} />
          ExamTracker India
        </a>
        <Link href="/register" className="btn btn-primary" style={{ height: 40, padding: '0 18px', fontSize: 14 }}>
          Get started free
        </Link>
      </nav>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section style={{ paddingTop: 120, paddingBottom: 64, textAlign: 'center', padding: '120px 24px 64px' }}>
        <div style={{ maxWidth: 460, margin: '0 auto' }}>

          {/* Label */}
          <p className="section-label" style={{ marginBottom: 20, color: 'var(--accent)' }}>
            For India&apos;s 4 crore government exam aspirants
          </p>

          {/* Headline */}
          <h1
            className="text-hero"
            style={{ color: 'var(--text-primary)', marginBottom: 18 }}
          >
            Never miss a government exam deadline again.
          </h1>

          {/* Sub-headline */}
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 36 }}>
            ExamTracker reads the PDFs, checks your eligibility, and shows you exactly
            which exams you can apply for — with your category&apos;s vacancy count.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360, margin: '0 auto' }}>
            <Link href="/register" className="btn btn-primary btn-full" style={{ height: 50 }}>
              Start tracking — it&apos;s free
            </Link>
            <a href="#how-it-works" className="btn btn-secondary btn-full" style={{ height: 50 }}>
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* ── Trust Stats ──────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--border)', padding: '48px 24px' }}>
        <div style={{
          maxWidth: 480, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24, textAlign: 'center',
        }}>
          {[
            { stat: '50+', label: 'Central exams covered' },
            { stat: '100%', label: 'Free core features' },
            { stat: '0', label: 'PDFs you need to read' },
          ].map(({ stat, label }) => (
            <div key={label}>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)', lineHeight: 1, marginBottom: 6 }}>
                {stat}
              </div>
              <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────── */}
      <section id="how-it-works" style={{ borderTop: '1px solid var(--border)', padding: '64px 24px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <p className="section-label" style={{ textAlign: 'center', marginBottom: 12 }}>How it works</p>
          <h2 className="text-2xl" style={{ textAlign: 'center', marginBottom: 40, color: 'var(--text-primary)' }}>
            3 minutes of setup.<br />Years of peace of mind.
          </h2>
          {[
            {
              step: '01',
              title: 'Tell us who you are',
              desc: 'Date of birth, category (OBC/SC/ST/EWS/General), your highest qualification, and home state. 3 minutes.',
            },
            {
              step: '02',
              title: 'We run every eligibility check',
              desc: 'Age limits per category, qualification, domicile, post-level eligibility within each exam — computed instantly.',
            },
            {
              step: '03',
              title: 'Your personal exam list appears',
              desc: '"SSC CGL: You qualify for 12 of 17 posts. Your OBC vacancies: 847. Deadline in 23 days."',
            },
          ].map(({ step, title, desc }) => (
            <div
              key={step}
              style={{
                display: 'flex', gap: 20, marginBottom: 12,
                padding: 20, background: 'var(--background-card)',
                borderRadius: 'var(--radius)', border: '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em', minWidth: 24, paddingTop: 3 }}>
                {step}
              </span>
              <div>
                <p className="text-base" style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{title}</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--border)', padding: '64px 24px 80px', textAlign: 'center' }}>
        <div style={{ maxWidth: 380, margin: '0 auto' }}>
          <h2 className="text-3xl" style={{ color: 'var(--text-primary)', marginBottom: 12 }}>
            Ready to stop missing deadlines?
          </h2>
          <p className="text-base" style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
            Your personalized list of eligible exams is ready in 3 minutes.
          </p>
          <Link href="/register" className="btn btn-primary btn-full" style={{ height: 50 }}>
            Get started — free forever
          </Link>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)', marginTop: 12 }}>
            No credit card · No spam · DPDPA 2023 compliant
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px', textAlign: 'center' }}>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          © 2026 ExamTracker India
        </p>
      </footer>

    </main>
  )
}
