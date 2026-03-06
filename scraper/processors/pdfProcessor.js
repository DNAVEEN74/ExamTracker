import axios from 'axios'
import https from 'https'
import { CONFIG } from '../config/index.js'
import { logger } from '../utils/logger.js'
import { sleep } from '../utils/sleep.js'
import { hashBufferSha256 } from '../utils/crypto.js'
import { isPdfAlreadySeen, uploadPdfToStorage, recordPdfHash, recordIngestionLog } from '../services/database.js'
import { notifyMainApp } from '../services/api.js'

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
                httpsAgent: new https.Agent({ rejectUnauthorized: false })
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
    if (!pdfBuffer || pdfBuffer.length < 100) {
        logger.warn({ url: link.url, bytes: pdfBuffer?.length }, 'PDF too small — skipping')
        return null
    }
    // Check magic bytes: %PDF (0x25 0x50 0x44 0x46)
    if (pdfBuffer[0] !== 0x25 || pdfBuffer[1] !== 0x50 || pdfBuffer[2] !== 0x44 || pdfBuffer[3] !== 0x46) {
        logger.warn({ url: link.url }, 'Response is not a PDF (magic bytes mismatch) — skipping')
        return null
    }

    // SHA-256 on raw bytes
    const sha256 = hashBufferSha256(pdfBuffer)

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
