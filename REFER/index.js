/**
 * ExamTracker India — Government Site Scraper (v2)
 * Node.js | Cheerio + Playwright | Supabase Storage + DB
 *
 * Architecture (v2 — per README.md):
 *   Hash store   → scraper_log.content_hash in Supabase DB (survives Railway restarts)
 *   PDF storage  → Supabase Storage /raw-pdfs/{site_id}/{YYYY}/{MM}/{sha256}.pdf
 *   Dedup        → pdf_hashes table (SHA-256 on raw PDF bytes)
 *   Handoff      → POST /api/webhooks/new-pdf on the main app
 *   Scheduling   → Railway cron jobs (not node-cron — Railway restarts kill processes)
 *
 * Flow:
 *   1. Load sites.json config, filter by PRIORITY_FILTER env var
 *   2. For each site: fetch notification page HTML or RSS
 *   3. Hash the notification section → compare against scraper_log.content_hash
 *   4. If no change → write scraper_log(status=NO_CHANGE) → done
 *   5. If changed → extract PDF links → download each PDF
 *   6. SHA-256 hash of PDF bytes → check pdf_hashes table → skip if seen
 *   7. Upload PDF to Supabase Storage at /raw-pdfs/{site_id}/{YYYY}/{MM}/{sha256}.pdf
 *   8. Insert pdf_hashes row, pdf_ingestion_log row
 *   9. POST webhook to main app → triggers PDF parsing pipeline
 *  10. Write scraper_log(status=OK, new_pdfs_found=N, content_hash=new_hash)
 */

import * as cheerio from 'cheerio'
import axios from 'axios'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import pLimit from 'p-limit'
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
})

// ─── Supabase Client ──────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ─── Config ──────────────────────────────────────────────────────────────────

const CONFIG = {
  concurrency: parseInt(process.env.SCRAPE_CONCURRENCY || '3'),
  requestDelayMs: parseInt(process.env.REQUEST_DELAY_MS || '2000'),
  timeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000'),
  priorityFilter: (process.env.PRIORITY_FILTER || 'P0,P1').split(','),
  siteIdFilter: process.env.SITE_ID || null,  // For local dev: run a single site
  parsingWebhookUrl: process.env.PARSING_WEBHOOK_URL,
  webhookSecret: process.env.SCRAPER_WEBHOOK_SECRET,
  userAgent: 'ExamTrackerBot/1.0 (+https://examtracker.in/bot) Academic aggregation service',
  storage: {
    bucket: 'raw-pdfs',
  },
}

// ─── Hash Store (Supabase DB) ────────────────────────────────────────────────
// Replaces the JSON file hash store. Survives Railway restarts and deployments.

async function getLastContentHash(siteId) {
  const { data, error } = await supabase
    .from('scraper_log')
    .select('content_hash')
    .eq('site_id', siteId)
    .not('content_hash', 'is', null)
    .order('scraped_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    logger.warn({ siteId, error: error.message }, 'Failed to fetch last hash')
    return null
  }
  return data?.content_hash ?? null
}

async function writeScraperLog(entry) {
  const { error } = await supabase.from('scraper_log').insert(entry)
  if (error) {
    logger.error({ error: error.message }, 'Failed to write scraper_log')
  }
}

// ─── PDF Deduplication ────────────────────────────────────────────────────────
// SHA-256 on raw PDF bytes. Returns true if this PDF was already processed.

async function isPdfAlreadySeen(sha256Hash) {
  const { data, error } = await supabase
    .from('pdf_hashes')
    .select('id')
    .eq('hash', sha256Hash)
    .maybeSingle()

  if (error) {
    logger.warn({ error: error.message }, 'pdf_hashes lookup failed — treating as new')
    return false  // Fail open: attempt processing
  }
  return !!data
}

async function recordPdfHash(entry) {
  const { error } = await supabase.from('pdf_hashes').upsert(entry, {
    onConflict: 'hash',
    ignoreDuplicates: true,
  })
  if (error) {
    logger.error({ error: error.message }, 'Failed to insert pdf_hashes row')
  }
}

// ─── Supabase Storage Upload ──────────────────────────────────────────────────

async function uploadPdfToStorage(pdfBuffer, siteId, sha256Hash) {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const storagePath = `${siteId}/${yyyy}/${mm}/${sha256Hash}.pdf`

  const { error } = await supabase.storage
    .from(CONFIG.storage.bucket)
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,  // Never overwrite — sha256 path is deterministic
    })

  if (error) {
    // 'Duplicate' error means file already exists — that's fine (content-addressed)
    if (error.message?.includes('already exists')) {
      logger.debug({ storagePath }, 'PDF already in storage (hash collision with db? skipping)')
      return storagePath
    }
    throw new Error(`Storage upload failed: ${error.message}`)
  }

  return storagePath  // Returns: {siteId}/{YYYY}/{MM}/{sha256}.pdf
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
// Fires after each new PDF is stored. Main app picks it up and starts parsing.

async function notifyMainApp(payload) {
  if (!CONFIG.parsingWebhookUrl) {
    // Dev mode: log to console (no main app running locally)
    logger.info({ payload }, '[DEV] Would POST /api/webhooks/new-pdf')
    return
  }

  try {
    await axios.post(CONFIG.parsingWebhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-scraper-secret': CONFIG.webhookSecret,
      },
      timeout: 10000,
    })
  } catch (err) {
    // Non-fatal: PDF is stored. If webhook fails, recovery cron will requeue it.
    logger.warn({ err: err.message, siteId: payload.site_id }, 'Webhook POST failed — PDF is stored, pipeline will recover')
  }
}

// ─── Page Fetcher ─────────────────────────────────────────────────────────────

class PageFetcher {
  constructor() { this.browser = null }

  async init() {
    this.browser = await chromium.launch({ headless: true })
  }

  async close() {
    if (this.browser) await this.browser.close()
  }

  async fetchStatic(url) {
    const response = await axios.get(url, {
      headers: { 'User-Agent': CONFIG.userAgent },
      timeout: CONFIG.timeoutMs,
      maxRedirects: 5,
    })
    return { html: response.data, httpStatus: response.status }
  }

  async fetchDynamic(url) {
    const page = await this.browser.newPage()
    await page.setExtraHTTPHeaders({ 'User-Agent': CONFIG.userAgent })
    try {
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: CONFIG.timeoutMs,
      })
      await page.waitForTimeout(2000)
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
      const status = httpStatus === 403 ? 'BLOCKED'
        : httpStatus === 429 ? 'BLOCKED'
          : err.code === 'ETIMEDOUT' ? 'TIMEOUT'
            : 'ERROR'
      logger.warn({ siteId: site.id, err: err.message, httpStatus }, `Fetch ${status}`)
      return { html: null, httpStatus, errorStatus: status }
    }
  }
}

// ─── HTML Processing ──────────────────────────────────────────────────────────

function hashNotificationSection(html, siteId) {
  const $ = cheerio.load(html)
  $('script, style, nav, header, footer, .ads, #ads, .advertisement, iframe').remove()

  let content = ''
  for (const sel of ['table', '.notification', '.notice', '.recruitment', '#notifications', 'ul li a', '.content a']) {
    const found = $(sel).text().trim()
    if (found.length > 100) { content = found; break }
  }
  if (!content) content = $('body').text().trim()

  const normalized = content.replace(/\s+/g, ' ').trim()
  return crypto.createHash('md5').update(normalized).digest('hex')
}

function extractNotificationSnippets(html, baseUrl) {
  const $ = cheerio.load(html)
  const snippets = []

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const lower = href.toLowerCase()

    if (!lower.includes('.pdf') && !lower.includes('recruit') && !lower.includes('notif')
      && !lower.includes('advt') && !lower.includes('vacancy')) return

    let absoluteUrl
    try { absoluteUrl = new URL(href, baseUrl).toString() } catch { return }

    const linkText = $(el).text().trim()
    const parentText = $(el).parent().text().trim()
    const grandText = $(el).parent().parent().text().trim()

    snippets.push({
      url: absoluteUrl,
      link_text: linkText,
      context: (grandText || parentText).substring(0, 500),
    })
  })

  // Strategy 2: onclick handlers with PDF URLs
  $('[onclick]').each((_, el) => {
    const onclick = $(el).attr('onclick') || ''
    const urlMatch = onclick.match(/['"]([^'"]*\.pdf[^'"]*)['\"]/i)
    if (urlMatch) {
      try {
        snippets.push({
          url: new URL(urlMatch[1], baseUrl).toString(),
          link_text: $(el).text().trim(),
          context: '',
        })
      } catch { }
    }
  })

  // Deduplicate by URL
  const seen = new Set()
  return snippets.filter(s => { if (seen.has(s.url)) return false; seen.add(s.url); return true })
}

// ─── PDF Downloader ───────────────────────────────────────────────────────────

async function downloadPdf(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': CONFIG.userAgent },
      timeout: CONFIG.timeoutMs,
    })
    return Buffer.from(response.data)
  } catch (err) {
    logger.warn({ url, err: err.message }, 'PDF download failed')
    return null
  }
}

// ─── RSS Fetcher ──────────────────────────────────────────────────────────────

async function fetchRssItems(rssUrl) {
  try {
    const response = await axios.get(rssUrl, {
      headers: { 'User-Agent': CONFIG.userAgent, 'Accept': 'application/rss+xml, application/xml, text/xml' },
      timeout: CONFIG.timeoutMs,
    })
    const $ = cheerio.load(response.data, { xmlMode: true })
    const items = []
    $('item').each((_, el) => {
      const link = $(el).find('link').text().trim() || $(el).find('guid').text().trim()
      if (link) items.push({
        url: link,
        link_text: $(el).find('title').text().trim(),
        context: $(el).find('description').text().trim().substring(0, 500),
        pubDate: $(el).find('pubDate').text().trim(),
      })
    })
    return items
  } catch (err) {
    logger.warn({ rssUrl, err: err.message }, 'RSS fetch failed')
    return []
  }
}

// ─── Core PDF Processor ───────────────────────────────────────────────────────
// Download → SHA-256 → dedup check → Supabase Storage → log → webhook

async function processPdf(snippet, site) {
  const pdfBuffer = await downloadPdf(snippet.url)
  if (!pdfBuffer) return null

  // SHA-256 on raw bytes — content-addressed, not URL-addressed
  const sha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex')

  // Deduplication check
  const alreadySeen = await isPdfAlreadySeen(sha256)
  if (alreadySeen) {
    logger.debug({ siteId: site.id, sha256: sha256.substring(0, 12) }, 'PDF already processed — skip')
    return null
  }

  // Upload to Supabase Storage
  let storagePath
  try {
    storagePath = await uploadPdfToStorage(pdfBuffer, site.id, sha256)
  } catch (err) {
    logger.error({ siteId: site.id, url: snippet.url, err: err.message }, 'Storage upload failed')
    return null
  }

  // Record in pdf_hashes (dedup table)
  await recordPdfHash({
    hash: sha256,
    source_url: snippet.url,
    site_id: site.id,
    storage_path: storagePath,
  })

  // Record in pdf_ingestion_log (pipeline tracking)
  const ingestionLogId = await recordIngestionLog({
    site_id: site.id,
    source_url: snippet.url,
    pdf_hash: sha256,
    storage_path: storagePath,
    link_text: snippet.link_text?.substring(0, 500) ?? null,
    context_text: snippet.context?.substring(0, 1000) ?? null,
    status: 'QUEUED',
  })

  // Fire webhook → main app starts the parsing pipeline
  await notifyMainApp({
    site_id: site.id,
    site_name: site.name,
    category: site.category,
    state: site.state ?? null,
    source_url: snippet.url,
    storage_path: storagePath,
    link_text: snippet.link_text ?? null,
    context_text: snippet.context ?? null,
    pdf_hash: sha256,
    ingestion_log_id: ingestionLogId,
    scraped_at: new Date().toISOString(),
  })

  logger.info({ siteId: site.id, sha256: sha256.substring(0, 12), storagePath }, '✅ New PDF queued')
  return sha256
}

// ─── Site Processor ───────────────────────────────────────────────────────────

async function processSite(site, fetcher) {
  const startMs = Date.now()
  logger.info({ siteId: site.id, url: site.notification_page }, `→ Scraping ${site.name}`)

  // Handle RSS feeds
  if (site.has_rss && site.rss_url) {
    return await processRssSite(site, startMs)
  }

  // Fetch HTML
  const { html, httpStatus, errorStatus } = await fetcher.fetch(site)

  if (!html) {
    await writeScraperLog({
      site_id: site.id,
      status: errorStatus || 'ERROR',
      http_status: httpStatus,
      duration_ms: Date.now() - startMs,
      new_pdfs_found: 0,
    })
    return { siteId: site.id, status: errorStatus || 'ERROR' }
  }

  // Hash the notification section
  const newHash = hashNotificationSection(html, site.id)
  const lastHash = await getLastContentHash(site.id)

  if (lastHash && lastHash === newHash) {
    await writeScraperLog({
      site_id: site.id,
      status: 'NO_CHANGE',
      content_hash: newHash,
      http_status: httpStatus,
      duration_ms: Date.now() - startMs,
      new_pdfs_found: 0,
    })
    logger.debug({ siteId: site.id }, 'No change')
    return { siteId: site.id, status: 'NO_CHANGE' }
  }

  logger.info({ siteId: site.id }, '🔔 Change detected!')

  // Extract PDF links with surrounding context
  const snippets = extractNotificationSnippets(html, site.notification_page)
  const processed = []

  for (const snippet of snippets) {
    if (!snippet.url.toLowerCase().includes('.pdf')) continue
    const result = await processPdf(snippet, site)
    if (result) processed.push(result)
  }

  // Update hash store with new hash (only after successful processing)
  await writeScraperLog({
    site_id: site.id,
    status: 'OK',
    content_hash: newHash,
    http_status: httpStatus,
    duration_ms: Date.now() - startMs,
    new_pdfs_found: processed.length,
  })

  return { siteId: site.id, status: 'OK', newPdfs: processed.length }
}

async function processRssSite(site, startMs) {
  const items = await fetchRssItems(site.rss_url)

  // Hash the list of item URLs (structure change detection)
  const rssHash = crypto.createHash('md5')
    .update(items.map(i => i.url).join('|'))
    .digest('hex')

  const lastHash = await getLastContentHash(`${site.id}_rss`)
  if (lastHash && lastHash === rssHash) {
    await writeScraperLog({
      site_id: site.id,
      status: 'NO_CHANGE',
      content_hash: rssHash,
      duration_ms: Date.now() - startMs,
      new_pdfs_found: 0,
    })
    return { siteId: site.id, status: 'NO_CHANGE' }
  }

  logger.info({ siteId: site.id, count: items.length }, '🔔 RSS: New items')

  const processed = []
  for (const item of items) {
    if (!item.url.toLowerCase().includes('.pdf')) continue
    const result = await processPdf(item, site)
    if (result) processed.push(result)
  }

  await writeScraperLog({
    site_id: site.id,
    status: 'OK',
    content_hash: rssHash,
    duration_ms: Date.now() - startMs,
    new_pdfs_found: processed.length,
  })

  return { siteId: site.id, status: 'OK', newPdfs: processed.length }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  logger.info({ priorities: CONFIG.priorityFilter }, 'ExamTracker Scraper starting')

  // Load sites.json
  const { default: sitesConfig } = await import('./sites.json', { assert: { type: 'json' } })

  const allSites = []
  for (const sites of Object.values(sitesConfig.sites)) {
    for (const site of sites) {
      if (site.scrape_method === 'manual') continue
      if (!site.notification_page && !site.rss_url) continue
      if (!CONFIG.priorityFilter.includes(site.priority)) continue
      if (CONFIG.siteIdFilter && site.id !== CONFIG.siteIdFilter) continue
      allSites.push(site)
    }
  }

  logger.info({ total: allSites.length }, 'Sites loaded')

  const fetcher = new PageFetcher()
  await fetcher.init()

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

  logger.info(summary, 'Scraper run complete')

  // Exit with error code if any P0 site failed (Railway can alert on non-zero exit)
  const p0Sites = allSites.filter(s => s.priority === 'P0').map(s => s.id)
  const p0Failed = results.filter(r => p0Sites.includes(r.siteId) && r.status === 'ERROR').length
  if (p0Failed > 0) {
    logger.error({ p0Failed }, `${p0Failed} P0 site(s) failed — check scraper_log`)
    process.exit(1)
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

main().catch(err => {
  logger.error({ err: err.message, stack: err.stack }, 'Scraper crashed')
  process.exit(1)
})
