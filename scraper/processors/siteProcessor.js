import crypto from 'crypto'
import * as cheerio from 'cheerio'
import pLimit from 'p-limit'
import { CONFIG } from '../config/index.js'
import { logger } from '../utils/logger.js'
import { hashNotificationSection } from '../utils/crypto.js'
import { writeScraperLog, getLastContentHash } from '../services/database.js'
import { processPdfLink } from './pdfProcessor.js'
import { fetchRssLinks } from './rssExtractor.js'
import { extractLinks } from './htmlExtractor.js'
import { isRelevantLink } from './relevanceFilter.js'

async function processLevel1Links(links, site, fetcher) {
    const limitMap = pLimit(CONFIG.concurrency)
    const validPdfs = []

    await Promise.all(links.map(link => limitMap(async () => {
        // Stage 4: Relevance Filter
        if (!isRelevantLink(link.link_text, link.context)) {
            return
        }

        // Stage 3: Deep Crawl for Detail Pages
        if (link.type === 'detail_page') {
            logger.debug({ url: link.url }, 'Deep crawling detail page')
            try {
                const { html } = await fetcher.fetchStatic(link.url) // Assumes detail pages are usually static
                if (html) {
                    const $ = cheerio.load(html)
                    // We only want PDFs from the detail page, no generic recursions
                    const detailPdfs = extractLinks($, link.url, site).filter(l => l.type === 'pdf')

                    for (const pdf of detailPdfs) {
                        // Inherit context from the Level 0 link so AI gets the real title
                        pdf.context = `${link.link_text} | ${link.context} | ${pdf.link_text}`
                        validPdfs.push(pdf)
                    }
                }
            } catch (err) {
                logger.warn({ url: link.url, err: err.message }, 'Failed to deep crawl detail page')
            }
            return
        }

        // Direct PDFs and Dynamic downloads flow through directly
        validPdfs.push(link)
    })))

    return validPdfs
}

export async function processSite(site, fetcher) {
    const startMs = Date.now()
    logger.info({ site: site.id }, `→ ${site.name}`)

    if (site.has_rss && site.rss_url) {
        const rssLinks = await fetchRssLinks(site.rss_url)
        const rssHash = crypto.createHash('md5')
            .update(rssLinks.map(l => l.url).join('|'))
            .digest('hex')

        const lastHash = await getLastContentHash(`${site.id}`)
        if (lastHash === rssHash) {
            await writeScraperLog({ site_id: site.id, status: 'NO_CHANGE', content_hash: rssHash, duration_ms: Date.now() - startMs, new_pdfs_found: 0 })
            return { siteId: site.id, status: 'NO_CHANGE' }
        }

        // Apply Relevance Filter + Deep Crawling Pipeline to RSS items
        const finalPdfLinks = await processLevel1Links(rssLinks, site, fetcher)

        const limitMap = pLimit(CONFIG.concurrency)
        const processed = (await Promise.all(
            finalPdfLinks.map(l => limitMap(() => processPdfLink(l, site)))
        )).filter(Boolean)

        await writeScraperLog({ site_id: site.id, status: 'OK', content_hash: rssHash, duration_ms: Date.now() - startMs, new_pdfs_found: processed.length })
        return { siteId: site.id, status: 'OK', newPdfs: processed.length }
    }

    // --- HTML Fetch with Smart Pagination ---
    let totalProcessed = 0
    let lastHashFound = null
    let maxPages = site.pagination?.max_pages || 1
    const limitMap = pLimit(CONFIG.concurrency) // Global limit across all pages

    for (let page = 1; page <= maxPages; page++) {
        let fetchUrl = site.notification_page
        if (page > 1 && site.pagination) {
            const separator = fetchUrl.includes('?') ? '&' : '?'
            fetchUrl = `${fetchUrl}${separator}${site.pagination.param}=${page}`
            logger.debug({ site: site.id, page }, 'Fetching paginated page')
        }

        const { html, httpStatus, errorStatus, errorMsg } = page === 1
            ? await fetcher.fetch(site) // Uses configured mode + handles delay seamlessly
            : await fetcher.fetchStatic(fetchUrl) // Paginated pages are almost always static 

        if (!html) {
            if (page === 1) {
                await writeScraperLog({ site_id: site.id, status: errorStatus || 'ERROR', http_status: httpStatus, error_message: errorMsg, duration_ms: Date.now() - startMs, new_pdfs_found: 0 })
                return { siteId: site.id, status: errorStatus || 'ERROR' }
            }
            break // If paginated fetch fails, just stop climbing
        }

        const $ = cheerio.load(html)

        // --- Change Detection (Only for Page 1) ---
        if (page === 1) {
            const containerSelector = site.notification_container || null
            // Feed null down if selector not defined so it defaults to dom body fallback parsing
            const contentToHash = containerSelector ? $(containerSelector).text() : null
            lastHashFound = hashNotificationSection($, contentToHash)
            const historicHash = await getLastContentHash(site.id)

            if (historicHash && historicHash === lastHashFound) {
                await writeScraperLog({ site_id: site.id, status: 'NO_CHANGE', content_hash: lastHashFound, http_status: httpStatus, duration_ms: Date.now() - startMs, new_pdfs_found: 0 })
                logger.debug({ site: site.id }, 'No change')
                return { siteId: site.id, status: 'NO_CHANGE' }
            }
            logger.info({ site: site.id }, '🔔 Change detected')
        }

        // --- Stage 2: Link Discovery ---
        const level0Links = extractLinks($, fetchUrl, site)

        // --- Stage 3 & 4: Deep Crawl & Filter ---
        const finalPdfLinks = await processLevel1Links(level0Links, site, fetcher)

        // --- Stage 5: PDF Pipeline ---
        const processedPageResults = (await Promise.all(
            finalPdfLinks.map(link => limitMap(() => processPdfLink(link, site)))
        )).filter(Boolean)

        totalProcessed += processedPageResults.length

        // --- Stop-On-Known Pagination Strategy ---
        if (level0Links.length === 0 || (finalPdfLinks.length > 0 && processedPageResults.length === 0)) {
            logger.debug({ site: site.id, page }, 'Hit historical boundary (all PDFs on this page are known, or no links found). Stopping pagination.')
            break
        }
    }

    // Always log the hash of Page 1
    await writeScraperLog({
        site_id: site.id,
        status: 'OK',
        content_hash: lastHashFound,
        duration_ms: Date.now() - startMs,
        new_pdfs_found: totalProcessed
    })

    return { siteId: site.id, status: 'OK', newPdfs: totalProcessed }
}
