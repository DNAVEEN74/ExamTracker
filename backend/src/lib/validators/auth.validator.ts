import { z } from 'zod'

/** Indian mobile number: 10 digits, optional +91 prefix */
const phoneSchema = z
    .string()
    .regex(/^(\+91)?[6-9]\d{9}$/, 'Invalid Indian phone number. Must be a 10-digit mobile number starting with 6-9')
    .transform((val) => {
        // Normalize to +91XXXXXXXXXX format
        const digits = val.replace(/^\+91/, '')
        return `+91${digits}`
    })

export const sendOtpSchema = z.object({
    phone: phoneSchema,
})

export const verifyOtpSchema = z.object({
    phone: phoneSchema,
    token: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d+$/, 'OTP must contain only digits'),
})

export type SendOtpInput = z.infer<typeof sendOtpSchema>
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>
