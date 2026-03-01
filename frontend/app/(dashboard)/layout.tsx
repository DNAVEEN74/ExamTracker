import Link from 'next/link'
import { Home, Search, Crosshair, User } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ backgroundColor: '#000', minHeight: '100dvh', color: '#fff', display: 'flex', flexDirection: 'column' }}>

            {/* Main Content Area */}
            <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 84 }}>
                {children}
            </main>

            {/* Apple-Style Mobile Bottom Navigation Tab Bar */}
            <nav style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                height: 84,
                backgroundColor: 'rgba(28, 28, 30, 0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                paddingBottom: 'env(safe-area-inset-bottom)', // For iOS Home Indicator
                zIndex: 100
            }}>
                <NavItem href="/dashboard" icon={<Home size={24} />} label="Home" active />
                <NavItem href="/search" icon={<Search size={24} />} label="Search" />
                <NavItem href="/tracked" icon={<Crosshair size={24} />} label="Tracked" />
                <NavItem href="/profile" icon={<User size={24} />} label="Profile" />
            </nav>
        </div>
    )
}

function NavItem({ href, icon, label, active = false }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
    return (
        <Link href={href} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            textDecoration: 'none',
            color: active ? '#0a84ff' : '#86868b',
            flex: 1,
            padding: '12px 0'
        }}>
            {icon}
            <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
        </Link>
    )
}
