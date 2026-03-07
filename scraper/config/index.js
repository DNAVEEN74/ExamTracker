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

    // Storage (Cloudflare R2) — OPTIONAL at config time; r2.js validates at upload time
    // This prevents scraper startup from crashing just because R2 isn't configured yet
    storage: {
        accountId: optionalEnv('R2_ACCOUNT_ID'),
        accessKeyId: optionalEnv('R2_ACCESS_KEY_ID'),
        secretAccessKey: optionalEnv('R2_SECRET_ACCESS_KEY'),
        bucket: optionalEnv('R2_BUCKET_NAME'),
        pdfTtlHours: parseInt(process.env.PDF_TTL_HOURS || '48', 10),
    },

    // Webhook Handoff — OPTIONAL: if not set, webhook is skipped (dev mode)
    parsingWebhookUrl: optionalEnv('PARSING_WEBHOOK_URL'),
    webhookSecret: optionalEnv('SCRAPER_WEBHOOK_SECRET'),

    // AI Classification (Tier 1) — OPTIONAL: classifier fails open if missing
    geminiApiKey: optionalEnv('GEMINI_API_KEY'),

    // Scraping Config
    concurrency: parseInt(process.env.SCRAPE_CONCURRENCY || '3', 10),
    requestDelayMs: parseInt(process.env.REQUEST_DELAY_MS || '2000', 10),
    timeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10),
    globalTimeoutMs: parseInt(process.env.GLOBAL_TIMEOUT_MS || '3600000', 10), // 1 hour
    maxPdfSizeBytes: 15 * 1024 * 1024, // 15MB hard limit
    maxLinksPerSite: parseInt(process.env.MAX_LINKS_PER_SITE || '100', 10), // Prevent memory explosion
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

    // Runtime filters
    logLevel: process.env.LOG_LEVEL || 'info',
    priorityFilter: (process.env.PRIORITY_FILTER || 'P0,P1,P2,P3').split(','),
    siteIdFilter: process.env.SITE_ID || null, // For testing a single site

    // Health check — posts a summary to this URL after each run (optional)
    healthCheckUrl: optionalEnv('HEALTH_CHECK_URL'),
}
