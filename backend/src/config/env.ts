import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
    PORT: z.string().default('8000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    // Supabase
    SUPABASE_URL: z.string().min(1, 'SUPABASE_URL is required'),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
    // Upstash Redis
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    // Resend
    RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
    RESEND_FROM_ALERTS: z.string().default('ExamTracker <alerts@examtracker.in>'),
    RESEND_FROM_AUTH: z.string().default('ExamTracker <noreply@examtracker.in>'),
    // Internal
    INTERNAL_API_SECRET: z.string().optional(),
    // Supabase DB Webhook secret (for process-notifications route)
    SUPABASE_WEBHOOK_SECRET: z.string().optional(),
    FRONTEND_URL: z.string().default('http://localhost:3000'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
    console.error('❌ Invalid environment variables:')
    console.error(parsed.error.flatten().fieldErrors)
    process.exit(1)
}

export const env = parsed.data
