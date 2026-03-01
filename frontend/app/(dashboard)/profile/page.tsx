'use client'

import { ChevronRight, Settings, Bell, BookOpen, Shield, LogOut } from 'lucide-react'
import Link from 'next/link'

// ── Static Mock Data ───────────────────────────────────────────────────
const PROFILE = {
    name: 'Naveen Kumar',
    email: 'naveen@example.com',
    initials: 'NK',
    phone: '+91 98765 43210'
}

// ── Component ──────────────────────────────────────────────────────────
export default function ProfilePage() {
    return (
        <div style={{ padding: '0 0 100px 0', maxWidth: 600, margin: '0 auto', background: '#000', minHeight: '100dvh' }}>

            {/* Header */}
            <header style={{ padding: '40px 16px 24px' }}>
                <h1 style={{ fontSize: 34, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
                    Profile
                </h1>
            </header>

            {/* Apple ID Card Style */}
            <div style={{ padding: '0 16px', marginBottom: 32 }}>
                <div style={{
                    background: '#1c1c1e', borderRadius: 20, padding: 20,
                    display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer'
                }}>
                    <div style={{
                        width: 60, height: 60, borderRadius: '50%', background: '#333',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 24, fontWeight: 600, color: '#fff'
                    }}>
                        {PROFILE.initials}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{PROFILE.name}</h2>
                        <p style={{ color: '#86868b', fontSize: 14 }}>{PROFILE.email} • {PROFILE.phone}</p>
                    </div>
                    <ChevronRight color="#86868b" />
                </div>
            </div>

            {/* Mock Ad placement in profile */}
            <div style={{ padding: '0 16px', marginBottom: 32 }}>
                <div style={{ fontSize: 11, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, paddingLeft: 16 }}>
                    Special Offer
                </div>
                <div style={{
                    background: '#1c1c1e', borderRadius: 20, padding: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(10, 132, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BookOpen size={24} color="#0a84ff" />
                        </div>
                        <div>
                            <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>Testbook Pass Pro</div>
                            <div style={{ color: '#86868b', fontSize: 13 }}>Unlock 70,000+ Mock Tests</div>
                        </div>
                    </div>
                    <button style={{ background: '#2c2c2e', color: '#0a84ff', border: 'none', padding: '6px 14px', borderRadius: 100, fontSize: 13, fontWeight: 600 }}>
                        Get it
                    </button>
                </div>
            </div>

            {/* Settings Groups */}
            <SettingsGroup title="General">
                <SettingsRow icon={<BookOpen size={20} color="#fff" />} label="My Qualifications" />
                <SettingsRow icon={<Bell size={20} color="#fff" />} label="Notification Preferences" />
                <SettingsRow icon={<Shield size={20} color="#fff" />} label="Privacy & Security" last />
            </SettingsGroup>

            <SettingsGroup title="App">
                <SettingsRow icon={<Settings size={20} color="#fff" />} label="Settings" />
                <SettingsRow icon={null} label="Rate Us on the App Store" color="#0a84ff" last />
            </SettingsGroup>

            {/* Logout Button */}
            <div style={{ padding: '16px', marginTop: 16 }}>
                <button style={{
                    width: '100%', background: '#1c1c1e', color: '#ff453a', padding: '16px', borderRadius: 16,
                    fontSize: 17, fontWeight: 600, border: 'none', cursor: 'pointer'
                }}>
                    Log Out
                </button>
            </div>

            <p style={{ textAlign: 'center', color: '#86868b', fontSize: 13, marginTop: 16 }}>
                ExamTracker v1.0.0
            </p>
        </div>
    )
}

function SettingsGroup({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div style={{ padding: '0 16px', marginBottom: 32 }}>
            <h2 style={{ fontSize: 13, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: 16, marginBottom: 8, fontWeight: 600 }}>
                {title}
            </h2>
            <div style={{ background: '#1c1c1e', borderRadius: 16, overflow: 'hidden' }}>
                {children}
            </div>
        </div>
    )
}

function SettingsRow({ icon, label, color = '#fff', last = false }: { icon: React.ReactNode, label: string, color?: string, last?: boolean }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', cursor: 'pointer', background: 'transparent' }}>
            {icon && (
                <div style={{ background: '#2c2c2e', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                    {icon}
                </div>
            )}
            <div style={{ flex: 1, fontSize: 17, color: color, fontWeight: 400 }}>
                {label}
            </div>
            <ChevronRight color="#86868b" />
            {!last && (
                <div style={{ position: 'absolute', bottom: 0, right: 0, left: icon ? 64 : 16, height: 1, background: 'rgba(255,255,255,0.05)' }} />
            )}
        </div>
    )
}
