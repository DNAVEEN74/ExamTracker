import { Resend } from 'resend'
import { getOtpTemplate } from './templates/otpTemplate'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM_ALERTS = process.env.RESEND_FROM_ALERTS ?? 'ExamTracker <alerts@examtracker.in>'
const FROM_AUTH = process.env.RESEND_FROM_AUTH ?? 'ExamTracker <noreply@examtracker.in>'

export async function sendEmail(params: {
    to: string
    subject: string
    html: string
    from?: string
}) {
    if (!resend) {
        console.warn('⚠️  RESEND_API_KEY not set — email not sent (dev mode)')
        return { success: false, error: 'Email service not configured' }
    }

    try {
        const { data, error } = await resend.emails.send({
            from: params.from ?? FROM_ALERTS,
            to: params.to,
            subject: params.subject,
            html: params.html,
        })

        if (error) {
            console.error('Resend error:', error)
            return { success: false, error: error.message }
        }

        return { success: true, id: data?.id }
    } catch (err) {
        console.error('Failed to send email:', err)
        return { success: false, error: 'Internal email service error' }
    }
}

export async function sendOtpEmail(to: string, otp: string) {
    const html = getOtpTemplate(otp)
    return sendEmail({
        to,
        subject: `${otp} is your ExamTracker verification code`,
        html,
        from: FROM_AUTH,
    })
}
