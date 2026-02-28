import { z } from 'zod'

export const sendOtpSchema = z.object({
    email: z.string().email('Invalid email address'),
})

export const verifyOtpSchema = z.object({
    email: z.string().email('Invalid email address'),
    token: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d+$/, 'OTP must contain only digits'),
})

export type SendOtpInput = z.infer<typeof sendOtpSchema>
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>
