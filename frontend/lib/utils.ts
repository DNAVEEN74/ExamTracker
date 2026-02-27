import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/** Format a Date string to Indian readable format e.g. "15 Mar 2026" */
export function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

/** Days remaining until a deadline date */
export function daysUntil(dateStr: string): number {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const target = new Date(dateStr)
    target.setHours(0, 0, 0, 0)
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

/** Compute age from date of birth (ISO string) */
export function computeAge(dob: string): number {
    const today = new Date()
    const birth = new Date(dob)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
}

/** Format number with Indian commas e.g. 12,34,567 */
export function formatIndianNumber(n: number): string {
    return n.toLocaleString('en-IN')
}

/** Deadline urgency: 'critical' < 3 days, 'warning' < 7, 'normal' otherwise */
export function getDeadlineUrgency(dateStr: string): 'critical' | 'warning' | 'normal' | 'expired' {
    const days = daysUntil(dateStr)
    if (days < 0) return 'expired'
    if (days < 3) return 'critical'
    if (days < 7) return 'warning'
    return 'normal'
}
