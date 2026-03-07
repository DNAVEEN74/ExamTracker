import axios from 'axios'
import https from 'https'
import { CONFIG } from '../config/index.js'
import { logger } from '../utils/logger.js'
import { sleep } from '../utils/sleep.js'
import { hashBufferSha256 } from '../utils/crypto.js'
import { isPdfAlreadySeen, uploadPdfToStorage, recordPdfHash, recordIngestionLog } from '../services/database.js'
import { notifyMainApp } from '../services/api.js'
import { classifyNotification, SHOULD_PARSE_TYPES } from './aiClassifier.js'

// Shared HTTPS agent — created once, reused across all PDF downloads in this run
const httpsAgent = new https.Agent({ rejectUnauthorized: false })

export async function processPdfLink(link, site) {
    // Download with retry
    let pdfBuffer
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const res = await axios.get(link.url, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': CONFIG.userAgent },
                timeout: CONFIG.timeoutMs,
                maxContentLength: CONFIG.maxPdfSizeBytes,
                httpsAgent,
            })
            pdfBuffer = Buffer.from(res.data)
            break
        } catch (err) {
            if (attempt === 2) {
                logger.warn({ url: link.url, err: err.message }, 'PDF download failed after 2 attempts')
                return { status: 'DOWNLOAD_FAILED', reason: err.message }
            }
            await sleep(2000)
        }
    }

    // Validate it's actually a PDF
    if (!pdfBuffer || pdfBuffer.length < 100) {
        logger.warn({ url: link.url, bytes: pdfBuffer?.length }, 'PDF too small — skipping')
        return { status: 'INVALID_PDF', reason: 'too small' }
    }
    // Check magic bytes: %PDF (0x25 0x50 0x44 0x46)
    if (pdfBuffer[0] !== 0x25 || pdfBuffer[1] !== 0x50 || pdfBuffer[2] !== 0x44 || pdfBuffer[3] !== 0x46) {
        logger.warn({ url: link.url }, 'Response is not a PDF (magic bytes mismatch) — skipping')
        return { status: 'INVALID_PDF', reason: 'magic bytes mismatch' }
    }

    // SHA-256 on raw bytes
    const sha256 = hashBufferSha256(pdfBuffer)

    // Deduplication — same PDF content won't be reprocessed (hash lives forever)
    if (await isPdfAlreadySeen(sha256)) {
        logger.debug({ site: site.id, hash: sha256.slice(0, 12) }, 'Duplicate PDF — skip')
        return { status: 'DUPLICATE', hash: sha256 }
    }

    // ── Tier 1: AI Classification ────────────────────────────────────────────
    // Use the headline from API scraping (rich title) or fall back to link_text (HTML scraping)
    const headline = link.headline ?? link.link_text ?? link.context ?? link.url
    const classification = await classifyNotification({
        headline,
        pdfBuffer,
        siteId: site.id,
        siteName: site.name,
    })

    // Only forward RECRUITMENT type to the full AI parser + database
    if (!SHOULD_PARSE_TYPES.has(classification.type)) {
        logger.info(
            { site: site.id, type: classification.type, headline: headline.slice(0, 60), reason: classification.reason },
            `⏭️  Classified as ${classification.type} — skipping full parse`
        )
        return { status: 'CLASSIFIED_SKIP', type: classification.type, reason: classification.reason }
    }

    logger.info({ site: site.id, headline: headline.slice(0, 60) }, '✅ Confirmed RECRUITMENT — proceeding to parse')

    // Upload to Cloudflare R2 (temporary — main app deletes PDF after AI parsing, hash is kept forever)
    let storagePath
    try {
        storagePath = await uploadPdfToStorage(pdfBuffer, site.id, sha256)
    } catch (err) {
        logger.error({ url: link.url, err: err.message }, 'Storage upload failed')
        return { status: 'UPLOAD_FAILED', reason: err.message }
    }

    // Record hash IMMEDIATELY — prevents any future scrape from re-downloading
    await recordPdfHash({ hash: sha256, source_url: link.url, site_id: site.id, storage_path: storagePath })

    // Record in pdf_ingestion_log
    const ingestionLogId = await recordIngestionLog({
        site_id: site.id,
        source_url: link.url,
        pdf_hash: sha256,
        storage_path: storagePath,
        link_text: headline,
        context_text: link.context ?? null,
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
        link_text: headline,
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

    return { status: 'OK', hash: sha256, classification: classification.type }
}

