
async function simulateWebhook() {
    console.log('Simulating Supabase Auth Webhook...')

    // Simulate a sign-up OTP email request from Supabase
    const payload = {
        user: {
            id: 'test-user-id-123',
            email: 'test@example.com',
            app_metadata: {},
            user_metadata: {}
        },
        email_data: {
            token: '543210',
            token_hash: '1234567890abcdef',
            redirect_to: 'http://localhost:3000/auth/callback',
            email_action_type: 'signup',
            site_url: 'http://localhost:3000',
            token_new: '',
            token_hash_new: ''
        }
    }

    try {
        const response = await fetch('http://localhost:8000/api/v1/webhooks/auth/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add the webhook secret if you configured it in your .env
                // 'x-supabase-webhook-secret': process.env.SUPABASE_WEBHOOK_SECRET
            },
            body: JSON.stringify(payload)
        })

        const data = await response.json()
        console.log('Webhook Response Status:', response.status)
        console.log('Webhook Response Data:', data)
    } catch (err) {
        console.error('Failed to trigger webhook:', err)
    }
}

simulateWebhook()
