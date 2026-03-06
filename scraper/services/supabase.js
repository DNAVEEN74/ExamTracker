import { createClient } from '@supabase/supabase-js'
import pRetry from 'p-retry'
import { CONFIG } from '../config/index.js'
import { logger } from '../utils/logger.js'

export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
)

export const hashCache = new Map()

export async function preloadHashes(siteIds) {
    if (!siteIds.length) return
    const { data, error } = await supabase
        .from('scraper_log')
        .select('site_id, content_hash')
        .in('site_id', siteIds)
        .order('scraped_at', { ascending: false })
        .limit(2000)

    if (error) {
        logger.error({ error: error.message }, 'Failed to preload hashes')
        return
    }

    for (const row of data) {
        if (row.content_hash && !hashCache.has(row.site_id)) {
            hashCache.set(row.site_id, row.content_hash)
        }
    }
}

export async function getLastContentHash(siteId) {
    return hashCache.get(siteId) ?? null
}

export async function writeScraperLog(entry) {
    try {
        await pRetry(async () => {
            const { error } = await supabase.from('scraper_log').insert({
                ...entry,
                scraped_at: new Date().toISOString(),
            })
            if (error) throw error
        }, { retries: 3, onFailedAttempt: e => logger.warn({ err: e.message }, 'Retrying scraper_log insert') })
    } catch (err) {
        logger.error({ error: err.message }, 'Failed to write scraper_log after retries')
    }
}

export async function isPdfAlreadySeen(sha256) {
    const { data, error } = await supabase
        .from('pdf_hashes')
        .select('id')
        .eq('hash', sha256)
        .maybeSingle()
    if (error) {
        logger.warn({ error: error.message }, 'pdf_hashes lookup failed — treating as new')
        return false
    }
    return !!data
}

export async function recordPdfHash({ hash, source_url, site_id, storage_path }) {
    try {
        await pRetry(async () => {
            const { error } = await supabase.from('pdf_hashes').upsert(
                { hash, source_url, site_id, storage_path },
                { onConflict: 'hash', ignoreDuplicates: true }
            )
            if (error) throw error
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
            const { error } = await supabase.storage
                .from(CONFIG.storage.bucket)
                .upload(storagePath, pdfBuffer, {
                    contentType: 'application/pdf',
                    upsert: false,
                })

            if (error) {
                if (error.message?.includes('already exists')) {
                    logger.debug({ storagePath }, 'PDF already in Storage (hash match)')
                    return storagePath
                }
                throw new Error(`Supabase Storage upload failed: ${error.message}`)
            }

            return storagePath
        }, { retries: 3 })
    } catch (err) {
        throw err
    }
}

export async function recordIngestionLog(entry) {
    try {
        return await pRetry(async () => {
            const { data, error } = await supabase
                .from('pdf_ingestion_log')
                .insert(entry)
                .select('id')
                .single()
            if (error) throw error
            return data.id
        }, { retries: 3 })
    } catch (err) {
        logger.error({ error: err.message }, 'Failed to insert pdf_ingestion_log after retries')
        return null
    }
}
