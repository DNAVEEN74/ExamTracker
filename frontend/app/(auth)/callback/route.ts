import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Check onboarding status
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('onboarding_completed, onboarding_step')
                    .eq('user_id', user.id)
                    .single()

                if (!profile) {
                    // Brand new user — start onboarding
                    return NextResponse.redirect(`${origin}/register?step=0`)
                }
                if (!profile.onboarding_completed) {
                    // Resume onboarding at last saved step
                    return NextResponse.redirect(`${origin}/register?step=${profile.onboarding_step}`)
                }
                // Fully onboarded — go to dashboard
                return NextResponse.redirect(`${origin}${next}`)
            }
        }
    }

    // Something went wrong — redirect to home
    return NextResponse.redirect(`${origin}/?error=auth_failed`)
}
