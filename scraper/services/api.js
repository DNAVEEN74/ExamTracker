import axios from 'axios'
import { CONFIG } from '../config/index.js'
import { logger } from '../utils/logger.js'

export async function notifyMainApp(payload) {
    if (!CONFIG.parsingWebhookUrl) {
        logger.info(
            { site: payload.site_id, hash: payload.pdf_hash?.slice(0, 12) },
            '[DEV] Skipping webhook — set PARSING_WEBHOOK_URL to enable'
        )
        return { success: false, skipped: true }
    }
    try {
        const res = await axios.post(CONFIG.parsingWebhookUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                'x-scraper-secret': CONFIG.webhookSecret,
            },
            timeout: 60_000,   // AI parsing can take up to 30s — give it time
        })
        return res.data
    } catch (err) {
        logger.warn(
            { err: err.message, site: payload.site_id },
            'Webhook POST failed — PDF is stored, recovery flow will requeue'
        )
        return { success: false, error: err.message }
    }
}
