/**
 * AI Parser Service — Multi-Provider Abstraction
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Switch provider with ONE env var change:
 *   AI_PROVIDER=gemini      → Google Gemini 1.5 Flash (default, cheapest)
 *   AI_PROVIDER=openai      → OpenAI GPT-4o mini
 *   AI_PROVIDER=anthropic   → Anthropic Claude 3.5 Haiku
 *
 * Optionally override the exact model:
 *   AI_MODEL=gemini-1.5-pro          (more accurate, slower)
 *   AI_MODEL=gpt-4o                  (most capable OpenAI)
 *   AI_MODEL=claude-3-5-sonnet-latest (most capable Anthropic)
 */

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface ParsedExamData {
    // Core identity
    name: string
    short_name: string | null
    conducting_body: string
    category: 'SSC' | 'RAILWAY' | 'BANKING' | 'UPSC_CIVIL' | 'STATE_PSC' | 'DEFENCE' | 'POLICE' | 'TEACHING' | 'PSU' | 'OTHER'
    level: 'CENTRAL' | 'STATE' | 'PSU' | 'DEFENCE' | 'BANKING'
    state_code: string | null
    // Vacancies
    total_vacancies: number | null
    vacancies_by_category: Record<string, number> | null  // { GENERAL: 500, OBC: 300, SC: 150, ST: 75, EWS: 100 }
    // Key dates (YYYY-MM-DD)
    notification_date: string | null
    application_start: string | null
    application_end: string
    exam_date: string | null
    admit_card_date: string | null
    result_date: string | null
    // Age eligibility
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
    // Education
    required_qualification: 'CLASS_10' | 'CLASS_12' | 'ITI' | 'DIPLOMA' | 'GRADUATION' | 'POST_GRADUATION' | 'DOCTORATE' | 'PROFESSIONAL_CA' | 'PROFESSIONAL_CS' | 'PROFESSIONAL_ICWA' | 'PROFESSIONAL_LLB' | 'PROFESSIONAL_MBBS' | 'PROFESSIONAL_BED'
    required_streams: string[] | null
    min_marks_percentage: number | null
    allows_final_year: boolean
    // Nationality & special
    nationality_requirement: 'INDIAN' | 'NEPAL_BHUTAN' | 'PIO' | 'OCI'
    gender_restriction: 'MALE' | 'FEMALE' | 'THIRD_GENDER' | 'PREFER_NOT_TO_SAY' | null
    physical_requirements: Record<string, unknown> | null
    marital_status_requirement: 'UNMARRIED' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | null
    // Fees
    application_fee_general: number | null
    application_fee_sc_st: number | null
    application_fee_pwd: number | null
    application_fee_women: number | null
    fee_payment_mode: string[] | null
    // Content
    official_notification_url: string
    description: string | null
    syllabus_summary: string | null
    selection_process: string[] | null
    // Extraction meta
    extraction_confidence: 'HIGH' | 'MEDIUM' | 'LOW'
    extraction_notes: string | null
    ai_provider_used?: string
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

// ─── Provider Interface ───────────────────────────────────────────────────────

interface AIProvider {
    name: string
    extractJson(prompt: string): Promise<Record<string, unknown> | null>
}

// ─── Prompt (provider-agnostic) ───────────────────────────────────────────────

function buildPrompt(pdfText: string, ctx: ExtractionContext): string {
    const today = new Date().toISOString().split('T')[0]
    return `You are an expert Indian government exam data extraction engine. Extract EVERY piece of structured data from this official government recruitment notification.

CONTEXT:
- Source: ${ctx.siteName} (${ctx.siteId}) | Category: ${ctx.category} | State: ${ctx.state ?? 'Central (All India)'}
- Link text: ${ctx.linkText ?? 'N/A'} | Context: ${ctx.contextText ?? 'N/A'}
- PDF URL: ${ctx.sourceUrl} | Today: ${today}

EXTRACTION RULES:
1. DATES → YYYY-MM-DD always. "15 March 2026" → "2026-03-15". Month-only like "April 2026" → use last day for deadlines ("2026-04-30"), first day for starts. Always use REVISED/EXTENDED date if present.
2. AGE RELAXATION (Indian govt standard — derive if notification only gives General max age):
   - OBC: General + 3 years
   - SC/ST: General + 5 years
   - EWS: same as General (no extra relaxation)
   - PwD (General): General + 10 years | PwD (OBC): General + 13 | PwD (SC/ST): General + 15
   - Ex-serviceman: actual service period + 3 years extra
   - age_cutoff_date: use application_end if not stated explicitly
3. VACANCIES: Extract total AND breakdown → { GENERAL, OBC, SC, ST, EWS, PwD }. Use Indian reservation: 27% OBC, 15% SC, 7.5% ST, 10% EWS only if breakdown not stated AND you are confident it's a central govt post. Otherwise null.
4. QUALIFICATION enums (pick MINIMUM required):
   CLASS_10, CLASS_12, ITI, DIPLOMA, GRADUATION, POST_GRADUATION, DOCTORATE,
   PROFESSIONAL_CA, PROFESSIONAL_CS, PROFESSIONAL_ICWA, PROFESSIONAL_LLB, PROFESSIONAL_MBBS, PROFESSIONAL_BED
5. CATEGORY enums: SSC, RAILWAY, BANKING, UPSC_CIVIL, STATE_PSC, DEFENCE, POLICE, TEACHING, PSU, OTHER
6. LEVEL enums: CENTRAL, STATE, PSU, DEFENCE, BANKING
7. FEES in INR integers only (strip ₹ and /-). "750/-" → 750
8. MULTIPLE POSTS: sum all vacancies for total_vacancies, pick primary post for eligibility fields, list posts in description.
9. PHYSICAL_REQUIREMENTS as object: { "min_height_cm": 165, "min_chest_cm": 77, "colour_blind_allowed": false }
10. official_notification_url: use ${ctx.sourceUrl} unless a different official URL explicitly stated in text.
11. description: 2-3 sentences, max 400 chars. Include: exam name, vacancies, last date, key qualification.
12. extraction_confidence: HIGH (>80% fields found), MEDIUM (50-80%), LOW (<50% or scanned/corrupt text).

RETURN ONLY THIS JSON SCHEMA (no markdown, no explanation):
{
  "name": "string",
  "short_name": "string|null",
  "conducting_body": "string",
  "category": "SSC|RAILWAY|BANKING|UPSC_CIVIL|STATE_PSC|DEFENCE|POLICE|TEACHING|PSU|OTHER",
  "level": "CENTRAL|STATE|PSU|DEFENCE|BANKING",
  "state_code": "string|null",
  "total_vacancies": "number|null",
  "vacancies_by_category": "object|null",
  "notification_date": "YYYY-MM-DD|null",
  "application_start": "YYYY-MM-DD|null",
  "application_end": "YYYY-MM-DD",
  "exam_date": "YYYY-MM-DD|null",
  "admit_card_date": "YYYY-MM-DD|null",
  "result_date": "YYYY-MM-DD|null",
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
  "required_qualification": "CLASS_10|CLASS_12|ITI|DIPLOMA|GRADUATION|POST_GRADUATION|DOCTORATE|PROFESSIONAL_CA|PROFESSIONAL_CS|PROFESSIONAL_ICWA|PROFESSIONAL_LLB|PROFESSIONAL_MBBS|PROFESSIONAL_BED",
  "required_streams": "string[]|null",
  "min_marks_percentage": "number|null",
  "allows_final_year": "boolean",
  "nationality_requirement": "INDIAN|NEPAL_BHUTAN|PIO|OCI",
  "gender_restriction": "MALE|FEMALE|THIRD_GENDER|PREFER_NOT_TO_SAY|null",
  "physical_requirements": "object|null",
  "marital_status_requirement": "UNMARRIED|MARRIED|DIVORCED|WIDOWED|null",
  "application_fee_general": "number|null",
  "application_fee_sc_st": "number|null",
  "application_fee_pwd": "number|null",
  "application_fee_women": "number|null",
  "fee_payment_mode": "string[]|null",
  "official_notification_url": "string",
  "description": "string|null",
  "syllabus_summary": "string|null",
  "selection_process": "string[]|null",
  "extraction_confidence": "HIGH|MEDIUM|LOW",
  "extraction_notes": "string|null"
}

PDF TEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${pdfText.slice(0, 28000)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
}

// ─── Provider Implementations ─────────────────────────────────────────────────

/** Google Gemini (default) */
class GeminiProvider implements AIProvider {
    name = 'gemini'
    private model: string

    constructor(model?: string) {
        this.model = model ?? 'gemini-1.5-flash'
    }

    async extractJson(prompt: string): Promise<Record<string, unknown> | null> {
        const { GoogleGenerativeAI } = await import('@google/generative-ai')
        const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
        const geminiModel = client.getGenerativeModel({
            model: this.model,
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
                topP: 0.8,
                maxOutputTokens: 4096,
            },
        })
        const res = await geminiModel.generateContent(prompt)
        return JSON.parse(res.response.text())
    }
}

/** OpenAI GPT-4o / GPT-4o-mini */
class OpenAIProvider implements AIProvider {
    name = 'openai'
    private model: string

    constructor(model?: string) {
        this.model = model ?? 'gpt-4o-mini'
    }

    async extractJson(prompt: string): Promise<Record<string, unknown> | null> {
        const { default: OpenAI } = await import('openai')
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        const res = await client.chat.completions.create({
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.1,
            max_tokens: 4096,
        })
        const text = res.choices[0]?.message?.content ?? 'null'
        return JSON.parse(text)
    }
}

/** Anthropic Claude */
class AnthropicProvider implements AIProvider {
    name = 'anthropic'
    private model: string

    constructor(model?: string) {
        this.model = model ?? 'claude-3-haiku-20240307'
    }

    async extractJson(prompt: string): Promise<Record<string, unknown> | null> {
        const Anthropic = await import('@anthropic-ai/sdk')
        const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY })
        const res = await client.messages.create({
            model: this.model,
            max_tokens: 4096,
            messages: [{ role: 'user', content: prompt + '\n\nRespond with ONLY valid JSON, no markdown.' }],
            temperature: 0.1,
        })
        const text = res.content[0]?.type === 'text' ? res.content[0].text : 'null'
        // Strip any accidental markdown code fences
        const jsonText = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
        return JSON.parse(jsonText)
    }
}

/** Factory — reads AI_PROVIDER and AI_MODEL env vars */
function getProvider(): AIProvider {
    const providerName = (process.env.AI_PROVIDER ?? 'gemini').toLowerCase()
    const model = process.env.AI_MODEL ?? undefined  // optional model override

    switch (providerName) {
        case 'openai': return new OpenAIProvider(model)
        case 'anthropic': return new AnthropicProvider(model)
        case 'gemini':
        default: return new GeminiProvider(model)
    }
}

// ─── Validation & Sanitisation ────────────────────────────────────────────────

const VALID_CATEGORIES = new Set(['SSC', 'RAILWAY', 'BANKING', 'UPSC_CIVIL', 'STATE_PSC', 'DEFENCE', 'POLICE', 'TEACHING', 'PSU', 'OTHER'])
const VALID_LEVELS = new Set(['CENTRAL', 'STATE', 'PSU', 'DEFENCE', 'BANKING'])
const VALID_QUALS = new Set(['CLASS_10', 'CLASS_12', 'ITI', 'DIPLOMA', 'GRADUATION', 'POST_GRADUATION', 'DOCTORATE', 'PROFESSIONAL_CA', 'PROFESSIONAL_CS', 'PROFESSIONAL_ICWA', 'PROFESSIONAL_LLB', 'PROFESSIONAL_MBBS', 'PROFESSIONAL_BED'])
const VALID_NATIONALITIES = new Set(['INDIAN', 'NEPAL_BHUTAN', 'PIO', 'OCI'])
const VALID_GENDERS = new Set(['MALE', 'FEMALE', 'THIRD_GENDER', 'PREFER_NOT_TO_SAY'])
const VALID_MARITAL = new Set(['UNMARRIED', 'MARRIED', 'DIVORCED', 'WIDOWED'])
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

function coerceDate(val: unknown): string | null {
    if (!val || typeof val !== 'string') return null
    if (DATE_REGEX.test(val)) return val
    const d = new Date(val)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    return null
}

function coercePositiveInt(val: unknown): number | null {
    const n = typeof val === 'number' ? val : parseInt(String(val), 10)
    return isNaN(n) || n <= 0 ? null : Math.round(n)
}

export function validateAndSanitise(
    raw: Record<string, unknown>,
    ctx: ExtractionContext,
    providerName: string
): ParsedExamData | null {
    const appEnd = coerceDate(raw.application_end)
    if (!appEnd) return null  // Hard requirement

    const category = VALID_CATEGORIES.has(raw.category as string)
        ? raw.category as ParsedExamData['category']
        : (ctx.category as ParsedExamData['category']) ?? 'OTHER'

    const level = VALID_LEVELS.has(raw.level as string)
        ? raw.level as ParsedExamData['level']
        : ctx.state ? 'STATE' : 'CENTRAL'

    const qualification = VALID_QUALS.has(raw.required_qualification as string)
        ? raw.required_qualification as ParsedExamData['required_qualification']
        : 'GRADUATION'

    // Auto-derive age relaxations if AI only returned max_age_general
    const maxGeneral = coercePositiveInt(raw.max_age_general)
    const maxObc = coercePositiveInt(raw.max_age_obc) ?? (maxGeneral ? maxGeneral + 3 : null)
    const maxScSt = coercePositiveInt(raw.max_age_sc_st) ?? (maxGeneral ? maxGeneral + 5 : null)
    const maxEws = coercePositiveInt(raw.max_age_ews) ?? maxGeneral
    const maxPwdGeneral = coercePositiveInt(raw.max_age_pwd_general) ?? (maxGeneral ? maxGeneral + 10 : null)
    const maxPwdObc = coercePositiveInt(raw.max_age_pwd_obc) ?? (maxGeneral ? maxGeneral + 13 : null)
    const maxPwdScSt = coercePositiveInt(raw.max_age_pwd_sc_st) ?? (maxGeneral ? maxGeneral + 15 : null)

    return {
        name: String(raw.name ?? '').slice(0, 300) || ctx.linkText?.slice(0, 300) || 'Untitled Notification',
        short_name: raw.short_name ? String(raw.short_name).slice(0, 100) : null,
        conducting_body: String(raw.conducting_body ?? ctx.siteName).slice(0, 200),
        category,
        level,
        state_code: raw.state_code ? String(raw.state_code) : ctx.state ?? null,
        total_vacancies: coercePositiveInt(raw.total_vacancies),
        vacancies_by_category: (raw.vacancies_by_category && typeof raw.vacancies_by_category === 'object')
            ? raw.vacancies_by_category as Record<string, number> : null,
        notification_date: coerceDate(raw.notification_date),
        application_start: coerceDate(raw.application_start),
        application_end: appEnd,
        exam_date: coerceDate(raw.exam_date),
        admit_card_date: coerceDate(raw.admit_card_date),
        result_date: coerceDate(raw.result_date),
        min_age: coercePositiveInt(raw.min_age),
        max_age_general: maxGeneral,
        max_age_obc: maxObc,
        max_age_sc_st: maxScSt,
        max_age_ews: maxEws,
        max_age_pwd_general: maxPwdGeneral,
        max_age_pwd_obc: maxPwdObc,
        max_age_pwd_sc_st: maxPwdScSt,
        max_age_ex_serviceman: coercePositiveInt(raw.max_age_ex_serviceman),
        age_cutoff_date: coerceDate(raw.age_cutoff_date) ?? appEnd,
        required_qualification: qualification,
        required_streams: Array.isArray(raw.required_streams) ? raw.required_streams.map(String) : null,
        min_marks_percentage: typeof raw.min_marks_percentage === 'number' ? raw.min_marks_percentage : null,
        allows_final_year: raw.allows_final_year === true,
        nationality_requirement: VALID_NATIONALITIES.has(raw.nationality_requirement as string)
            ? raw.nationality_requirement as ParsedExamData['nationality_requirement'] : 'INDIAN',
        gender_restriction: VALID_GENDERS.has(raw.gender_restriction as string)
            ? raw.gender_restriction as ParsedExamData['gender_restriction'] : null,
        physical_requirements: (raw.physical_requirements && typeof raw.physical_requirements === 'object')
            ? raw.physical_requirements as Record<string, unknown> : null,
        marital_status_requirement: VALID_MARITAL.has(raw.marital_status_requirement as string)
            ? raw.marital_status_requirement as ParsedExamData['marital_status_requirement'] : null,
        application_fee_general: coercePositiveInt(raw.application_fee_general),
        application_fee_sc_st: coercePositiveInt(raw.application_fee_sc_st),
        application_fee_pwd: coercePositiveInt(raw.application_fee_pwd),
        application_fee_women: coercePositiveInt(raw.application_fee_women),
        fee_payment_mode: Array.isArray(raw.fee_payment_mode) ? raw.fee_payment_mode.map(String) : null,
        official_notification_url: String(raw.official_notification_url ?? ctx.sourceUrl),
        description: raw.description ? String(raw.description).slice(0, 500) : null,
        syllabus_summary: raw.syllabus_summary ? String(raw.syllabus_summary).slice(0, 2000) : null,
        selection_process: Array.isArray(raw.selection_process) ? raw.selection_process.map(String) : null,
        extraction_confidence: (['HIGH', 'MEDIUM', 'LOW'].includes(raw.extraction_confidence as string)
            ? raw.extraction_confidence as ParsedExamData['extraction_confidence'] : 'LOW'),
        extraction_notes: raw.extraction_notes ? String(raw.extraction_notes).slice(0, 500) : null,
        ai_provider_used: providerName,
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Main entry point. Provider is selected via AI_PROVIDER env var.
 * Change AI_PROVIDER=gemini → openai → anthropic with zero code changes.
 */
export async function extractExamDataFromText(
    pdfText: string,
    ctx: ExtractionContext
): Promise<ParsedExamData | null> {
    const provider = getProvider()
    const prompt = buildPrompt(pdfText, ctx)

    let raw: Record<string, unknown> | null = null
    try {
        raw = await provider.extractJson(prompt)
    } catch (err) {
        console.error(`[${provider.name}] extraction failed:`, (err as Error).message)
        return null
    }

    if (!raw) return null
    return validateAndSanitise(raw, ctx, provider.name)
}

export function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        .slice(0, 100) + '-' + Date.now()
}
