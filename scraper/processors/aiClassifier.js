/**
 * AI Classifier — Tier 1 of the 3-tier scraper pipeline
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Classifies a government notification PDF into structured types
 * using the headline text + first page of the PDF as input to Gemini.
 *
 * Classification types (future-proofed for expand beyond recruitment):
 *   RECRUITMENT   → New exam/job notification with vacancies  (→ full AI parse + DB)
 *   RESULT        → Exam results, merit lists                 (→ future: notify users)
 *   ADMIT_CARD    → Hall tickets, exam city/centre schedule   (→ future: notify users)
 *   ANSWER_KEY    → Tentative/provisional answer keys         (→ skip)
 *   SYLLABUS      → Exam patterns, syllabi                    (→ skip)
 *   CORRIGENDUM   → Corrections/amendments                    (→ skip)
 *   OTHER         → RFPs, tenders, office orders, circulars   (→ skip)
 *
 * Rate limiting (env-driven, zero code change needed when upgrading API key):
 *   GEMINI_CLASSIFIER_RPM=10   → free tier key (default, 10 calls/min = 6s gap)
 *   GEMINI_CLASSIFIER_RPM=100  → pay-as-you-go key (100 calls/min = 600ms gap)
 *   GEMINI_CLASSIFIER_RPM=2000 → high-throughput key (2000 calls/min = 30ms gap)
 *
 * Just replace GEMINI_API_KEY and set GEMINI_CLASSIFIER_RPM in .env.
 * No code changes required.
 */


import { GoogleGenerativeAI } from '@google/generative-ai'
import pLimit from 'p-limit'
import { CONFIG } from '../config/index.js'
import { logger } from '../utils/logger.js'

// Classification type constants
export const DOC_TYPE = {
    RECRUITMENT: 'RECRUITMENT',
    RESULT: 'RESULT',
    ADMIT_CARD: 'ADMIT_CARD',
    ANSWER_KEY: 'ANSWER_KEY',
    SYLLABUS: 'SYLLABUS',
    CORRIGENDUM: 'CORRIGENDUM',
    OTHER: 'OTHER',
}

// Types that should be forwarded to the full AI parser + database
export const SHOULD_PARSE_TYPES = new Set([DOC_TYPE.RECRUITMENT])

// Rate limiter: serialise all Gemini calls, with a calculated gap between each.
//
// The gap is derived from GEMINI_CLASSIFIER_RPM (requests per minute):
//   RPM 10  = 6000ms gap  ← free tier key (default)
//   RPM 100 = 600ms gap   ← pay-as-you-go key
//   RPM 500 = 120ms gap   ← high-volume key
//
// To upgrade: just set GEMINI_API_KEY + GEMINI_CLASSIFIER_RPM in .env. Zero code change.
const CLASSIFIER_RPM = parseInt(process.env.GEMINI_CLASSIFIER_RPM || '10', 10)
const GEMINI_CALL_GAP_MS = Math.ceil(60_000 / CLASSIFIER_RPM) // e.g. 60000/10 = 6000ms
const geminiLimit = pLimit(1) // Only 1 Gemini call at a time — gap logic enforces RPM

let _lastGeminiCallAt = 0
async function waitForGeminiGap() {
    const sinceLast = Date.now() - _lastGeminiCallAt
    if (sinceLast < GEMINI_CALL_GAP_MS) {
        await new Promise(r => setTimeout(r, GEMINI_CALL_GAP_MS - sinceLast))
    }
    _lastGeminiCallAt = Date.now()
}

const CLASSIFY_PROMPT = `You are a classification engine for Indian government notification PDFs.

Given the headline text and the first page of a PDF, classify the document into EXACTLY one of these types:

- RECRUITMENT: A NEW recruitment/job notification with open vacancies. Must be a fresh announcement calling for applications (e.g., "Combined Graduate Level Examination, 2026 — Notification for Recruitment of...").
- RESULT: Exam results, final merit lists, marks statements, waitlists.
- ADMIT_CARD: Hall tickets, exam city/shift/date announcements, call letters.
- ANSWER_KEY: Provisional or final answer keys, response sheets, challenge windows.
- SYLLABUS: Exam syllabus, pattern, scheme of examination.
- CORRIGENDUM: Corrections, amendments, addenda, modifications to any existing notice.
- OTHER: Anything else — RFPs, tenders, office orders, RTI, circulars, tentative vacancies, option forms, status updates, RFIs, empanelment notices, seniority lists, etc.

CRITICAL RULES:
- "Tentative Vacancies" = OTHER (draft update, NOT open recruitment)
- "Final Vacancies" = OTHER (vacancy list after notification, not the notification itself)
- "Revised Vacancies" = OTHER
- "Option Form" or "Preference Form" = OTHER
- Only mark RECRUITMENT if applications are actively being invited right now
- Hindi PDFs: read both languages, classify based on document purpose

Return ONLY valid JSON with no explanation:
{ "type": "RECRUITMENT|RESULT|ADMIT_CARD|ANSWER_KEY|SYLLABUS|CORRIGENDUM|OTHER", "confidence": "HIGH|LOW", "reason": "one sentence" }`

/**
 * Classify a notification PDF using headline + first page.
 * Serialised via pLimit(1) to avoid Gemini rate limits.
 *
 * @param {object} params
 * @param {string} params.headline  - The notice title/headline
 * @param {Buffer} params.pdfBuffer - Full PDF buffer (first 60KB is sent)
 * @param {string} params.siteId    - Site ID for logging
 * @param {string} params.siteName  - Site name for logging
 * @returns {Promise<{type: string, confidence: string, reason: string}>}
 */
export async function classifyNotification({ headline, pdfBuffer, siteId, siteName }) {
    const apiKey = CONFIG.geminiApiKey
    if (!apiKey) {
        logger.warn({ siteId }, 'GEMINI_API_KEY not set — skipping classification, defaulting to RECRUITMENT')
        return { type: DOC_TYPE.RECRUITMENT, confidence: 'LOW', reason: 'No API key — classification skipped' }
    }

    // Serialise all Gemini calls through the rate limiter
    return geminiLimit(async () => {
        await waitForGeminiGap()

        // First 60KB only — covers the first page of any PDF, much cheaper than full file
        const firstPageBytes = pdfBuffer.length > 60_000 ? pdfBuffer.slice(0, 60_000) : pdfBuffer
        const prompt = `${CLASSIFY_PROMPT}\n\nHeadline: "${headline}"\nSite: ${siteName} (${siteId})`

        try {
            const genAI = new GoogleGenerativeAI(apiKey)
            const model = genAI.getGenerativeModel({
                model: 'gemini-2.0-flash',
                generationConfig: {
                    responseMimeType: 'application/json',
                    temperature: 0.05,
                    maxOutputTokens: 128,
                },
            })

            const response = await model.generateContent([
                { inlineData: { mimeType: 'application/pdf', data: firstPageBytes.toString('base64') } },
                { text: prompt },
            ])

            const raw = response.response.text().trim()
            const cleaned = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
            const result = JSON.parse(cleaned)

            if (!DOC_TYPE[result.type]) {
                logger.warn({ siteId, headline: headline.slice(0, 60), raw }, 'Classifier returned unknown type — defaulting to OTHER')
                return { type: DOC_TYPE.OTHER, confidence: 'LOW', reason: `Unknown type: ${result.type}` }
            }

            logger.info(
                { siteId, type: result.type, confidence: result.confidence, headline: headline.slice(0, 60) },
                `🏷️  Classified: ${result.type} [${result.confidence}] — ${result.reason}`
            )
            return result

        } catch (err) {
            // Fail open: treat as RECRUITMENT so real notifications are never dropped
            logger.warn({ siteId, err: err.message }, 'AI classifier failed — defaulting to RECRUITMENT (fail open)')
            return { type: DOC_TYPE.RECRUITMENT, confidence: 'LOW', reason: `Classifier error: ${err.message}` }
        }
    })
}
