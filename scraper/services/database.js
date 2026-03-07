import { PrismaClient } from '@prisma/client'
import pRetry from 'p-retry'
import { logger } from '../utils/logger.js'
import { uploadToR2 } from '../utils/r2.js'

export const prisma = new PrismaClient()
export const hashCache = new Map()

export async function preloadHashes(siteIds) {
    if (!siteIds.length) return
    try {
        const data = await prisma.scraperLog.findMany({
            where: { site_id: { in: siteIds } },
            select: { site_id: true, content_hash: true },
            orderBy: { scraped_at: 'desc' },
            take: 2000,
        })

        for (const row of data) {
            if (row.content_hash && !hashCache.has(row.site_id)) {
                hashCache.set(row.site_id, row.content_hash)
            }
        }
    } catch (error) {
        logger.error({ error: error.message }, 'Failed to preload hashes')
    }
}

export async function getLastContentHash(siteId) {
    return hashCache.get(siteId) ?? null
}

export async function writeScraperLog(entry) {
    try {
        await pRetry(async () => {
            await prisma.scraperLog.create({
                data: {
                    site_id: entry.site_id,
                    status: entry.status,
                    content_hash: entry.content_hash,
                    http_status: entry.http_status,
                    error_message: entry.error_message,
                    duration_ms: entry.duration_ms,
                    new_pdfs_found: entry.new_pdfs_found || 0,
                }
            })
        }, { retries: 3, onFailedAttempt: e => logger.warn({ err: e.message }, 'Retrying scraperLog insert') })
    } catch (err) {
        logger.error({ error: err.message }, 'Failed to write scraper_log after retries')
    }
}

export async function isPdfAlreadySeen(sha256) {
    try {
        const data = await prisma.pdfHash.findUnique({
            where: { hash: sha256 },
            select: { id: true },
        })
        return !!data
    } catch (error) {
        logger.warn({ error: error.message }, 'pdf_hashes lookup failed — treating as new')
        return false
    }
}

export async function recordPdfHash({ hash, source_url, site_id, storage_path }) {
    try {
        await pRetry(async () => {
            await prisma.pdfHash.upsert({
                where: { hash },
                update: { source_url, site_id, storage_path }, // Update if it existed somehow
                create: { hash, source_url, site_id, storage_path }
            })
        }, { retries: 3 })
    } catch (err) {
        logger.error({ error: err.message }, 'Failed to insert pdf_hashes row after retries')
    }
}

export async function uploadPdfToStorage(pdfBuffer, siteId, sha256) {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const storagePath = `${siteId}/${yyyy}/${mm}/${sha256}.pdf`

    try {
        return await pRetry(async () => {
            // Using our new valid R2 upload client hook
            return await uploadToR2(storagePath, pdfBuffer)
        }, { retries: 3 })
    } catch (err) {
        throw new Error(`R2 Storage upload failed: ${err.message}`)
    }
}

export async function recordIngestionLog(entry) {
    try {
        return await pRetry(async () => {
            const data = await prisma.pdfIngestionLog.create({
                data: {
                    pdf_hash: entry.pdf_hash,
                    site_id: entry.site_id ?? null,
                    source_url: entry.source_url ?? null,
                    storage_path: entry.storage_path ?? null,
                    link_text: entry.link_text ?? null,
                    context_text: entry.context_text ?? null,
                    status: entry.status ?? 'QUEUED',
                    ai_status: entry.ai_status ?? 'PENDING',
                    ai_error: entry.ai_error ?? null,
                    exam_id: entry.exam_id ?? null,
                    processing_time: entry.processing_time ?? null,
                }
            })
            return data.id
        }, { retries: 3 })
    } catch (err) {
        logger.error({ error: err.message }, 'Failed to insert pdf_ingestion_log after retries')
        return null
    }
}
