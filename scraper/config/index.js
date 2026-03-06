import 'dotenv/config'

const requireEnv = (name) => {
    if (!process.env[name]) {
        console.error(`[FATAL] Missing required environment variable: ${name}`)
        process.exit(1)
    }
    return process.env[name]
}

export const CONFIG = {
    // Database (Prisma)
    databaseUrl: requireEnv('DATABASE_URL'),

    // Storage (Cloudflare R2)
    storage: {
        accountId: requireEnv('R2_ACCOUNT_ID'),
        accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
        secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
        bucket: requireEnv('R2_BUCKET_NAME'),
        pdfTtlHours: parseInt(process.env.PDF_TTL_HOURS || '48', 10),
    },

    // Webhook Handoff
    webhook: {
        url: requireEnv('PARSING_WEBHOOK_URL'),
        secret: requireEnv('SCRAPER_WEBHOOK_SECRET'),
    },

    // Scraping Config
    concurrency: parseInt(process.env.SCRAPE_CONCURRENCY || '3', 10),
    requestDelayMs: parseInt(process.env.REQUEST_DELAY_MS || '2000', 10),
    timeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10),
    globalTimeoutMs: parseInt(process.env.GLOBAL_TIMEOUT_MS || '3600000', 10), // 1 hour
    maxPdfSizeBytes: 15 * 1024 * 1024, // 15MB hard limit
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

    // Runtime filters
    logLevel: process.env.LOG_LEVEL || 'info',
    priorityFilter: (process.env.PRIORITY_FILTER || 'P0,P1,P2,P3').split(','),
    siteIdFilter: process.env.SITE_ID || null, // For testing a single site
}
