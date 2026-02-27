export default function DashboardPage() {
    return (
        <div style={{
            minHeight: '100vh', background: 'var(--background)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '0 24px', textAlign: 'center',
        }}>
            <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--success-light)',
                border: '2px solid rgba(16,185,129,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, margin: '0 auto 20px',
            }}>
                ✓
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Your exam dashboard
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 360 }}>
                🚧 Coming soon — your personalized list of eligible government exams will appear here.
            </p>
        </div>
    )
}
