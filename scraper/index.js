/**
 * ExamTracker India — Government Site Scraper
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Monitors 142 official Indian government recruitment sites.
 *
 * Architecture:
 *   Hash store  → scraper_log.content_hash in Postgres via Prisma
 *   PDF storage → Cloudflare R2 at /{site_id}/{YYYY}/{MM}/{sha256}.pdf
 *   Dedup       → pdf_hashes table (SHA-256 on raw PDF bytes — kept FOREVER, ~40 bytes each)
 *   PDF cleanup → Main app deletes the actual PDF file after AI parsing (hash stays forever)
 *   Handoff     → POST /api/webhooks/new-pdf (triggers AI parsing pipeline)
 *   Scheduling  → Railway native cron jobs (NOT node-cron)
 *
 * Run locally:
 *   npm run dev                ← P0 sites only
 *   npm run start               ← all sites
 */

import pLimit from 'p-limit'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import { CONFIG } from './config/index.js'
import { logger } from './utils/logger.js'
import { preloadHashes, hashCache, prisma } from './services/database.js'
import { PageFetcher } from './services/pageFetcher.js'
import { processSite } from './processors/siteProcessor.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function main() {
    // Global Watchdog — kills the process if scraping hangs indefinitely
    const globalTimeout = setTimeout(() => {
        logger.fatal('Global execution timeout. Killing process to prevent indefinite hanging.')
        process.exit(2)
    }, CONFIG.globalTimeoutMs)

    try {
        logger.info({ priorities: CONFIG.priorityFilter, site: CONFIG.siteIdFilter ?? 'all' },
            'ExamTracker Scraper starting')

        const sitesJson = JSON.parse(
            await readFile(join(__dirname, 'sites.json'), 'utf8')
        )

        const allSites = []
        for (const sites of Object.values(sitesJson.sites)) {
            for (const site of sites) {
                if (site.scrape_method === 'manual') continue
                // API sites may not have notification_page — they use api_config instead
                if (!site.notification_page && site.scrape_method !== 'api' && !(site.has_rss && site.rss_url)) continue
                if (!CONFIG.priorityFilter.includes(site.priority)) continue
                if (CONFIG.siteIdFilter && site.id !== CONFIG.siteIdFilter) continue
                allSites.push(site)
            }
        }

        logger.info({ total: allSites.length }, 'Sites loaded')

        // N+1 Optimization: preload recent hashes
        await preloadHashes(allSites.map(s => s.id))
        logger.debug(`Preloaded ${hashCache.size} historic hashes`)

        const fetcher = new PageFetcher()
        fetcher.isFirst = true

        const needsPlaywright = allSites.some(s => s.scrape_method === 'js_render')
        if (needsPlaywright) {
            await fetcher.init()
        }

        // Limit concurrency strictly over HTML / RSS paths
        const siteLimit = pLimit(CONFIG.concurrency)

        let results = []
        try {
            results = await Promise.all(
                allSites.map(site => siteLimit(() => processSite(site, fetcher)))
            )
        } finally {
            if (needsPlaywright) {
                await fetcher.close()
            }
        }

        const summary = {
            total: results.length,
            ok: results.filter(r => r.status === 'OK').length,
            noChange: results.filter(r => r.status === 'NO_CHANGE').length,
            failed: results.filter(r => ['ERROR', 'BLOCKED', 'TIMEOUT'].includes(r.status)).length,
            newPdfs: results.reduce((sum, r) => sum + (r.newPdfs || 0), 0),
        }

        logger.info(summary, 'Run complete')

        const p0Ids = allSites.filter(s => s.priority === 'P0').map(s => s.id)
        const p0Failed = results.filter(r => p0Ids.includes(r.siteId) && ['ERROR', 'BLOCKED', 'TIMEOUT'].includes(r.status)).length

        // Post health check summary if configured (point to webhook.site, Better Uptime, etc.)
        if (CONFIG.healthCheckUrl) {
            try {
                const { default: axios } = await import('axios')
                await axios.post(CONFIG.healthCheckUrl, {
                    status: p0Failed > 0 ? 'DEGRADED' : 'OK',
                    timestamp: new Date().toISOString(),
                    ...summary,
                    p0Failed,
                    p0Sites: p0Ids,
                    failedSites: results
                        .filter(r => ['ERROR', 'BLOCKED', 'TIMEOUT'].includes(r.status))
                        .map(r => r.siteId),
                }, { timeout: 5000 })
                logger.debug({ url: CONFIG.healthCheckUrl }, 'Health check posted')
            } catch (err) {
                logger.warn({ err: err.message }, 'Health check POST failed (non-fatal)')
            }
        }

        if (p0Failed > 0) {
            logger.error({ p0Failed }, `${p0Failed} P0 site(s) failed`)
            process.exit(1)
        }
    } finally {
        clearTimeout(globalTimeout)
        // Release Prisma DB connection pool cleanly before process exits
        await prisma.$disconnect().catch(() => { })
    }
}

main().catch(err => {
    logger.error({ err: err.message, stack: err.stack }, 'Scraper crashed')
    process.exit(1)
})
