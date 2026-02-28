import { Resend } from 'resend'
import { env } from '../../config/env'
import { getOtpTemplate } from './templates/otpTemplate'

const resend = new Resend(env.RESEND_API_KEY)

export async function sendEmail(params: {
    to: string
    subject: string
    html: string
    from?: string
}) {

    try {
        const { data, error } = await resend.emails.send({
            from: params.from ?? env.RESEND_FROM_ALERTS,
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
        from: env.RESEND_FROM_AUTH,
    })
}
