import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')

/**
 * Service-role Supabase client — full DB access, bypasses RLS.
 * ONLY use server-side (API routes, Server Components). NEVER expose to the client.
 */
export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
)

/** Verify a Supabase JWT and return the user, or null if invalid */
export async function verifyJWT(token: string) {
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error) return null
    return data.user
}
