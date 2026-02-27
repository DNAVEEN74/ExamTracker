import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { Resend } from 'resend'
import { supabase } from '../config/supabase'
import { env } from '../config/env'
import * as razorpayService from '../services/razorpay.service'
import * as notificationService from '../services/notification.service'
import * as userService from '../services/user.service'
import { checkAndMarkIdempotent, acquireLock, releaseLock } from '../services/redis.service'

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

const router = Router()

// ─── Razorpay Webhook ────────────────────────────────────────────────────────

router.post('/razorpay', async (req: Request, res: Response) => {
    try {
        const signature = req.headers['x-razorpay-signature'] as string
        if (!signature) {
            return res.status(400).json({ success: false, error: 'Missing webhook signature' })
        }

        const rawBody = JSON.stringify(req.body)
        const isValid = razorpayService.verifyWebhookSignature(rawBody, signature)
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Invalid webhook signature' })
        }

        const { event, payload } = req.body

        switch (event) {
            case 'payment.captured': {
                const paymentEntity = payload?.payment?.entity
                const paymentId = paymentEntity?.id as string | undefined
                const userId = paymentEntity?.notes?.user_id
                const plan = paymentEntity?.notes?.plan as 'MONTHLY' | 'ANNUAL' | undefined

                if (userId && plan && paymentId) {
                    // Idempotency check — prevents replay attacks from re-crediting the same payment
                    const alreadyProcessed = await checkAndMarkIdempotent(`razorpay:payment:${paymentId}`)
                    if (alreadyProcessed) {
                        console.log(`[Razorpay] Duplicate payment.captured for ${paymentId} — skipping`)
                        break
                    }

                    const subscriptionEnd = razorpayService.computeSubscriptionEnd(plan)
                    await userService.updateSubscription(userId, {
                        subscription_tier: plan === 'ANNUAL' ? 'PREMIUM_ANNUAL' : 'PREMIUM',
                        subscription_start: new Date().toISOString(),
                        subscription_end: subscriptionEnd.toISOString(),
                        razorpay_customer_id: paymentEntity?.customer_id,
                    })
                }
                break
            }

            case 'subscription.cancelled': {
                const userId = payload?.subscription?.entity?.notes?.user_id
                if (userId) {
                    await userService.updateSubscription(userId, { subscription_tier: 'FREE' })
                }
                break
            }

            default:
                console.log(`Unhandled Razorpay event: ${event}`)
        }

        res.json({ success: true })
    } catch (err) {
        console.error('Razorpay webhook error:', err)
        res.status(500).json({ success: false, error: 'Webhook processing failed' })
    }
})

// ─── Resend Email Events Webhook ─────────────────────────────────────────────

router.post('/resend-events', async (req: Request, res: Response) => {
    try {
        const { type, data } = req.body

        switch (type) {
            case 'email.delivered':
                await supabase.from('notification_log')
                    .update({ status: 'DELIVERED', delivered_at: new Date().toISOString() })
                    .eq('resend_email_id', data.email_id)
                break

            case 'email.opened':
                await supabase.from('notification_log')
                    .update({ status: 'OPENED', opened_at: new Date().toISOString() })
                    .eq('resend_email_id', data.email_id)
                    .eq('status', 'DELIVERED')  // Don't downgrade from CLICKED
                break

            case 'email.clicked':
                await supabase.from('notification_log')
                    .update({ status: 'CLICKED', clicked_at: new Date().toISOString() })
                    .eq('resend_email_id', data.email_id)
                break

            case 'email.bounced': {
                await supabase.from('notification_log')
                    .update({ status: 'BOUNCED' })
                    .eq('resend_email_id', data.email_id)
                // Disable email for this user — hard bounce = invalid address
                const { data: logRow } = await supabase
                    .from('notification_log').select('user_id').eq('resend_email_id', data.email_id).maybeSingle()
                if (logRow?.user_id) {
                    await supabase.from('user_profiles')
                        .update({ email_notifications_enabled: false }).eq('user_id', logRow.user_id)
                }
                break
            }

            case 'email.spam_complained': {
                // CRITICAL: spam complaint → never email again
                await supabase.from('notification_log')
                    .update({ status: 'SPAM_COMPLAINED' })
                    .eq('resend_email_id', data.email_id)
                const { data: logRow } = await supabase
                    .from('notification_log').select('user_id').eq('resend_email_id', data.email_id).maybeSingle()
                if (logRow?.user_id) {
                    await supabase.from('user_profiles')
                        .update({ email_notifications_enabled: false }).eq('user_id', logRow.user_id)
                    console.error(`🚨 Spam complaint — email permanently disabled for user ${logRow.user_id}`)
                }
                break
            }
        }

        res.json({ success: true })
    } catch (err) {
        console.error('Resend events webhook error:', err)
        res.status(500).json({ success: false, error: 'Event processing failed' })
    }
})

// ─── Process Notifications (Supabase DB Webhook trigger) ─────────────────────
// This fires every time pg_cron inserts a row into notification_queue.
// ONE function handles all notification types: DEADLINE_7D, DEADLINE_1D, WEEKLY_DIGEST, NEW_EXAM.

router.post('/process-notifications', async (req: Request, res: Response) => {
    // ALWAYS return 200 to Supabase DB webhooks — otherwise it retries forever.
    // Use async processing with proper lock to ensure idempotency.

    const requestId = randomUUID()

    // Verify the internal webhook secret
    const secret = req.headers['x-webhook-secret']
    if (!secret || secret !== env.SUPABASE_WEBHOOK_SECRET) {
        console.warn('process-notifications: Invalid webhook secret')
        return res.status(200).json({ success: false, reason: 'invalid_secret' })
    }

    // Respond immediately — Supabase has a 5-second webhook timeout
    res.status(200).json({ success: true, request_id: requestId })

    // Process asynchronously after response is sent
    processNotificationQueue(requestId).catch((err) => {
        console.error('processNotificationQueue crash:', err)
    })
})

// ─── New PDF Webhook (scraper → backend → PDF parsing pipeline) ───────────────
// Fired by the scraper after a PDF is uploaded to Supabase Storage.
// Validates the payload, marks pdf_ingestion_log as PROCESSING, and begins parsing.
// Non-200 responses are safe — if this fails, the recovery pg_cron picks it up
// from pdf_ingestion_log WHERE status = 'QUEUED'.

router.post('/new-pdf', async (req: Request, res: Response) => {
    try {
        const secret = req.headers['x-scraper-secret']
        if (!secret || secret !== env.INTERNAL_API_SECRET) {
            return res.status(401).json({ success: false, error: 'Unauthorized' })
        }

        const {
            site_id,
            site_name,
            category,
            state,
            source_url,
            storage_path,
            link_text,
            context_text,
            pdf_hash,
            ingestion_log_id,
            scraped_at,
        } = req.body

        if (!source_url || !storage_path || !pdf_hash || !ingestion_log_id) {
            return res.status(400).json({
                success: false,
                error: 'source_url, storage_path, pdf_hash, and ingestion_log_id are all required',
            })
        }

        // Mark this ingestion row as PROCESSING so recovery cron doesn't double-queue
        await supabase
            .from('pdf_ingestion_log')
            .update({ status: 'PROCESSING' })
            .eq('id', ingestion_log_id)

        // Acknowledge immediately — the PDF is already in Storage.
        // Long parsing work happens asynchronously.
        res.json({ success: true, data: { ingestion_log_id, queued: true } })

        // ── Async PDF parsing pipeline ────────────────────────────────────────
        // The Python parser service handles this in production.
        // For now we log the event and leave the row in PROCESSING so the
        // Python service can pick it up from pdf_ingestion_log where status='PROCESSING'.
        console.log(`📄 New PDF queued for parsing:`, {
            site_id,
            site_name,
            pdf_hash: pdf_hash?.substring(0, 12),
            storage_path,
            link_text,
        })
        // TODO: When adding the Python parser microservice:
        //   await pythonParserService.enqueue({ ingestion_log_id, storage_path, context_text, category })

    } catch (err) {
        console.error('new-pdf webhook error:', err)
        res.status(500).json({ success: false, error: 'Failed to process new PDF webhook' })
    }
})

// ─── Notification Processing Engine ──────────────────────────────────────────

async function processNotificationQueue(requestId: string) {
    // 1. Acquire processing lock — Redis SET NX with auto-expiry
    // TTL of 4 minutes: if the process crashes mid-run, the lock expires automatically.
    // No need to manually clean up — unlike the DB-based processing_locks table.
    const lockAcquired = await acquireLock('notif_processor', 240, requestId)
    if (!lockAcquired) {
        console.log(`[${requestId}] Lock held by another instance — skipping`)
        return
    }

    try {
        // 2. Fetch all PENDING rows (up to 1000 per run)
        const { data: pendingRows, error: fetchError } = await supabase
            .from('notification_queue')
            .select('*')
            .eq('status', 'PENDING')
            .order('created_at', { ascending: true })
            .limit(1000)

        if (fetchError) {
            console.error(`[${requestId}] Failed to fetch pending queue:`, fetchError)
            return
        }

        if (!pendingRows || pendingRows.length === 0) {
            console.log(`[${requestId}] No pending notifications`)
            return
        }

        console.log(`[${requestId}] Processing ${pendingRows.length} notifications`)

        for (const row of pendingRows) {
            await processSingleUser(row, requestId)
            // 50ms delay between users = ~20 emails/second (well within Resend's limits)
            // 10,000 users = ~8 minutes, which is fine for 9 AM sends
            await sleep(50)
        }

    } finally {
        // Release the Redis lock so the next pg_cron trigger can process immediately
        await releaseLock('notif_processor', requestId)
        console.log(`[${requestId}] Processing complete, lock released`)
    }
}

async function processSingleUser(
    row: {
        id: string
        user_id: string
        user_email: string
        notification_type: string
        exam_ids: string[]
        attempts: number
    },
    requestId: string
) {
    // Mark as PROCESSING
    await supabase.from('notification_queue')
        .update({ status: 'PROCESSING', processed_at: new Date().toISOString(), attempts: row.attempts + 1 })
        .eq('id', row.id)

    try {
        // Fetch exam details for all exam_ids in this batch
        const { data: exams } = await supabase
            .from('exams')
            .select('id, name, short_name, application_end, vacancies_by_category, official_notification_url, category, conducting_body')
            .in('id', row.exam_ids)
            .order('application_end', { ascending: true })

        if (!exams || exams.length === 0) {
            // All exams may have been cancelled/deactivated since the cron ran
            await supabase.from('notification_queue').update({ status: 'SENT' }).eq('id', row.id)
            return
        }

        // Fetch user display name for personalisation
        const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('display_name, category')
            .eq('user_id', row.user_id)
            .maybeSingle()

        const displayName = (userProfile as any)?.display_name ?? 'Aspirant'
        const category = (userProfile as any)?.category ?? 'GENERAL'

        // Build personalised email
        const { subject, html } = buildEmail({
            displayName,
            category,
            exams,
            notificationType: row.notification_type,
        })

        if (!resend) {
            console.log(`[DEV] Would send email to ${row.user_email}: ${subject}`)
            await supabase.from('notification_queue').update({ status: 'SENT' }).eq('id', row.id)
            return
        }

        // Send via Resend
        const { data: emailData, error: sendError } = await resend.emails.send({
            from: env.RESEND_FROM_ALERTS,
            to: row.user_email,
            subject,
            html,
        })

        if (sendError || !emailData) {
            throw new Error(sendError?.message ?? 'Resend returned no data')
        }

        const resendEmailId = emailData.id

        // Write one notification_log row per exam in this batch (for deduplication tracking)
        const logRows = exams.map((exam) => ({
            user_id: row.user_id,
            exam_id: exam.id,
            notification_type: row.notification_type,
            channel: 'EMAIL',
            status: 'SENT',
            resend_email_id: resendEmailId,
            sent_at: new Date().toISOString(),
        }))

        // INSERT ... ON CONFLICT DO NOTHING (handles the dedup index gracefully)
        await supabase.from('notification_log').upsert(logRows, { onConflict: 'user_id,exam_id,notification_type', ignoreDuplicates: true })

        // Mark queue row as SENT
        await supabase.from('notification_queue')
            .update({ status: 'SENT', processed_at: new Date().toISOString() })
            .eq('id', row.id)

    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[${requestId}] Failed to send to ${row.user_email}:`, errorMsg)

        // Reset to PENDING so recovery cron can retry it
        await supabase.from('notification_queue')
            .update({ status: 'PENDING', failed_reason: errorMsg })
            .eq('id', row.id)
    }
}

// ─── Email Templates ──────────────────────────────────────────────────────────

function buildEmail(params: {
    displayName: string
    category: string
    exams: Array<{
        id: string
        name: string
        short_name: string | null
        application_end: string
        vacancies_by_category: Record<string, number> | null
        official_notification_url: string
        category: string
        conducting_body: string
    }>
    notificationType: string
}) {
    const { displayName, category, exams, notificationType } = params

    // Smart subject line (as per spec)
    let subject: string
    if (notificationType === 'NEW_EXAM') {
        subject = `✨ New exam you qualify for: ${exams[0]?.short_name ?? exams[0]?.name}`
    } else if (notificationType === 'WEEKLY_DIGEST') {
        subject = `📋 Your weekly exam digest — ${exams.length} open exam${exams.length > 1 ? 's' : ''} you qualify for`
    } else {
        const days = notificationType === 'DEADLINE_1D' ? 1 : 7
        if (exams.length === 1) {
            subject = `⚠️ ${exams[0].short_name ?? exams[0].name} closes in ${days} day${days > 1 ? 's' : ''}`
        } else if (exams.length === 2) {
            subject = `⚠️ 2 exam deadlines in ${days} day${days > 1 ? 's' : ''} — don't miss them`
        } else {
            subject = `⚠️ ${exams.length} exam deadlines approaching — check your list`
        }
    }

    // Category-specific vacancy for the user
    const getCategoryVacancy = (vacancies: Record<string, number> | null): string => {
        if (!vacancies) return 'Not announced'
        const key: Record<string, string> = {
            OBC_NCL: 'obc', SC: 'sc', ST: 'st', EWS: 'ews',
            GENERAL: 'general', OBC_CL: 'general',
        }
        const count = vacancies[key[category] ?? 'general']
        return count != null ? count.toLocaleString('en-IN') : 'Check notification'
    }

    const examRows = exams.map((exam) => {
        const deadline = new Date(exam.application_end).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric'
        })
        const vacancy = getCategoryVacancy(exam.vacancies_by_category as Record<string, number> | null)

        return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
            <div style="font-weight:600;color:#1a1a1a;margin-bottom:4px;">
              ${exam.name}
            </div>
            <div style="font-size:13px;color:#666;margin-bottom:6px;">
              ${exam.conducting_body}
            </div>
            <div style="font-size:13px;color:#e02020;font-weight:500;margin-bottom:6px;">
              📅 Apply by: ${deadline}
            </div>
            <div style="font-size:13px;color:#555;margin-bottom:8px;">
              🎯 Vacancies (your category): ${vacancy}
            </div>
            <a href="${exam.official_notification_url}"
               style="background:#2563eb;color:white;padding:7px 16px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:500;">
              View Notification →
            </a>
          </td>
        </tr>`
    }).join('')

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="max-width:560px;margin:32px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <div style="background:#2563eb;padding:24px 32px;">
          <div style="color:white;font-size:20px;font-weight:700;">ExamTracker</div>
          <div style="color:#93c5fd;font-size:13px;margin-top:4px;">Your personalised exam alerts</div>
        </div>

        <!-- Body -->
        <div style="padding:28px 32px;">
          <p style="margin:0 0 20px;font-size:15px;color:#1a1a1a;">Hi ${displayName},</p>

          ${notificationType.includes('DEADLINE')
            ? `<p style="margin:0 0 20px;font-size:15px;color:#555;">
                Here are the exams you qualify for with upcoming deadlines. Don't let them slip.
               </p>`
            : notificationType === 'NEW_EXAM'
                ? `<p style="margin:0 0 20px;font-size:15px;color:#555;">
                A new exam notification has been released that matches your profile.
               </p>`
                : `<p style="margin:0 0 20px;font-size:15px;color:#555;">
                Your weekly summary of open exams you qualify for.
               </p>`
        }

          <table style="width:100%;border-collapse:collapse;">
            ${examRows}
          </table>
        </div>

        <!-- Footer -->
        <div style="padding:20px 32px;background:#f9f9f9;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#999;text-align:center;">
            You're receiving this because you opted in to exam alerts on ExamTracker.<br>
            <a href="https://examtracker.in/preferences" style="color:#2563eb;">Manage preferences</a>
            &nbsp;·&nbsp;
            <a href="https://examtracker.in/unsubscribe" style="color:#999;">Unsubscribe</a>
          </p>
        </div>

      </div>
    </body>
    </html>`

    return { subject, html }
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export default router
