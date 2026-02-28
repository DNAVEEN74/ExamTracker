import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkAndMarkIdempotent } from '@/lib/redis'
import {
    downloadPdfFromStorage,
    extractTextFromPdf,
    deletePdfFromStorage,
    updateIngestionStatus,
} from '@/lib/services/pdf.service'
import {
    extractExamDataFromText,
    generateSlug,
    type ExtractionContext,
} from '@/lib/services/ai-parser.service'

// Force Node.js runtime — required for pdf-parse binary processing
export const runtime = 'nodejs'

interface ScraperWebhookPayload {
    site_id: string
    site_name: string
    category: string
    state?: string | null
    source_url: string
    storage_path: string
    link_text?: string | null
    context_text?: string | null
    pdf_hash: string
    ingestion_log_id?: string | null
    scraped_at: string
}

/**
 * POST /api/webhooks/new-pdf
 * Called by the scraper after uploading a new PDF to Supabase Storage.
 * Pipeline: Download → Extract text → AI parse → Insert exam → Delete PDF
 */
export async function POST(request: NextRequest) {
    // ── 1. Verify internal webhook secret ─────────────────────────────────────
    const secret = request.headers.get('x-scraper-secret')
    const expected = process.env.SCRAPER_WEBHOOK_SECRET
    if (expected && secret !== expected) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    let payload: ScraperWebhookPayload
    try {
        payload = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const { site_id, site_name, category, state, source_url, storage_path, link_text, context_text, pdf_hash, ingestion_log_id } = payload

    if (!storage_path || !pdf_hash) {
        return NextResponse.json({ success: false, error: 'storage_path and pdf_hash are required' }, { status: 400 })
    }

    console.log(`[new-pdf] → ${site_id} | hash: ${pdf_hash.slice(0, 12)}`)

    // ── 2. Idempotency — prevent double-processing on webhook retry ────────────
    const alreadyProcessed = await checkAndMarkIdempotent(`pdf:${pdf_hash}`)
    if (alreadyProcessed) {
        console.log(`[new-pdf] Already processed ${pdf_hash.slice(0, 12)} — skip`)
        return NextResponse.json({ success: true, skipped: true, reason: 'already_processed' })
    }

    // ── 3. Download PDF from Supabase Storage ──────────────────────────────────
    let pdfBuffer: Buffer
    try {
        pdfBuffer = await downloadPdfFromStorage(storage_path)
    } catch (err) {
        console.error(`[new-pdf] PDF download failed (${storage_path}):`, (err as Error).message)
        if (ingestion_log_id) await updateIngestionStatus(ingestion_log_id, 'FAILED', { error_message: 'PDF download failed' })
        return NextResponse.json({ success: false, error: 'PDF download failed' }, { status: 500 })
    }

    // ── 4. Extract text ────────────────────────────────────────────────────────
    const { text, pageCount, isTextBased, fileSizeBytes } = await extractTextFromPdf(pdfBuffer)

    console.log(`[new-pdf] ${site_id} — ${pageCount}pp, ${Math.round(fileSizeBytes / 1024)}KB, text: ${isTextBased ? 'YES' : 'SCANNED'}, chars: ${text.length}`)

    if (!isTextBased || text.length < 100) {
        // TODO: OCR fallback with Google Vision / Tesseract for scanned PDFs
        console.warn(`[new-pdf] PDF appears to be scanned (${pdf_hash.slice(0, 12)}) — OCR not yet implemented`)
        if (ingestion_log_id) {
            await updateIngestionStatus(ingestion_log_id, 'SKIPPED', {
                error_message: 'Scanned PDF — OCR not yet implemented',
                page_count: pageCount,
                file_size_bytes: fileSizeBytes,
            })
        }
        // Still delete — no point keeping unreadable file
        await deletePdfFromStorage(storage_path)
        return NextResponse.json({ success: true, skipped: true, reason: 'scanned_pdf_no_ocr' })
    }

    // ── 5. AI Extraction ───────────────────────────────────────────────────────
    const ctx: ExtractionContext = {
        siteId: site_id,
        siteName: site_name,
        category,
        state: state ?? null,
        sourceUrl: source_url,
        linkText: link_text ?? null,
        contextText: context_text ?? null,
    }

    const parsed = await extractExamDataFromText(text, ctx)

    if (!parsed) {
        console.error(`[new-pdf] AI extraction returned null for ${pdf_hash.slice(0, 12)}`)
        if (ingestion_log_id) await updateIngestionStatus(ingestion_log_id, 'FAILED', { error_message: 'AI extraction failed or returned no data' })
        await deletePdfFromStorage(storage_path)
        return NextResponse.json({ success: false, error: 'AI extraction failed' }, { status: 500 })
    }

    console.log(`[new-pdf] AI extracted: "${parsed.name}" | conf: ${parsed.extraction_confidence} | provider: ${parsed.ai_provider_used}`)

    // ── 6. Insert into exams table ────────────────────────────────────────────
    const slug = generateSlug(parsed.name)
    let examId: string | null = null

    try {
        const { data: exam, error: examErr } = await supabaseAdmin
            .from('exams')
            .insert({
                slug,
                name: parsed.name,
                short_name: parsed.short_name,
                conducting_body: parsed.conducting_body,
                category: parsed.category,
                level: parsed.level,
                state_code: parsed.state_code,
                total_vacancies: parsed.total_vacancies,
                vacancies_by_category: parsed.vacancies_by_category,
                notification_date: parsed.notification_date,
                application_start: parsed.application_start,
                application_end: parsed.application_end,
                exam_date: parsed.exam_date,
                admit_card_date: parsed.admit_card_date,
                result_date: parsed.result_date,
                min_age: parsed.min_age,
                max_age_general: parsed.max_age_general,
                max_age_obc: parsed.max_age_obc,
                max_age_sc_st: parsed.max_age_sc_st,
                max_age_ews: parsed.max_age_ews,
                max_age_pwd_general: parsed.max_age_pwd_general,
                max_age_pwd_obc: parsed.max_age_pwd_obc,
                max_age_pwd_sc_st: parsed.max_age_pwd_sc_st,
                max_age_ex_serviceman: parsed.max_age_ex_serviceman,
                age_cutoff_date: parsed.age_cutoff_date,
                required_qualification: parsed.required_qualification,
                required_streams: parsed.required_streams,
                min_marks_percentage: parsed.min_marks_percentage,
                allows_final_year: parsed.allows_final_year,
                nationality_requirement: parsed.nationality_requirement,
                gender_restriction: parsed.gender_restriction,
                physical_requirements: parsed.physical_requirements,
                marital_status_requirement: parsed.marital_status_requirement,
                application_fee_general: parsed.application_fee_general,
                application_fee_sc_st: parsed.application_fee_sc_st,
                application_fee_pwd: parsed.application_fee_pwd,
                application_fee_women: parsed.application_fee_women,
                fee_payment_mode: parsed.fee_payment_mode,
                official_notification_url: parsed.official_notification_url,
                description: parsed.description,
                syllabus_summary: parsed.syllabus_summary,
                selection_process: parsed.selection_process,
                // Metadata
                data_source: 'SCRAPER',
                notification_verified: false,    // Admin must approve before going ACTIVE
                is_active: false,
                created_by: null,
            })
            .select('id')
            .single()

        if (examErr) {
            // Duplicate slug is OK — race condition on concurrent runs
            if (examErr.code === '23505') {
                console.warn(`[new-pdf] Duplicate exam slug "${slug}" — likely same notification scraped twice`)
            } else {
                throw new Error(examErr.message)
            }
        } else {
            examId = exam?.id ?? null
            console.log(`[new-pdf] ✅ Exam inserted: ${examId} — "${parsed.name}"`)
        }
    } catch (err) {
        console.error(`[new-pdf] Exam insert failed:`, (err as Error).message)
        if (ingestion_log_id) {
            await updateIngestionStatus(ingestion_log_id, 'FAILED', {
                error_message: `DB insert failed: ${(err as Error).message}`,
            })
        }
        // Still delete the PDF — if insert fails on retry the PDF is already gone,
        // but the pdf_hashes dedup won't let the scraper re-download it anyway.
        await deletePdfFromStorage(storage_path)
        return NextResponse.json({ success: false, error: 'Failed to save exam to database' }, { status: 500 })
    }

    // ── 7. Update ingestion log ────────────────────────────────────────────────
    if (ingestion_log_id) {
        await updateIngestionStatus(ingestion_log_id, 'DONE', {
            exam_id: examId,
            page_count: pageCount,
            file_size_bytes: fileSizeBytes,
            ai_provider: parsed.ai_provider_used,
            extraction_confidence: parsed.extraction_confidence,
        })
    }

    // ── 8. Delete PDF from Storage (hash preserved in pdf_hashes table) ────────
    // The SHA-256 hash in pdf_hashes table lives FOREVER → prevents re-scraping.
    // The actual file is deleted now — no need to store PDFs long-term.
    const deleted = await deletePdfFromStorage(storage_path)
    console.log(`[new-pdf] Storage cleanup: ${deleted ? '✅ deleted' : '⚠️ delete failed (non-fatal)'}`)

    // ── 9. Trigger eligibility matching pg_cron-style via RPC (non-blocking) ──
    // The pg_cron job will pick this up automatically, but we can also kick
    // an immediate match attempt for responsive UX on high-priority exams.
    if (examId && parsed.extraction_confidence === 'HIGH') {
        supabaseAdmin.rpc('queue_new_exam_notification', { p_exam_id: examId })
            .then(({ error }) => {
                if (error) console.warn(`[new-pdf] queue RPC failed (non-fatal):`, error.message)
                else console.log(`[new-pdf] 📣 Eligibility match queued for exam ${examId}`)
            })
    }

    return NextResponse.json({
        success: true,
        exam_id: examId,
        name: parsed.name,
        confidence: parsed.extraction_confidence,
        provider: parsed.ai_provider_used,
        pdf_deleted: deleted,
    })
}
