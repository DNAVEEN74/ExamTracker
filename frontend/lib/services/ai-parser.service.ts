/**
 * AI Parser Service — Gemini Native PDF Understanding
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Sends the raw PDF bytes directly to Gemini 2.0 Flash.
 * No pdf-parse, no text extraction, no OCR step.
 * Gemini reads the full PDF natively — handles digital + scanned.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface ParsedPost {
    post_name: string
    post_code: string | null
    total_vacancies: number | null
    vacancies_by_category: Record<string, number> | null
    vacancies_by_location: Record<string, Record<string, number>> | null
    min_age: number | null
    max_age_general: number | null
    max_age_obc: number | null
    max_age_sc_st: number | null
    max_age_ews: number | null
    max_age_pwd_general: number | null
    max_age_pwd_obc: number | null
    max_age_pwd_sc_st: number | null
    max_age_ex_serviceman: number | null
    age_cutoff_date: string | null
    required_qualification: 'CLASS_10' | 'CLASS_12' | 'ITI' | 'DIPLOMA' | 'GRADUATE_ANY' | 'GRADUATE_SPECIFIC' | 'POST_GRADUATE' | 'DOCTORATE' | 'PROFESSIONAL' | 'ANY'
    required_streams: string[] | null
    min_marks_percentage: number | null
    allows_final_year: boolean
    required_certifications: string[] | null
    nationality_requirement: 'INDIAN' | 'NEPAL_BHUTAN' | 'PIO' | 'OCI'
    domicile_required: string | null
    gender_restriction: 'MALE' | 'FEMALE' | 'THIRD_GENDER' | 'PREFER_NOT_TO_SAY' | null
    marital_status_requirement: 'UNMARRIED' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | null
    physical_requirements: Record<string, unknown> | null
    application_fee_general: number | null
    application_fee_obc: number | null
    application_fee_sc_st: number | null
    application_fee_ews: number | null
    application_fee_pwd: number | null
    application_fee_women: number | null
    application_fee_ex_serviceman: number | null
    fee_payment_mode: string[] | null
    exam_mode: string | null
    application_mode: string[] | null
    apply_online_url: string | null
    exam_stages: Record<string, unknown> | null
    exam_date: string | null
    exam_duration_minutes: number | null
    admit_card_date: string | null
    result_date: string | null
    exam_cities: string[] | null
    exam_cities_note: string | null
    can_choose_exam_center: boolean
    selection_process: Record<string, unknown> | null
    pay_scale: string | null
    pay_matrix_level: string | null
    grade_pay: number | null
    probation_period_months: number | null
    service_bond_required: boolean
    service_bond_years: number | null
    service_bond_amount: number | null
    posting_location_preference: boolean
    transfer_policy: string | null
    required_documents: Record<string, unknown> | null
    has_special_reservation_rules: boolean
    reservation_rules: Record<string, unknown> | null
}

export interface ParsedExamNotification {
    name: string
    short_name: string | null
    notification_number: string | null
    conducting_body: string
    category: 'SSC' | 'RAILWAY' | 'BANKING' | 'UPSC_CIVIL' | 'STATE_PSC' | 'DEFENCE' | 'POLICE' | 'TEACHING' | 'PSU' | 'OTHER'
    level: 'CENTRAL' | 'STATE' | 'PSU' | 'DEFENCE' | 'BANKING'
    state_code: string | null
    notification_date: string | null
    application_start: string | null
    application_end: string
    last_date_fee_payment: string | null
    correction_window_start: string | null
    correction_window_end: string | null
    official_notification_url: string
    syllabus_url: string | null
    previous_papers_url: string | null
    extraction_confidence: 'HIGH' | 'MEDIUM' | 'LOW'
    extraction_notes: string | null
    ai_model_used?: string
    posts: ParsedPost[]
}

export interface ExtractionContext {
    siteId: string
    siteName: string
    category: string
    state: string | null
    sourceUrl: string
    linkText: string | null
    contextText: string | null
}

// ─── Extraction Prompt ────────────────────────────────────────────────────────

function buildPrompt(ctx: ExtractionContext): string {
    const today = new Date().toISOString().split('T')[0]
    const safeUrl = ctx.sourceUrl.replace(/[\r\n`]/g, '')

    return `You are an expert Indian government exam data extraction engine. Read the attached PDF recruitment notification and extract ALL structured data into the exact JSON schema below. 
The database is structured as a Parent (Notification) -> Children (Posts) architecture. Everything that is truly shared goes in the root, everything that CAN differ per post goes in the 'posts' array.

CRITICAL INSTRUCTIONS:
- ANTI-HALLUCINATION: If a field is not found in the PDF, return null. NEVER guess or infer data that is not explicitly stated.
- BILINGUAL/HINDI PDFs: Extract data from BOTH languages. Always return field values in English.
- NON-NOTIFICATIONS: If the PDF is NOT a recruitment/exam notification (e.g. syllabus, admit card, court order, result sheet, general circular), return: {"name": null, "extraction_confidence": "LOW", "extraction_notes": "Not a recruitment notification — <reason>", "posts": []}. Do not populate any other fields.
- SINGLE-POST: If the notification has only ONE post, or all candidates are eligible for the same role, still create exactly ONE object in the 'posts' array containing ALL the fee, age, qualification, and eligibility data.
- MULTI-POST: If the notification has multiple posts with DIFFERENT eligibility (e.g., Assistant vs. Junior Statistical Officer vs. Medical Officer), create a SEPARATE object in the 'posts' array for EACH post. DO NOT MERGE ELIGIBILITY. Each post must have its own exact fee, age, qualification, vacancies, and physical standards.
- POST ELIGIBILITY:
  - Age relaxations (auto-derive if notification only states General max age): OBC = Gen+3, SC/ST = Gen+5, EWS = same as General, PwD/General = Gen+10, PwD/OBC = Gen+13, PwD/SC/ST = Gen+15.
  - age_cutoff_date: use the application_end date if not explicitly stated.
  - Fees: Extract ALL category-specific fees. Use integers only in INR (strip ₹ and /-). If a category is explicitly free, use 0. If a category fee is not mentioned at all, return null.
  - Required Qualification exact enums only: CLASS_10 | CLASS_12 | ITI | DIPLOMA | GRADUATE_ANY | GRADUATE_SPECIFIC | POST_GRADUATE | DOCTORATE | PROFESSIONAL | ANY
  - Domicile: if restricted to a specific state, provide the 2-letter state code (e.g. MH for Maharashtra), otherwise null.

CONTEXT HINTS:
- Source: ${ctx.siteName} (${ctx.siteId})
- Category hint: ${ctx.category}
- State: ${ctx.state ?? 'Central / All India'}
- Surrounding Text (from web page): ${ctx.contextText ?? 'N/A'}
- PDF URL: ${safeUrl}
- Today: ${today}

{
  "name": "string (Full exam name)",
  "short_name": "string|null (e.g., SSC CGL 2025)",
  "notification_number": "string|null",
  "conducting_body": "string",
  "category": "enum (SSC|RAILWAY|BANKING|UPSC_CIVIL|STATE_PSC|DEFENCE|POLICE|TEACHING|PSU|OTHER)",
  "level": "enum (CENTRAL|STATE|PSU|DEFENCE|BANKING)",
  "state_code": "2-letter state code|null",
  "notification_date": "YYYY-MM-DD|null",
  "application_start": "YYYY-MM-DD|null",
  "application_end": "YYYY-MM-DD",
  "last_date_fee_payment": "YYYY-MM-DD|null",
  "correction_window_start": "YYYY-MM-DD|null",
  "correction_window_end": "YYYY-MM-DD|null",
  "official_notification_url": "string (${safeUrl} defaults here)",
  "syllabus_url": "string|null",
  "previous_papers_url": "string|null",
  "extraction_confidence": "HIGH|MEDIUM|LOW",
  "extraction_notes": "string|null",
  "posts": [
    {
      "post_name": "string",
      "post_code": "string|null",
      "total_vacancies": "number|null",
      "vacancies_by_category": {"general": 10, "obc": 5, "sc": 3, "st": 1, "ews": 2, "pwd": 1},
      "vacancies_by_location": {"Delhi": {"general": 5}, "Mumbai": {"general": 3}}|null,
      "min_age": "number|null",
      "max_age_general": "number|null",
      "max_age_obc": "number|null",
      "max_age_sc_st": "number|null",
      "max_age_ews": "number|null",
      "max_age_pwd_general": "number|null",
      "max_age_pwd_obc": "number|null",
      "max_age_pwd_sc_st": "number|null",
      "max_age_ex_serviceman": "number|null",
      "age_cutoff_date": "YYYY-MM-DD|null",
      "required_qualification": "enum",
      "required_streams": "string[]|null",
      "min_marks_percentage": "number|null",
      "allows_final_year": "boolean",
      "required_certifications": "string[]|null",
      "nationality_requirement": "enum (INDIAN|NEPAL_BHUTAN|PIO|OCI)",
      "domicile_required": "2-letter state code|null",
      "gender_restriction": "enum (MALE|FEMALE|THIRD_GENDER|PREFER_NOT_TO_SAY)|null",
      "marital_status_requirement": "enum (UNMARRIED|MARRIED|DIVORCED|WIDOWED)|null",
      "physical_requirements": "object|null (e.g. height, vision, running)",
      "application_fee_general": "number|null",
      "application_fee_obc": "number|null",
      "application_fee_sc_st": "number|null",
      "application_fee_ews": "number|null",
      "application_fee_pwd": "number|null",
      "application_fee_women": "number|null",
      "application_fee_ex_serviceman": "number|null",
      "fee_payment_mode": "string[]|null",
      "exam_mode": "string|null (ONLINE|OFFLINE|BOTH)",
      "application_mode": "string[]|null (ONLINE|OFFLINE)",
      "apply_online_url": "string|null",
      "exam_stages": "object|null",
      "exam_date": "YYYY-MM-DD|null",
      "exam_duration_minutes": "number|null",
      "admit_card_date": "YYYY-MM-DD|null",
      "result_date": "YYYY-MM-DD|null",
      "exam_cities": "string[]|null",
      "exam_cities_note": "string|null",
      "can_choose_exam_center": "boolean",
      "selection_process": "object|null",
      "pay_scale": "string|null",
      "pay_matrix_level": "string|null",
      "grade_pay": "number|null",
      "probation_period_months": "number|null",
      "service_bond_required": "boolean (default false)",
      "service_bond_years": "number|null",
      "service_bond_amount": "number|null",
      "posting_location_preference": "boolean",
      "transfer_policy": "string|null",
      "required_documents": "object|null",
      "has_special_reservation_rules": "boolean",
      "reservation_rules": "object|null"
    }
  ]
}`
}

// ─── Validation & Sanitisation ────────────────────────────────────────────────

const VALID_CATEGORIES = new Set(['SSC', 'RAILWAY', 'BANKING', 'UPSC_CIVIL', 'STATE_PSC', 'DEFENCE', 'POLICE', 'TEACHING', 'PSU', 'OTHER'])
const VALID_LEVELS = new Set(['CENTRAL', 'STATE', 'PSU', 'DEFENCE', 'BANKING'])
const VALID_QUALS = new Set(['CLASS_10', 'CLASS_12', 'ITI', 'DIPLOMA', 'GRADUATE_ANY', 'GRADUATE_SPECIFIC', 'POST_GRADUATE', 'DOCTORATE', 'PROFESSIONAL', 'ANY'])
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

function coerceDate(val: unknown): string | null {
    if (!val || typeof val !== 'string') return null
    if (DATE_REGEX.test(val)) {
        const d = new Date(val)
        return isNaN(d.getTime()) ? null : val
    }
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0]
}

function coercePositiveInt(val: unknown): number | null {
    const n = typeof val === 'number' ? val : parseInt(String(val), 10)
    return isNaN(n) || n < 0 ? null : Math.round(n)
}

function sanitisePost(rawPost: Record<string, unknown>, fallbackAppEnd: string): ParsedPost {
    const maxGeneral = coercePositiveInt(rawPost.max_age_general)

    return {
        post_name: String(rawPost.post_name || 'General Positions').slice(0, 200),
        post_code: rawPost.post_code ? String(rawPost.post_code).slice(0, 50) : null,
        total_vacancies: coercePositiveInt(rawPost.total_vacancies),
        vacancies_by_category: typeof rawPost.vacancies_by_category === 'object' && rawPost.vacancies_by_category
            ? Object.entries(rawPost.vacancies_by_category).reduce((acc, [k, v]) => {
                const num = coercePositiveInt(v)
                if (num !== null) acc[k.toLowerCase()] = num
                return acc
            }, {} as Record<string, number>)
            : null,
        vacancies_by_location: typeof rawPost.vacancies_by_location === 'object' && rawPost.vacancies_by_location
            ? Object.entries(rawPost.vacancies_by_location).reduce((locAcc, [loc, cats]) => {
                if (typeof cats === 'object' && cats) {
                    locAcc[loc] = Object.entries(cats).reduce((catAcc, [k, v]) => {
                        const num = coercePositiveInt(v)
                        if (num !== null) catAcc[k.toLowerCase()] = num
                        return catAcc
                    }, {} as Record<string, number>)
                }
                return locAcc
            }, {} as Record<string, Record<string, number>>)
            : null,

        min_age: coercePositiveInt(rawPost.min_age),
        max_age_general: maxGeneral,
        max_age_obc: coercePositiveInt(rawPost.max_age_obc) ?? (maxGeneral ? maxGeneral + 3 : null),
        max_age_sc_st: coercePositiveInt(rawPost.max_age_sc_st) ?? (maxGeneral ? maxGeneral + 5 : null),
        max_age_ews: coercePositiveInt(rawPost.max_age_ews) ?? maxGeneral,
        max_age_pwd_general: coercePositiveInt(rawPost.max_age_pwd_general) ?? (maxGeneral ? maxGeneral + 10 : null),
        max_age_pwd_obc: coercePositiveInt(rawPost.max_age_pwd_obc) ?? (maxGeneral ? maxGeneral + 13 : null),
        max_age_pwd_sc_st: coercePositiveInt(rawPost.max_age_pwd_sc_st) ?? (maxGeneral ? maxGeneral + 15 : null),
        max_age_ex_serviceman: coercePositiveInt(rawPost.max_age_ex_serviceman),
        age_cutoff_date: coerceDate(rawPost.age_cutoff_date) ?? fallbackAppEnd,

        required_qualification: VALID_QUALS.has(rawPost.required_qualification as string)
            ? rawPost.required_qualification as ParsedPost['required_qualification'] : 'GRADUATE_ANY',
        required_streams: Array.isArray(rawPost.required_streams) ? rawPost.required_streams.map(String) : null,
        min_marks_percentage: typeof rawPost.min_marks_percentage === 'number' ? rawPost.min_marks_percentage : null,
        allows_final_year: rawPost.allows_final_year === true,
        required_certifications: Array.isArray(rawPost.required_certifications) ? rawPost.required_certifications.map(String) : null,

        nationality_requirement: ['INDIAN', 'NEPAL_BHUTAN', 'PIO', 'OCI'].includes(rawPost.nationality_requirement as string)
            ? rawPost.nationality_requirement as ParsedPost['nationality_requirement'] : 'INDIAN',
        domicile_required: rawPost.domicile_required ? String(rawPost.domicile_required).toUpperCase().slice(0, 2) : null,
        gender_restriction: ['MALE', 'FEMALE', 'THIRD_GENDER', 'PREFER_NOT_TO_SAY'].includes(rawPost.gender_restriction as string)
            ? rawPost.gender_restriction as ParsedPost['gender_restriction'] : null,
        marital_status_requirement: ['UNMARRIED', 'MARRIED', 'DIVORCED', 'WIDOWED'].includes(rawPost.marital_status_requirement as string)
            ? rawPost.marital_status_requirement as ParsedPost['marital_status_requirement'] : null,
        physical_requirements: typeof rawPost.physical_requirements === 'object' && rawPost.physical_requirements ? rawPost.physical_requirements as Record<string, unknown> : null,

        application_fee_general: coercePositiveInt(rawPost.application_fee_general),
        application_fee_obc: coercePositiveInt(rawPost.application_fee_obc),
        application_fee_sc_st: coercePositiveInt(rawPost.application_fee_sc_st),
        application_fee_ews: coercePositiveInt(rawPost.application_fee_ews),
        application_fee_pwd: coercePositiveInt(rawPost.application_fee_pwd),
        application_fee_women: coercePositiveInt(rawPost.application_fee_women),
        application_fee_ex_serviceman: coercePositiveInt(rawPost.application_fee_ex_serviceman),
        fee_payment_mode: Array.isArray(rawPost.fee_payment_mode) ? rawPost.fee_payment_mode.map(String) : null,

        exam_mode: rawPost.exam_mode ? String(rawPost.exam_mode) : null,
        application_mode: Array.isArray(rawPost.application_mode) ? rawPost.application_mode.map(String) : null,
        apply_online_url: rawPost.apply_online_url ? String(rawPost.apply_online_url) : null,

        exam_stages: typeof rawPost.exam_stages === 'object' && rawPost.exam_stages ? rawPost.exam_stages as Record<string, unknown> : null,
        exam_date: coerceDate(rawPost.exam_date),
        exam_duration_minutes: coercePositiveInt(rawPost.exam_duration_minutes),
        admit_card_date: coerceDate(rawPost.admit_card_date),
        result_date: coerceDate(rawPost.result_date),
        exam_cities: Array.isArray(rawPost.exam_cities) ? rawPost.exam_cities.map(String) : null,
        exam_cities_note: rawPost.exam_cities_note ? String(rawPost.exam_cities_note) : null,
        can_choose_exam_center: rawPost.can_choose_exam_center !== false,

        selection_process: typeof rawPost.selection_process === 'object' && rawPost.selection_process ? rawPost.selection_process as Record<string, unknown> : null,
        pay_scale: rawPost.pay_scale ? String(rawPost.pay_scale) : null,
        pay_matrix_level: rawPost.pay_matrix_level ? String(rawPost.pay_matrix_level) : null,
        grade_pay: coercePositiveInt(rawPost.grade_pay),
        probation_period_months: coercePositiveInt(rawPost.probation_period_months),
        service_bond_required: rawPost.service_bond_required === true,
        service_bond_years: coercePositiveInt(rawPost.service_bond_years),
        service_bond_amount: coercePositiveInt(rawPost.service_bond_amount),

        posting_location_preference: rawPost.posting_location_preference !== false,
        transfer_policy: rawPost.transfer_policy ? String(rawPost.transfer_policy) : null,
        required_documents: typeof rawPost.required_documents === 'object' && rawPost.required_documents ? rawPost.required_documents as Record<string, unknown> : null,
        has_special_reservation_rules: rawPost.has_special_reservation_rules === true,
        reservation_rules: typeof rawPost.reservation_rules === 'object' && rawPost.reservation_rules ? rawPost.reservation_rules as Record<string, unknown> : null,
    }
}

function sanitise(raw: Record<string, unknown>, ctx: ExtractionContext, modelUsed: string): ParsedExamNotification | null {
    let appEnd = coerceDate(raw.application_end)
    let conf = (['HIGH', 'MEDIUM', 'LOW'].includes(raw.extraction_confidence as string)
        ? raw.extraction_confidence as ParsedExamNotification['extraction_confidence'] : 'LOW')
    let notes = raw.extraction_notes ? String(raw.extraction_notes).slice(0, 500) : null

    if (!appEnd) {
        appEnd = '2099-12-31'
        conf = 'LOW'
        notes = (notes ? notes + ' | ' : '') + 'MISSING application_end date (needs manual review)'
    }

    const rawPosts = Array.isArray(raw.posts) ? raw.posts : []
    const sanitisedPosts = rawPosts.map(rp => sanitisePost(rp as Record<string, unknown>, appEnd!))

    // Fallback if no posts extracted
    if (sanitisedPosts.length === 0) {
        sanitisedPosts.push(sanitisePost({ post_name: "General Positions" }, appEnd!))
        conf = 'LOW'
        notes = (notes ? notes + ' | ' : '') + 'WARNING: No posts were identified in the PDF, created a fallback post.'
    }

    return {
        name: String(raw.name ?? '').slice(0, 300) || ctx.linkText?.slice(0, 300) || 'Untitled Notification',
        short_name: raw.short_name ? String(raw.short_name).slice(0, 100) : null,
        notification_number: raw.notification_number ? String(raw.notification_number).slice(0, 100) : null,
        conducting_body: String(raw.conducting_body ?? ctx.siteName).slice(0, 200),
        category: VALID_CATEGORIES.has(raw.category as string)
            ? raw.category as ParsedExamNotification['category']
            : (ctx.category as ParsedExamNotification['category']) ?? 'OTHER',
        level: VALID_LEVELS.has(raw.level as string)
            ? raw.level as ParsedExamNotification['level']
            : ctx.state ? 'STATE' : 'CENTRAL',
        state_code: raw.state_code ? String(raw.state_code).toUpperCase().slice(0, 2) : ctx.state ?? null,

        notification_date: coerceDate(raw.notification_date),
        application_start: coerceDate(raw.application_start),
        application_end: appEnd,
        last_date_fee_payment: coerceDate(raw.last_date_fee_payment),
        correction_window_start: coerceDate(raw.correction_window_start),
        correction_window_end: coerceDate(raw.correction_window_end),

        official_notification_url: String(raw.official_notification_url ?? ctx.sourceUrl),
        syllabus_url: raw.syllabus_url ? String(raw.syllabus_url) : null,
        previous_papers_url: raw.previous_papers_url ? String(raw.previous_papers_url) : null,

        extraction_confidence: conf,
        extraction_notes: notes,
        ai_model_used: modelUsed,
        posts: sanitisedPosts
    }
}

// ─── Gemini: Send Raw PDF Bytes ───────────────────────────────────────────────

async function extractViaGemini(
    pdfBuffer: Buffer,
    ctx: ExtractionContext,
    retries = 1
): Promise<ParsedExamNotification | null> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

    const modelName = process.env.AI_MODEL ?? 'gemini-2.0-flash'
    const genAI = new GoogleGenerativeAI(apiKey)

    const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,    // Low randomness for deterministic extraction
            topP: 0.8,
            maxOutputTokens: 16384, // Large limit — a 20-post PDF can easily exceed 8192 tokens
        },
    })

    const prompt = buildPrompt(ctx)

    try {
        const response = await model.generateContent([
            {
                inlineData: {
                    mimeType: 'application/pdf',
                    data: pdfBuffer.toString('base64'),
                },
            },
            { text: prompt },
        ])

        let raw: Record<string, unknown>
        try {
            const text = response.response.text()
            const cleanJson = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
            raw = JSON.parse(cleanJson) as Record<string, unknown>
        } catch (err) {
            console.error('[ai-parser] JSON parse failed entirely for Gemini response')
            return null
        }

        return sanitise(raw, ctx, modelName)
    } catch (err) {
        if (retries > 0) {
            console.warn(`[ai-parser] Gemini extraction failed, retrying in 3s... (${(err as Error).message})`)
            await new Promise(resolve => setTimeout(resolve, 3000))
            return extractViaGemini(pdfBuffer, ctx, retries - 1)
        }
        throw err
    }
}

// ─── OpenAI / Anthropic: Text-Fallback Providers ─────────────────────────────

async function extractViaPdfText(
    pdfBuffer: Buffer,
    ctx: ExtractionContext
): Promise<ParsedExamNotification | null> {
    const { default: pdfParse } = await import('pdf-parse' as any)
    const parsed = await pdfParse(pdfBuffer)
    const text = parsed.text?.replace(/\s+/g, ' ').trim() ?? ''

    if (text.length < 200) {
        console.warn(`[ai-parser] Non-Gemini provider got scanned PDF — text too short (${text.length} chars). Switch AI_PROVIDER=gemini for OCR support.`)
        return null
    }

    const provider = (process.env.AI_PROVIDER ?? 'gemini').toLowerCase()
    const prompt = buildPrompt(ctx)
    const fullPrompt = `${prompt}\n\nPDF TEXT CONTENT:\n━━━━━━━━━━━━━━━━━━━\n${text.slice(0, 28000)}\n━━━━━━━━━━━━━━━━━━━`

    if (provider === 'openai') {
        const { default: OpenAI } = await import('openai')
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        const modelName = process.env.AI_MODEL ?? 'gpt-4o-mini'
        const res = await client.chat.completions.create({
            model: modelName,
            messages: [{ role: 'user', content: fullPrompt }],
            response_format: { type: 'json_object' },
            temperature: 0.1,
        })
        const raw = JSON.parse(res.choices[0]?.message?.content ?? 'null') as Record<string, unknown>
        return sanitise(raw, ctx, modelName)
    }

    if (provider === 'anthropic') {
        const Anthropic = await import('@anthropic-ai/sdk')
        const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY })
        const modelName = process.env.AI_MODEL ?? 'claude-3-haiku-20240307'
        const res = await client.messages.create({
            model: modelName,
            max_tokens: 4096,
            messages: [{ role: 'user', content: fullPrompt + '\n\nRespond with ONLY valid JSON.' }],
            temperature: 0.1,
        })
        const textResponse = res.content[0]?.type === 'text' ? res.content[0].text : 'null'
        const raw = JSON.parse(textResponse.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()) as Record<string, unknown>
        return sanitise(raw, ctx, modelName)
    }

    return null
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function extractExamDataFromPdf(
    pdfBuffer: Buffer,
    ctx: ExtractionContext
): Promise<ParsedExamNotification | null> {
    const provider = (process.env.AI_PROVIDER ?? 'gemini').toLowerCase()

    try {
        if (provider === 'openai' || provider === 'anthropic') {
            return await extractViaPdfText(pdfBuffer, ctx)
        }
        return await extractViaGemini(pdfBuffer, ctx)
    } catch (err) {
        console.error(`[ai-parser] ${provider} extraction failed:`, (err as Error).message)
        return null
    }
}

export function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        .slice(0, 100)
}
