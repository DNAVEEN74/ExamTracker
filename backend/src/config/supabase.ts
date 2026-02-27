import { createClient } from '@supabase/supabase-js'
import { env } from './env'

// Service-role client — has full DB access, bypasses RLS
// ONLY use server-side, NEVER expose to client
export const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
)

// Verify a user's JWT and return the user object
export async function verifyJWT(token: string) {
    const { data, error } = await supabase.auth.getUser(token)
    if (error) return null
    return data.user
}
