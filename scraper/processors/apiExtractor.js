/**
 * API Extractor — fetches notifications from JSON API endpoints
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Used for sites where scrape_method = "api" in sites.json.
 * These are Angular/React SPAs that load data via XHR, not HTML.
 *
 * Returns the same link shape as htmlExtractor.js so siteProcessor.js
 * doesn't need to know the difference.
 *
 * Supports pagination: set api_config.max_pages to fetch beyond page 1.
 * Default is 1 (only latest notices). On initial deployment, set to 5-10
 * to backfill historical notifications.
 */

import axios from 'axios'
import https from 'https'
import { CONFIG } from '../config/index.js'
import { logger } from '../utils/logger.js'
import { sleep } from '../utils/sleep.js'

// Shared HTTPS agent — created once, reused across all API fetches in this run
const httpsAgent = new https.Agent({ rejectUnauthorized: false })

/**
 * Fetch notification links from a JSON API endpoint (with pagination).
 *
 * @param {object} site - Site config with api_config block
 * @returns {Promise<Array<{type, url, link_text, context, headline, date}>>}
 */
export async function fetchApiLinks(site) {
    const cfg = site.api_config
    if (!cfg?.endpoint) {
        logger.error({ siteId: site.id }, 'api_config.endpoint missing in sites.json')
        return []
    }

    const maxPages = cfg.max_pages ?? 1
    const headlineField = cfg.headline_field ?? 'headline'
    const dateField = cfg.date_field ?? 'createdAt'
    const attachField = cfg.attachment_field ?? 'attachments'
    const pathField = cfg.attachment_path_field ?? 'path'
    const nameField = cfg.attachment_name_field ?? 'fileName'
    const urlPrefix = cfg.attachment_url_prefix ?? ''
    const dataPath = (cfg.data_path ?? 'data').split('.')

    const allLinks = []
    const seenUrls = new Set() // Dedup: same PDF can appear in multiple notice entries

    for (let page = 1; page <= maxPages; page++) {
        const params = { ...(cfg.params ?? {}), page }
        let data

        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const res = await axios.get(cfg.endpoint, {
                    params,
                    headers: {
                        'User-Agent': CONFIG.userAgent,
                        'Accept': 'application/json',
                        'Referer': site.url,
                    },
                    timeout: CONFIG.timeoutMs,
                    httpsAgent,
                })

                // Navigate to the array using dot-path (e.g. "data" or "response.notices")
                data = res.data
                for (const part of dataPath) data = data?.[part]

                if (!Array.isArray(data)) {
                    logger.warn({ siteId: site.id, page, type: typeof data }, 'API response data is not an array')
                    data = []
                }

                logger.info({ siteId: site.id, page, count: data.length }, `API page ${page}: ${data.length} notices`)
                break
            } catch (err) {
                if (attempt === 2) {
                    logger.error({ siteId: site.id, page, err: err.message }, 'API fetch failed after 2 attempts')
                    data = []
                } else {
                    logger.warn({ siteId: site.id, page, err: err.message }, `API fetch attempt ${attempt} failed, retrying...`)
                    await sleep(2000)
                }
            }
        }

        if (!data || data.length === 0) break // No more pages

        for (const notice of data) {
            const headline = notice[headlineField] ?? ''
            const dateRaw = notice[dateField]
            const dateStr = dateRaw ? new Date(dateRaw).toLocaleDateString('en-IN') : 'unknown date'
            const attachments = notice[attachField]

            if (!Array.isArray(attachments) || attachments.length === 0) continue

            for (const att of attachments) {
                let path = att[pathField]
                if (!path) continue

                // Normalise path separators (SSC uses backslashes in paths)
                if (cfg.path_transform === 'backslash_to_forward') {
                    path = path.replace(/\\/g, '/')
                }

                const pdfUrl = path.startsWith('http')
                    ? path
                    : `${urlPrefix}${path.startsWith('/') ? path.slice(1) : path}`

                // Skip if we've already queued this URL from another notice
                if (seenUrls.has(pdfUrl)) continue
                seenUrls.add(pdfUrl)

                allLinks.push({
                    type: 'pdf',
                    url: pdfUrl,
                    link_text: headline,
                    context: `${site.name} | ${dateStr} | ${att[nameField] ?? ''}`,
                    headline,
                    date: dateStr,
                })
            }
        }

        // Small delay between pages to be polite to the server
        if (page < maxPages && data.length > 0) await sleep(500)
    }

    logger.info({ siteId: site.id, totalPdfs: allLinks.length }, `Total PDF links extracted from API`)
    return allLinks
}
