/**
 * ExamTracker India — Government Site Scraper
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Monitors 142 official Indian government recruitment sites.
 *
 * Architecture:
 *   Hash store  → scraper_log.content_hash in Supabase (survives Railway restarts)
 *   PDF storage → Supabase Storage at /raw-pdfs/{site_id}/{YYYY}/{MM}/{sha256}.pdf
 *   Dedup       → pdf_hashes table (SHA-256 on raw PDF bytes — kept FOREVER, ~40 bytes each)
 *   PDF cleanup → Main app deletes the actual PDF file after AI parsing (hash stays forever)
 *   Handoff     → POST /api/webhooks/new-pdf (triggers AI parsing pipeline)
 *   Scheduling  → Railway native cron jobs (NOT node-cron)
 *
 * Run locally:
 *   PRIORITY_FILTER=P0 node index.js          ← P0 sites only
 *   SITE_ID=ssc node index.js                  ← single site
 *   PRIORITY_FILTER=P0,P1,P2,P3 node index.js ← all sites
 */

import * as cheerio from 'cheerio'
import axios from 'axios'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import pLimit from 'p-limit'
import pino from 'pino'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import 'dotenv/config'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Logger ──────────────────────────────────────────────────────────────────

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
})

// ─── Startup Validation ───────────────────────────────────────────────────────

const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k])
if (missingEnv.length > 0) {
    console.error(`[FATAL] Missing required environment variables: ${missingEnv.join(', ')}`)
    process.exit(1)
}

// ─── Supabase ────────────────────────────────────────────────────────────────

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
)

// ─── Config ──────────────────────────────────────────────────────────────────

const CONFIG = {
    concurrency: parseInt(process.env.SCRAPE_CONCURRENCY || '3'),
    requestDelayMs: parseInt(process.env.REQUEST_DELAY_MS || '2000'),
    timeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000'),
    priorityFilter: (process.env.PRIORITY_FILTER || 'P0,P1').split(',').map(s => s.trim()),
    siteIdFilter: process.env.SITE_ID || null,
    parsingWebhookUrl: process.env.PARSING_WEBHOOK_URL || null,
    webhookSecret: process.env.SCRAPER_WEBHOOK_SECRET || null,
    userAgent: 'ExamTrackerBot/1.0 (+https://examtracker.in/bot)',
    storage: { bucket: 'raw-pdfs' },
    // PDF file lifecycle: delete from Storage after this many hours if webhook never fires
    // The SHA-256 hash in pdf_hashes stays FOREVER for dedup (only ~40 bytes per row)
    pdfTtlHours: parseInt(process.env.PDF_TTL_HOURS || '24'),
}

// ─── Supabase Hash Store ──────────────────────────────────────────────────────

async function getLastContentHash(siteId) {
    const { data } = await supabase
        .from('scraper_log')
        .select('content_hash')
        .eq('site_id', siteId)
        .not('content_hash', 'is', null)
        .order('scraped_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    return data?.content_hash ?? null
}

async function writeScraperLog(entry) {
    const { error } = await supabase.from('scraper_log').insert({
        ...entry,
        scraped_at: new Date().toISOString(),
    })
    if (error) logger.error({ error: error.message }, 'Failed to write scraper_log')
}

// ─── PDF Deduplication ───────────────────────────────────────────────────────
// SHA-256 hash rows stay FOREVER in pdf_hashes.
// The actual PDF file is deleted by the main app after AI parsing.
// This separation means: no re-download, no re-parse, no re-notify — ever.

async function isPdfAlreadySeen(sha256) {
    const { data, error } = await supabase
        .from('pdf_hashes')
        .select('id')
        .eq('hash', sha256)
        .maybeSingle()
    if (error) {
        logger.warn({ error: error.message }, 'pdf_hashes lookup failed — treating as new')
        return false  // Fail open: attempt processing rather than silently skip
    }
    return !!data
}

async function recordPdfHash({ hash, source_url, site_id, storage_path }) {
    const { error } = await supabase.from('pdf_hashes').upsert(
        { hash, source_url, site_id, storage_path },
        { onConflict: 'hash', ignoreDuplicates: true }
    )
    if (error) logger.error({ error: error.message }, 'Failed to insert pdf_hashes row')
}

// ─── Supabase Storage Upload ─────────────────────────────────────────────────

async function uploadPdfToStorage(pdfBuffer, siteId, sha256) {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const storagePath = `${siteId}/${yyyy}/${mm}/${sha256}.pdf`

    const { error } = await supabase.storage
        .from(CONFIG.storage.bucket)
        .upload(storagePath, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: false,  // SHA-256 path is deterministic — never overwrite
        })

    if (error) {
        if (error.message?.includes('already exists')) {
            logger.debug({ storagePath }, 'PDF already in Storage (hash match)')
            return storagePath
        }
        throw new Error(`Supabase Storage upload failed: ${error.message}`)
    }

    return storagePath
}

async function recordIngestionLog(entry) {
    const { data, error } = await supabase
        .from('pdf_ingestion_log')
        .insert(entry)
        .select('id')
        .single()
    if (error) {
        logger.error({ error: error.message }, 'Failed to insert pdf_ingestion_log')
        return null
    }
    return data.id
}

// ─── Webhook → Main App ───────────────────────────────────────────────────────

async function notifyMainApp(payload) {
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

// ─── Page Fetcher ─────────────────────────────────────────────────────────────

class PageFetcher {
    constructor() { this.browser = null }

    async init() {
        this.browser = await chromium.launch({ headless: true })
        logger.debug('Playwright browser launched')
    }

    async close() {
        if (this.browser) {
            await this.browser.close()
            logger.debug('Playwright browser closed')
        }
    }

    async fetchStatic(url) {
        const response = await axios.get(url, {
            headers: { 'User-Agent': CONFIG.userAgent },
            timeout: CONFIG.timeoutMs,
            maxRedirects: 5,
            responseType: 'text',
            maxContentLength: 10 * 1024 * 1024,
        })
        return { html: response.data, httpStatus: response.status }
    }

    async fetchDynamic(url) {
        const page = await this.browser.newPage()
        await page.setExtraHTTPHeaders({ 'User-Agent': CONFIG.userAgent })
        try {
            // Use 'domcontentloaded' instead of 'networkidle' to avoid hanging on
            // government portals that have infinite polling/keep-alive connections.
            const response = await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: CONFIG.timeoutMs,
            })
            // Wait for lazy-loaded notification sections to render
            await page.waitForTimeout(3000)
            // Attempt to also wait for any table/list elements to appear
            await page.waitForSelector('table, ul, .notification, .notice, #main-content', {
                timeout: 5000
            }).catch(() => { /* selector not found — proceed anyway */ })
            return { html: await page.content(), httpStatus: response?.status() ?? 200 }
        } finally {
            await page.close()
        }
    }

    async fetch(site) {
        await sleep(CONFIG.requestDelayMs)
        try {
            return site.scrape_method === 'js_render'
                ? await this.fetchDynamic(site.notification_page)
                : await this.fetchStatic(site.notification_page)
        } catch (err) {
            const httpStatus = err.response?.status ?? null
            const status = httpStatus === 403 || httpStatus === 429
                ? 'BLOCKED'
                : err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED'
                    ? 'TIMEOUT'
                    : 'ERROR'
            return { html: null, httpStatus, errorStatus: status, errorMsg: err.message }
        }
    }
}

// ─── HTML Processing ──────────────────────────────────────────────────────────

function hashNotificationSection(html) {
    const $ = cheerio.load(html)
    // Remove everything that changes without new content (ads, counters, nav)
    $('script, style, nav, header, footer, .ads, #ads, .advertisement, iframe, img').remove()
    $('[class*="counter"], [class*="visitor"], [id*="counter"], [id*="visitor"]').remove()
    $('time, .datetime, .timestamp, .clock').remove()

    // Government sites use varied class names — try the most specific first
    const candidateSelectors = [
        // Notification-specific
        '#notification-list', '.notification-list', '#notif-box', '.notif-section',
        '#news-updates', '.news-scroll', '.marquee',
        // Common recruitment page patterns
        '#recruitment', '.recruitment-notice', '#vacancy', '.vacancy-list',
        '#advertisement', '.advt-list', '#notice-board', '.notice-board',
        // Generic fallbacks
        'table', '.content-area', '#main-content', '#content', 'main', 'article',
        'ul li a', '.content', '#container',
    ]

    let content = ''
    for (const sel of candidateSelectors) {
        const found = $(sel).first().text().trim()
        if (found.length > 150) { content = found; break }
    }
    if (!content) content = $('body').text().trim()

    return crypto.createHash('md5')
        .update(content.replace(/\s+/g, ' ').trim())
        .digest('hex')
}

function extractPdfLinks(html, baseUrl) {
    const $ = cheerio.load(html)
    const links = []

    // Strategy 1: <a href="*.pdf">
    $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || ''
        if (!href.toLowerCase().includes('.pdf')) return

        let absoluteUrl
        try { absoluteUrl = new URL(href, baseUrl).toString() } catch { return }

        links.push({
            url: absoluteUrl,
            link_text: $(el).text().trim().slice(0, 500),
            context: $(el).closest('tr, li, div, section').text().trim().slice(0, 1000),
        })
    })

    // Strategy 2: onclick handlers containing PDF URLs
    $('[onclick]').each((_, el) => {
        const onclick = $(el).attr('onclick') || ''
        const match = onclick.match(/['"]([^'"]*\.pdf[^'"]*)['\"]/i)
        if (!match) return
        try {
            links.push({
                url: new URL(match[1], baseUrl).toString(),
                link_text: $(el).text().trim().slice(0, 500),
                context: $(el).closest('tr, li, div').text().trim().slice(0, 1000),
            })
        } catch { }
    })

    // Strategy 3: data-href / data-url attributes with PDF paths
    $('[data-href*=".pdf"], [data-url*=".pdf"], [data-src*=".pdf"]').each((_, el) => {
        const href = $(el).attr('data-href') || $(el).attr('data-url') || $(el).attr('data-src') || ''
        if (!href.toLowerCase().includes('.pdf')) return
        try {
            links.push({
                url: new URL(href, baseUrl).toString(),
                link_text: $(el).text().trim().slice(0, 500),
                context: '',
            })
        } catch { }
    })

    // Deduplicate by URL
    const seen = new Set()
    return links.filter(l => {
        if (seen.has(l.url)) return false
        seen.add(l.url)
        return true
    })
}

// ─── RSS Helper ───────────────────────────────────────────────────────────────

async function fetchRssLinks(rssUrl) {
    try {
        const res = await axios.get(rssUrl, {
            headers: { 'User-Agent': CONFIG.userAgent, Accept: 'application/rss+xml,application/xml,text/xml' },
            timeout: CONFIG.timeoutMs,
        })
        const $ = cheerio.load(res.data, { xmlMode: true })
        const items = []
        $('item').each((_, el) => {
            const url = $(el).find('link').text().trim() || $(el).find('guid').text().trim()
            if (url && url.toLowerCase().includes('.pdf')) {
                items.push({
                    url,
                    link_text: $(el).find('title').text().trim().slice(0, 500),
                    context: $(el).find('description').text().trim().slice(0, 1000),
                })
            }
        })
        return items
    } catch (err) {
        logger.warn({ rssUrl, err: err.message }, 'RSS fetch failed')
        return []
    }
}

// ─── PDF Processor ────────────────────────────────────────────────────────────
// Download → SHA-256 → dedup check → upload → log → webhook (main app handles parse + delete)

async function processPdfLink(link, site) {
    // Download with retry
    let pdfBuffer
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const res = await axios.get(link.url, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': CONFIG.userAgent },
                timeout: CONFIG.timeoutMs,
            })
            pdfBuffer = Buffer.from(res.data)
            break
        } catch (err) {
            if (attempt === 2) {
                logger.warn({ url: link.url, err: err.message }, 'PDF download failed after 2 attempts')
                return null
            }
            await sleep(2000)
        }
    }

    // Validate it's actually a PDF
    if (!pdfBuffer || pdfBuffer.length < 1000) {
        logger.warn({ url: link.url, bytes: pdfBuffer?.length }, 'PDF too small — skipping')
        return null
    }
    if (pdfBuffer.slice(0, 4).toString() !== '%PDF') {
        logger.warn({ url: link.url }, 'Response is not a PDF — skipping')
        return null
    }

    // SHA-256 on raw bytes
    const sha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex')

    // Deduplication — same PDF content won't be reprocessed (hash lives forever)
    if (await isPdfAlreadySeen(sha256)) {
        logger.debug({ site: site.id, hash: sha256.slice(0, 12) }, 'Duplicate PDF — skip')
        return null
    }

    // Upload to Supabase Storage (temporary — main app deletes after AI parsing)
    let storagePath
    try {
        storagePath = await uploadPdfToStorage(pdfBuffer, site.id, sha256)
    } catch (err) {
        logger.error({ url: link.url, err: err.message }, 'Storage upload failed')
        return null
    }

    // Record hash IMMEDIATELY — prevents any future scrape from re-downloading
    await recordPdfHash({ hash: sha256, source_url: link.url, site_id: site.id, storage_path: storagePath })

    // Record in pdf_ingestion_log
    const ingestionLogId = await recordIngestionLog({
        site_id: site.id,
        source_url: link.url,
        pdf_hash: sha256,
        storage_path: storagePath,
        link_text: link.link_text || null,
        context_text: link.context || null,
        status: 'QUEUED',
    })

    // Fire webhook → main app: downloads, AI-parses, inserts to exams table, deletes PDF
    const webhookResult = await notifyMainApp({
        site_id: site.id,
        site_name: site.name,
        category: site.category,
        state: site.state ?? null,
        source_url: link.url,
        storage_path: storagePath,
        link_text: link.link_text ?? null,
        context_text: link.context ?? null,
        pdf_hash: sha256,
        ingestion_log_id: ingestionLogId,
        scraped_at: new Date().toISOString(),
    })

    if (webhookResult?.success) {
        logger.info({ site: site.id, hash: sha256.slice(0, 12), exam: webhookResult.name }, '✅ PDF parsed and exam saved')
    } else if (!webhookResult?.skipped) {
        logger.warn({ site: site.id, hash: sha256.slice(0, 12) }, '⏳ Webhook deferred — pg_cron will retry')
    }

    return sha256
}

// ─── Site Processors ──────────────────────────────────────────────────────────

async function processSite(site, fetcher) {
    const startMs = Date.now()
    logger.info({ site: site.id }, `→ ${site.name}`)

    // RSS shortcut — structured, reliable, no HTML scraping needed
    if (site.has_rss && site.rss_url) {
        const rssLinks = await fetchRssLinks(site.rss_url)
        const rssHash = crypto.createHash('md5')
            .update(rssLinks.map(l => l.url).join('|'))
            .digest('hex')

        const lastHash = await getLastContentHash(`${site.id}_rss`)
        if (lastHash === rssHash) {
            await writeScraperLog({ site_id: site.id, status: 'NO_CHANGE', content_hash: rssHash, duration_ms: Date.now() - startMs, new_pdfs_found: 0 })
            return { siteId: site.id, status: 'NO_CHANGE' }
        }

        const processed = (await Promise.all(rssLinks.map(l => processPdfLink(l, site)))).filter(Boolean)
        await writeScraperLog({ site_id: site.id, status: 'OK', content_hash: rssHash, duration_ms: Date.now() - startMs, new_pdfs_found: processed.length })
        return { siteId: site.id, status: 'OK', newPdfs: processed.length }
    }

    // HTML fetch
    const { html, httpStatus, errorStatus, errorMsg } = await fetcher.fetch(site)

    if (!html) {
        await writeScraperLog({ site_id: site.id, status: errorStatus || 'ERROR', http_status: httpStatus, error_message: errorMsg, duration_ms: Date.now() - startMs, new_pdfs_found: 0 })
        return { siteId: site.id, status: errorStatus || 'ERROR' }
    }

    // Change detection
    const newHash = hashNotificationSection(html)
    const lastHash = await getLastContentHash(site.id)

    if (lastHash && lastHash === newHash) {
        await writeScraperLog({ site_id: site.id, status: 'NO_CHANGE', content_hash: newHash, http_status: httpStatus, duration_ms: Date.now() - startMs, new_pdfs_found: 0 })
        logger.debug({ site: site.id }, 'No change')
        return { siteId: site.id, status: 'NO_CHANGE' }
    }

    logger.info({ site: site.id }, '🔔 Change detected')

    const pdfLinks = extractPdfLinks(html, site.notification_page)
    const processed = []
    for (const link of pdfLinks) {
        const result = await processPdfLink(link, site)
        if (result) processed.push(result)
    }

    await writeScraperLog({ site_id: site.id, status: 'OK', content_hash: newHash, http_status: httpStatus, duration_ms: Date.now() - startMs, new_pdfs_found: processed.length })
    return { siteId: site.id, status: 'OK', newPdfs: processed.length }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    logger.info({ priorities: CONFIG.priorityFilter, site: CONFIG.siteIdFilter ?? 'all' },
        'ExamTracker Scraper starting')

    const sitesJson = JSON.parse(
        await readFile(join(__dirname, 'sites.json'), 'utf8')
    )

    const allSites = []
    for (const sites of Object.values(sitesJson.sites)) {
        for (const site of sites) {
            if (site.scrape_method === 'manual') continue
            if (!site.notification_page && !(site.has_rss && site.rss_url)) continue
            if (!CONFIG.priorityFilter.includes(site.priority)) continue
            if (CONFIG.siteIdFilter && site.id !== CONFIG.siteIdFilter) continue
            allSites.push(site)
        }
    }

    logger.info({ total: allSites.length }, 'Sites loaded')

    const fetcher = new PageFetcher()
    const needsPlaywright = allSites.some(s => s.scrape_method === 'js_render')
    if (needsPlaywright) await fetcher.init()

    const limit = pLimit(CONFIG.concurrency)
    const results = await Promise.all(
        allSites.map(site => limit(() => processSite(site, fetcher)))
    )

    await fetcher.close()

    const summary = {
        total: results.length,
        ok: results.filter(r => r.status === 'OK').length,
        noChange: results.filter(r => r.status === 'NO_CHANGE').length,
        failed: results.filter(r => ['ERROR', 'BLOCKED', 'TIMEOUT'].includes(r.status)).length,
        newPdfs: results.reduce((sum, r) => sum + (r.newPdfs || 0), 0),
    }

    logger.info(summary, 'Run complete')

    const p0Ids = allSites.filter(s => s.priority === 'P0').map(s => s.id)
    const p0Failed = results.filter(r => p0Ids.includes(r.siteId) && r.status === 'ERROR').length
    if (p0Failed > 0) {
        logger.error({ p0Failed }, `${p0Failed} P0 site(s) failed`)
        process.exit(1)
    }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

main().catch(err => {
    logger.error({ err: err.message, stack: err.stack }, 'Scraper crashed')
    process.exit(1)
})
