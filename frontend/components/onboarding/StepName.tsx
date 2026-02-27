'use client'

import { useState } from 'react'

interface StepNameProps {
    initialValue: string
    onNext: (name: string) => void
}

export default function StepName({ initialValue, onNext }: StepNameProps) {
    const [name, setName] = useState(initialValue)

    return (
        <div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                What should we call you?
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 36 }}>
                This is how your exam list will be addressed.
            </p>

            <input
                className="input"
                type="text"
                placeholder="Your first name"
                value={name}
                onChange={e => setName(e.target.value.slice(0, 50))}
                onKeyDown={e => e.key === 'Enter' && name.trim() && onNext(name.trim())}
                autoFocus
                maxLength={50}
                style={{ marginBottom: 24 }}
            />

            <button
                className="btn btn-primary btn-full"
                onClick={() => onNext(name.trim())}
                disabled={!name.trim()}
            >
                Continue
            </button>
        </div>
    )
}
