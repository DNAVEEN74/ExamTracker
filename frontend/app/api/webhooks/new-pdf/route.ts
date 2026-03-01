import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkAndMarkIdempotent } from '@/lib/redis'
import {
    downloadPdfFromStorage,
    deletePdfFromStorage,
    updateIngestionStatus,
} from '@/lib/services/pdf.service'
import {
    extractExamDataFromPdf,
    generateSlug,
    type ExtractionContext,
} from '@/lib/services/ai-parser.service'

// Node.js runtime — required for Buffer operations & timingSafeEqual
export const runtime = 'nodejs'
// Hobby tier max duration = 60 seconds (prevents AI extraction from timing out at 10s)
export const maxDuration = 60


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
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Fired by the scraper after uploading a new PDF to Supabase Storage.
 *
 * Pipeline (single AI step):
 *   1. Verify secret
 *   2. Idempotency check
 *   3. Download PDF bytes from Supabase Storage
 *   4. Send raw PDF → Gemini 2.0 Flash (reads it natively — digital + scanned)
 *   5. Validate + sanitise AI output
 *   6a. INSERT into exam_notifications (is_active: false — awaits admin approval)
 *   6b. Bulk INSERT into exam_posts (one row per extracted post)
 *   7. Update pdf_ingestion_log → DONE
 *   8. DELETE PDF from Storage  (SHA-256 hash stays in pdf_hashes forever → no re-scrape)
 *   9. Trigger eligibility matching RPC
 */
export async function POST(request: NextRequest) {
    // ── 1. Auth & Security ─────────────────────────────────────────────────────
    const expected = process.env.SCRAPER_WEBHOOK_SECRET
    if (!expected || expected.trim() === '') {
        console.error('[FATAL] SCRAPER_WEBHOOK_SECRET is not configured on the server')
        return NextResponse.json({ success: false, error: 'Internal server configuration error' }, { status: 500 })
    }

    const secret = request.headers.get('x-scraper-secret')
    if (!secret) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Safely compare secrets to prevent timing attacks
    const secretBuf = Buffer.from(secret)
    const expectedBuf = Buffer.from(expected)
    if (secretBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(secretBuf, expectedBuf)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    let payload: ScraperWebhookPayload
    try {
        payload = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }

    const { site_id, site_name, category, state, source_url, storage_path, link_text, context_text, pdf_hash, ingestion_log_id } = payload

    if (!storage_path || !pdf_hash) {
        return NextResponse.json({ success: false, error: 'storage_path and pdf_hash required' }, { status: 400 })
    }

    // Security: Prevents Path Traversal attacks (e.g. "../../../secrets.pdf")
    if (!/^([a-zA-Z0-9_\-]+)\/(\d{4})\/(\d{2})\/([a-f0-9]{64})\.pdf$/.test(storage_path)) {
        return NextResponse.json({ success: false, error: 'Invalid storage path format' }, { status: 400 })
    }

    console.log(`[new-pdf] ▶ ${site_id} | ${pdf_hash.slice(0, 12)}`)

    // ── 2. Idempotency ────────────────────────────────────────────────────────
    const alreadyProcessed = await checkAndMarkIdempotent(`pdf:${pdf_hash}`)
    if (alreadyProcessed) {
        return NextResponse.json({ success: true, skipped: true, reason: 'already_processed' })
    }

    // ── 3. Download PDF ───────────────────────────────────────────────────────
    let pdfBuffer: Buffer
    try {
        pdfBuffer = await downloadPdfFromStorage(storage_path)
    } catch (err) {
        console.error(`[new-pdf] Download failed (${storage_path}):`, (err as Error).message)
        if (ingestion_log_id) await updateIngestionStatus(ingestion_log_id, 'FAILED', { error_message: 'PDF download failed' })
        return NextResponse.json({ success: false, error: 'PDF download failed' }, { status: 500 })
    }

    const fileSizeKb = Math.round(pdfBuffer.length / 1024)
    console.log(`[new-pdf] Downloaded ${fileSizeKb}KB — processing...`)

    // Limit memory: Max 40MB PDF. Prevents Vercel serverless memory bomb (250MB limit)
    if (pdfBuffer.length > 40 * 1024 * 1024) {
        console.warn(`[new-pdf] PDF too large: ${fileSizeKb}KB`)
        if (ingestion_log_id) await updateIngestionStatus(ingestion_log_id, 'SKIPPED', { error_message: 'PDF exceeds 40MB limit' })
        // Delete huge file from storage to save space, skip processing
        await deletePdfFromStorage(storage_path)
        return NextResponse.json({ success: true, skipped: true, reason: 'pdf_too_large' })
    }

    // ── 4. AI Extraction (single step — Gemini reads PDF natively) ─────────────
    const ctx: ExtractionContext = {
        siteId: site_id,
        siteName: site_name,
        category,
        state: state ?? null,
        sourceUrl: source_url,
        linkText: link_text ?? null,
        contextText: context_text ?? null,
    }

    const parsed = await extractExamDataFromPdf(pdfBuffer, ctx)

    if (!parsed) {
        console.error(`[new-pdf] AI extraction returned null for ${pdf_hash.slice(0, 12)}`)
        if (ingestion_log_id) await updateIngestionStatus(ingestion_log_id, 'FAILED', { error_message: 'AI extraction failed' })
        // CRITICAL BUG FIX: We DO NOT delete the PDF if AI extraction fails. 
        // This allows a cron or admin to retry later. Hash dedup won't redownload it, 
        // but the file stays in storage so we don't lose the exam.
        return NextResponse.json({ success: false, error: 'AI extraction failed' }, { status: 500 })
    }

    console.log(`[new-pdf] ✦ "${parsed.name}" | conf: ${parsed.extraction_confidence} | model: ${parsed.ai_model_used}`)

    // ── 5. Insert into exam_notifications & exam_posts ───────────────────────
    const uniqueSuffix = crypto.randomUUID().split('-')[0]
    const slug = `${generateSlug(parsed.name).slice(0, 80)}-${uniqueSuffix}`
    let notificationId: string | null = null

    try {
        // 5a. Insert Parent Notification
        const { data: notification, error: notifErr } = await supabaseAdmin
            .from('exam_notifications')
            .insert({
                slug,
                name: parsed.name,
                short_name: parsed.short_name,
                notification_number: parsed.notification_number,
                category: parsed.category,
                conducting_body: parsed.conducting_body,
                level: parsed.level,
                state_code: parsed.state_code,
                notification_date: parsed.notification_date,
                application_start: parsed.application_start,
                application_end: parsed.application_end,
                last_date_fee_payment: parsed.last_date_fee_payment,
                correction_window_start: parsed.correction_window_start,
                correction_window_end: parsed.correction_window_end,
                official_notification_url: parsed.official_notification_url,
                syllabus_url: parsed.syllabus_url,
                previous_papers_url: parsed.previous_papers_url,
                has_multiple_posts: parsed.posts.length > 1,
                total_posts_count: parsed.posts.length,
                data_source: 'SCRAPER',
                notification_verified: false,
                is_active: false, // Waits for admin approval
            })
            .select('id')
            .single()

        if (notifErr) {
            if (notifErr.code === '23505') {
                // Duplicate slug — the notification was already processed by a prior run.
                // Return early so we don't proceed with notificationId=null and mark log as DONE with null exam_id.
                console.warn(`[new-pdf] Duplicate slug "${slug}" — notification already exists, skipping`)
                if (ingestion_log_id) await updateIngestionStatus(ingestion_log_id, 'DONE', { error_message: 'Duplicate notification (already processed)' })
                return NextResponse.json({ success: true, skipped: true, reason: 'duplicate_notification' })
            } else {
                throw new Error(notifErr.message)
            }
        } else {
            notificationId = notification?.id ?? null
            console.log(`[new-pdf] ✅ Notification saved: ${notificationId}`)
        }

        // 5b. Insert Child Posts (if parent succeeded)
        if (notificationId && parsed.posts.length > 0) {
            const postsToInsert = parsed.posts.map((post: any, idx: number) => ({
                notification_id: notificationId,
                post_name: post.post_name,
                post_code: post.post_code,
                post_slug: `${slug}-p${idx + 1}-${crypto.randomUUID().split('-')[0]}`,
                total_vacancies: post.total_vacancies,
                vacancies_by_category: post.vacancies_by_category,
                vacancies_by_location: post.vacancies_by_location,
                min_age: post.min_age,
                max_age_general: post.max_age_general,
                max_age_obc: post.max_age_obc,
                max_age_sc_st: post.max_age_sc_st,
                max_age_ews: post.max_age_ews,
                max_age_pwd_general: post.max_age_pwd_general,
                max_age_pwd_obc: post.max_age_pwd_obc,
                max_age_pwd_sc_st: post.max_age_pwd_sc_st,
                max_age_ex_serviceman: post.max_age_ex_serviceman,
                age_cutoff_date: post.age_cutoff_date,
                required_qualification: post.required_qualification,
                required_streams: post.required_streams,
                min_marks_percentage: post.min_marks_percentage,
                allows_final_year: post.allows_final_year,
                required_certifications: post.required_certifications,
                nationality_requirement: post.nationality_requirement,
                domicile_required: post.domicile_required,
                gender_restriction: post.gender_restriction,
                marital_status_requirement: post.marital_status_requirement,
                physical_requirements: post.physical_requirements,
                application_fee_general: post.application_fee_general,
                application_fee_obc: post.application_fee_obc,
                application_fee_sc_st: post.application_fee_sc_st,
                application_fee_ews: post.application_fee_ews,
                application_fee_pwd: post.application_fee_pwd,
                application_fee_women: post.application_fee_women,
                application_fee_ex_serviceman: post.application_fee_ex_serviceman,
                fee_payment_mode: post.fee_payment_mode,
                exam_mode: post.exam_mode,
                application_mode: post.application_mode,
                apply_online_url: post.apply_online_url,
                exam_stages: post.exam_stages,
                exam_date: post.exam_date,
                exam_duration_minutes: post.exam_duration_minutes,
                admit_card_date: post.admit_card_date,
                result_date: post.result_date,
                exam_cities: post.exam_cities,
                exam_cities_note: post.exam_cities_note,
                can_choose_exam_center: post.can_choose_exam_center,
                selection_process: post.selection_process,
                pay_scale: post.pay_scale,
                pay_matrix_level: post.pay_matrix_level,
                grade_pay: post.grade_pay,
                probation_period_months: post.probation_period_months,
                service_bond_required: post.service_bond_required,
                service_bond_years: post.service_bond_years,
                service_bond_amount: post.service_bond_amount,
                posting_location_preference: post.posting_location_preference,
                transfer_policy: post.transfer_policy,
                required_documents: post.required_documents,
                has_special_reservation_rules: post.has_special_reservation_rules,
                reservation_rules: post.reservation_rules,
                is_active: false, // Waits for admin approval
                display_order: idx + 1,
            }))

            const { error: postsErr } = await supabaseAdmin
                .from('exam_posts')
                .insert(postsToInsert)

            if (postsErr) {
                console.error(`[new-pdf] Posts insert failed for ${notificationId}:`, postsErr.message)
                // Rollback: delete orphaned parent notification so admin doesn't see a notification with 0 posts
                const { error: rollbackErr } = await supabaseAdmin.from('exam_notifications').delete().eq('id', notificationId)
                if (rollbackErr) console.error(`[new-pdf] Rollback also failed for ${notificationId}:`, rollbackErr.message)
                else console.warn(`[new-pdf] ⚠️ Rolled back orphaned notification ${notificationId}`)
                throw new Error(`Posts insert failed (parent rolled back): ${postsErr.message}`)
            } else {
                console.log(`[new-pdf] ✅ ${postsToInsert.length} posts saved for ${notificationId}`)
            }
        }
    } catch (err) {
        console.error('[new-pdf] DB insert failed:', (err as Error).message)
        if (ingestion_log_id) await updateIngestionStatus(ingestion_log_id, 'FAILED', { error_message: (err as Error).message })
        // DO NOT delete PDF on DB failure. Keep it for manual recovery.
        return NextResponse.json({ success: false, error: 'DB insert failed' }, { status: 500 })
    }

    // ── 6. Update ingestion log ────────────────────────────────────────────────
    if (ingestion_log_id) {
        await updateIngestionStatus(ingestion_log_id, 'DONE', {
            // Note: DB structure for ingestion log might still use 'exam_id' term, we pass the notification ID
            exam_id: notificationId,
            file_size_bytes: pdfBuffer.length,
            ai_model: parsed.ai_model_used,
            extraction_confidence: parsed.extraction_confidence,
        })
    }

    // ── 7. Delete PDF from Storage ────────────────────────────────────────────
    // PDF hash in pdf_hashes table stays FOREVER → prevents re-scraping.
    // File itself is deleted — no long-term storage cost.
    const deleted = await deletePdfFromStorage(storage_path)
    console.log(`[new-pdf] Storage cleanup: ${deleted ? '✅ deleted' : '⚠️ delete failed (non-fatal)'}`)

    // ── 8. Trigger eligibility matching (Note: queue_new_exam_notification needs updating to handle notification IDs)
    if (notificationId && parsed.extraction_confidence !== 'LOW') {
        const { error } = await supabaseAdmin.rpc('queue_new_exam_notification', { p_exam_id: notificationId })
        if (error) {
            console.warn('[new-pdf] Eligibility queue RPC failed (non-fatal):', error.message)
        } else {
            console.log(`[new-pdf] 📣 Eligibility matching queued for notification ${notificationId}`)
        }
    }

    // Return a minimal, secure response
    return NextResponse.json({
        success: true,
        exam_id: notificationId,
    })
}
