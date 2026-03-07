import 'dotenv/config'

// Required: These crash the scraper if missing — cannot operate without them
const requireEnv = (name) => {
    if (!process.env[name]) {
        console.error(`[FATAL] Missing required environment variable: ${name}`)
        process.exit(1)
    }
    return process.env[name]
}

// Optional: These are used at runtime with graceful fallback if missing
const optionalEnv = (name, defaultVal = null) => process.env[name] || defaultVal

export const CONFIG = {
    // Database (Prisma) — REQUIRED, nothing works without it
    databaseUrl: requireEnv('DATABASE_URL'),

    // AI Classification (Tier 1) — OPTIONAL: classifier fails open if missing
    geminiApiKey: optionalEnv('GEMINI_API_KEY'),

    // Webhook Handoff — OPTIONAL: if not set, webhook is skipped (dev mode)
    parsingWebhookUrl: optionalEnv('PARSING_WEBHOOK_URL'),
    webhookSecret: optionalEnv('SCRAPER_WEBHOOK_SECRET'),

    // Scraping Config
    concurrency: parseInt(process.env.SCRAPE_CONCURRENCY || '1', 10), // Process 1 site at a time to minimize memory
    requestDelayMs: parseInt(process.env.REQUEST_DELAY_MS || '2000', 10),
    timeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10),
    globalTimeoutMs: parseInt(process.env.GLOBAL_TIMEOUT_MS || '3600000', 10), // 1 hour
    maxLinksPerSite: parseInt(process.env.MAX_LINKS_PER_SITE || '100', 10), // Prevent memory explosion
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

    // Runtime filters
    logLevel: process.env.LOG_LEVEL || 'info',
    priorityFilter: (process.env.PRIORITY_FILTER || 'P0,P1,P2,P3').split(','),
    siteIdFilter: process.env.SITE_ID || null, // For testing a single site

    // Health check — posts a summary to this URL after each run (optional)
    healthCheckUrl: optionalEnv('HEALTH_CHECK_URL'),
}
