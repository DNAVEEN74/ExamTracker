/**
 * ExamTracker — Local SSC Scraper E2E Test (v2 — AI Classifier)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Tests the full 3-tier AI pipeline locally:
 *   Stage 1 — Fetch SSC notices via JSON API (apiExtractor.js)
 *   Stage 2 — Download all PDFs (no keyword filter)
 *   Stage 3 — SHA-256 dedup (test-output/seen_hashes.json)
 *   Stage 4 — AI Classify (headline + first page → RECRUITMENT/RESULT/etc.)
 *   Stage 5 — Full AI Parse only for RECRUITMENT (Gemini 2.0 Flash)
 *   Stage 6 — Save parsed JSON to test-output/results/
 *
 * Usage:
 *   npm run test:ssc                  — default (max 5 PDFs for classifier test)
 *   node test-ssc-local.js --limit 0  — process all PDFs
 *   node test-ssc-local.js --no-parse — classify only, skip full AI parse
 *
 * Re-run to test dedup: previously-seen PDFs are skipped.
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import axios from 'axios'
import https from 'https'
import crypto from 'crypto'
import { GoogleGenerativeAI } from '@google/generative-ai'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Stub env vars BEFORE dynamic imports (config/index.js requireEnv) ───────
const envFilePath = join(__dirname, '.env')
if (existsSync(envFilePath)) {
    const envContent = await readFile(envFilePath, 'utf8')
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const [key, ...rest] = trimmed.split('=')
        if (key && !process.env[key]) process.env[key] = rest.join('=')
    }
}
// Hard stubs for any still-missing required vars
const STUBS = { DATABASE_URL: 'postgresql://stub:stub@localhost:5432/stub', R2_ACCOUNT_ID: 'stub', R2_ACCESS_KEY_ID: 'stub', R2_SECRET_ACCESS_KEY: 'stub', R2_BUCKET_NAME: 'stub', PARSING_WEBHOOK_URL: 'http://localhost:3000/stub', SCRAPER_WEBHOOK_SECRET: 'stub' }
for (const [k, v] of Object.entries(STUBS)) { if (!process.env[k]) process.env[k] = v }

// ─── Load Gemini key from frontend/.env.local if not in scraper .env ─────────
if (!process.env.GEMINI_API_KEY) {
    const frontendEnv = join(__dirname, '..', 'frontend', '.env.local')
    if (existsSync(frontendEnv)) {
        const src = await readFile(frontendEnv, 'utf8')
        const m = src.match(/^GEMINI_API_KEY=(.+)$/m)
        if (m) process.env.GEMINI_API_KEY = m[1].trim()
    }
}

if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in scraper/.env or frontend/.env.local')
    process.exit(1)
}

// Dynamic imports — run AFTER env stubs are set
const { fetchApiLinks } = await import('./processors/apiExtractor.js')
const { classifyNotification, DOC_TYPE } = await import('./processors/aiClassifier.js')

// ─── Config ───────────────────────────────────────────────────────────────────
const OUTPUT_DIR = join(__dirname, 'test-output')
const PDF_DIR = join(OUTPUT_DIR, 'pdfs')
const RESULTS_DIR = join(OUTPUT_DIR, 'results')
const HASHES_FILE = join(OUTPUT_DIR, 'seen_hashes.json')
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const TIMEOUT_MS = 30000
const MAX_PDF_SIZE = 15 * 1024 * 1024

const limitArg = process.argv.indexOf('--limit')
const MAX_PDFS = limitArg !== -1 ? parseInt(process.argv[limitArg + 1] ?? '5', 10) : 5
const NO_PARSE = process.argv.includes('--no-parse')

// ─── Dedup helpers ────────────────────────────────────────────────────────────
async function loadSeenHashes() {
    if (!existsSync(HASHES_FILE)) return {}
    try { return JSON.parse(await readFile(HASHES_FILE, 'utf8')) } catch { return {} }
}
async function saveSeenHashes(h) { await writeFile(HASHES_FILE, JSON.stringify(h, null, 2)) }

// ─── Download PDF ─────────────────────────────────────────────────────────────
async function downloadPdf(url) {
    const res = await axios.get(url, { responseType: 'arraybuffer', headers: { 'User-Agent': USER_AGENT }, timeout: TIMEOUT_MS, maxContentLength: MAX_PDF_SIZE, httpsAgent: new https.Agent({ rejectUnauthorized: false }) })
    return Buffer.from(res.data)
}

// ─── Full AI Parser (Gemini 2.0 Flash) ───────────────────────────────────────
function buildParsePrompt(ctx) {
    const safeUrl = ctx.sourceUrl.replace(/[\r\n`]/g, '')
    return `You are an expert Indian government exam data extraction engine. Extract ALL structured data from the attached recruitment notification PDF into the JSON schema below.

CRITICAL: Only return null values, NEVER guess. Return ONLY valid JSON.

Context: ${ctx.siteName} | Headline: ${ctx.headline} | Today: ${new Date().toISOString().split('T')[0]}

{
  "name": "string",
  "short_name": "string|null",
  "notification_number": "string|null",
  "conducting_body": "string",
  "category": "SSC|RAILWAY|BANKING|UPSC_CIVIL|STATE_PSC|DEFENCE|POLICE|TEACHING|PSU|OTHER",
  "level": "CENTRAL|STATE|PSU|DEFENCE|BANKING",
  "notification_date": "YYYY-MM-DD|null",
  "application_start": "YYYY-MM-DD|null",
  "application_end": "YYYY-MM-DD|null",
  "official_notification_url": "${safeUrl}",
  "extraction_confidence": "HIGH|MEDIUM|LOW",
  "extraction_notes": "string|null",
  "posts": [{"post_name": "string", "post_code": "string|null", "total_vacancies": "number|null", "vacancies_by_category": {"general":0,"obc":0,"sc":0,"st":0,"ews":0}|null, "min_age": "number|null", "max_age_general": "number|null", "required_qualification": "CLASS_10|CLASS_12|ITI|DIPLOMA|GRADUATE_ANY|GRADUATE_SPECIFIC|POST_GRADUATE|DOCTORATE|PROFESSIONAL|ANY", "application_fee_general": "number|null", "application_fee_sc_st": "number|null", "exam_mode": "ONLINE|OFFLINE|BOTH|null", "exam_date": "YYYY-MM-DD|null", "pay_scale": "string|null", "selection_process": "object|null"}]
}`
}

async function fullAiParse(pdfBuffer, ctx) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const parseModel = process.env.GEMINI_CLASSIFIER_MODEL || 'gemini-3.1-flash-lite-preview'
    const model = genAI.getGenerativeModel({ model: parseModel, generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 16384 } })
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const res = await model.generateContent([{ inlineData: { mimeType: 'application/pdf', data: pdfBuffer.toString('base64') } }, { text: buildParsePrompt(ctx) }])
            const text = res.response.text().replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
            return JSON.parse(text)
        } catch (err) {
            if (attempt === 2) throw err
            console.warn(`   ⚠️  Parse attempt 1 failed: ${err.message}. Retrying...`)
            await new Promise(r => setTimeout(r, 3000))
        }
    }
}

// ─── Formatting helpers ───────────────────────────────────────────────────────
const DIV = '━'.repeat(70)
const sec = t => { console.log(); console.log(DIV); console.log(`  ${t}`); console.log(DIV) }

// Emoji per classification type
const TYPE_EMOJI = { RECRUITMENT: '✅', RESULT: '📋', ADMIT_CARD: '🎫', ANSWER_KEY: '📝', SYLLABUS: '📚', CORRIGENDUM: '✏️', OTHER: '🗂️' }

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    const t0 = Date.now()
    sec('🚀 ExamTracker — SSC Scraper Test (AI Classifier v2)')
    console.log(`  Limit: ${MAX_PDFS || 'UNLIMITED'}${NO_PARSE ? '  |  Mode: classify-only (--no-parse)' : ''}`)

    await mkdir(PDF_DIR, { recursive: true })
    await mkdir(RESULTS_DIR, { recursive: true })
    console.log(`  ✅ Gemini key loaded`)

    // Load SSC site config
    const sitesJson = JSON.parse(await readFile(join(__dirname, 'sites.json'), 'utf8'))
    const sscSite = sitesJson.sites.CENTRAL_EXAM_BODIES.find(s => s.id === 'ssc')
    console.log(`  📋 Site: ${sscSite.name}  |  Method: ${sscSite.scrape_method}`)

    const seenHashes = await loadSeenHashes()
    console.log(`  📦 Previously seen hashes: ${Object.keys(seenHashes).length}`)

    // ── Stage 1: Fetch via API ─────────────────────────────────────────────
    sec('📡 Stage 1: Fetching SSC Notices (JSON API)')
    const apiLinks = await fetchApiLinks(sscSite)
    console.log(`  Total PDF links from API: ${apiLinks.length}`)

    // List first 10
    apiLinks.slice(0, 10).forEach((l, i) => {
        console.log(`  ${i + 1}. [${l.date}] ${l.headline.slice(0, 75)}`)
    })
    if (apiLinks.length > 10) console.log(`  ... and ${apiLinks.length - 10} more`)

    const toProcess = MAX_PDFS > 0 ? apiLinks.slice(0, MAX_PDFS) : apiLinks
    if (MAX_PDFS > 0 && apiLinks.length > MAX_PDFS) {
        console.log(`\n  ⚡ Processing ${toProcess.length} of ${apiLinks.length} (use --limit 0 for all)`)
    }

    // ── Stage 2-5: Download → Dedup → Classify → Parse ────────────────────
    sec('⬇️  Stage 2-5: Download → Dedup → AI Classify → AI Parse')

    const stats = { downloaded: 0, duplicates: 0, parsed: 0, classifiedAs: {}, failed: 0 }
    const parsedResults = []

    for (let i = 0; i < toProcess.length; i++) {
        const link = toProcess[i]
        console.log(`\n  [${i + 1}/${toProcess.length}] ${link.headline.slice(0, 75)}`)
        console.log(`  📎 ${link.context}`)

        // Download
        let pdf
        try {
            pdf = await downloadPdf(link.url)
            console.log(`  📥 ${(pdf.length / 1024).toFixed(1)}KB`)
        } catch (err) {
            console.error(`  ❌ Download failed: ${err.message}`)
            stats.failed++; continue
        }

        // Validate PDF
        if (!pdf || pdf.length < 100 || pdf[0] !== 0x25 || pdf[1] !== 0x50 || pdf[2] !== 0x44 || pdf[3] !== 0x46) {
            console.warn(`  ⚠️  Not a valid PDF — skipping`)
            stats.failed++; continue
        }

        // Dedup
        const hash = crypto.createHash('sha256').update(pdf).digest('hex')
        const shortHash = hash.slice(0, 12)
        if (seenHashes[hash]) {
            console.log(`  🔄 DUPLICATE (${shortHash}...) — first seen ${seenHashes[hash].first_seen}`)
            stats.duplicates++; continue
        }
        stats.downloaded++

        // Save PDF
        const pdfFile = `${shortHash}_${link.context.split('|').pop().trim()}`
        await writeFile(join(PDF_DIR, pdfFile), pdf)
        seenHashes[hash] = { first_seen: new Date().toISOString(), source_url: link.url, headline: link.headline, local_pdf: pdfFile }
        await saveSeenHashes(seenHashes)
        console.log(`  💾 Saved: pdfs/${pdfFile}`)

        // ── Tier 1: AI Classify ────────────────────────────────────────────
        console.log(`  🏷️  Classifying (headline + first page)...`)
        let classification
        try {
            classification = await classifyNotification({ headline: link.headline, pdfBuffer: pdf, siteId: sscSite.id, siteName: sscSite.name })
        } catch (err) {
            console.warn(`  ⚠️  Classifier error: ${err.message} — treating as RECRUITMENT (fail-open)`)
            classification = { type: DOC_TYPE.RECRUITMENT, confidence: 'LOW', reason: `Error: ${err.message}` }
        }

        const emoji = TYPE_EMOJI[classification.type] ?? '❓'
        console.log(`  ${emoji} Type: ${classification.type} [${classification.confidence}]`)
        console.log(`     Reason: ${classification.reason}`)
        stats.classifiedAs[classification.type] = (stats.classifiedAs[classification.type] ?? 0) + 1

        // ── Tier 2: Full parse only for RECRUITMENT ────────────────────────
        if (classification.type !== DOC_TYPE.RECRUITMENT) {
            console.log(`  ⏭️  Not RECRUITMENT — skipping full parse`)
            await new Promise(r => setTimeout(r, 1500))
            continue
        }

        if (NO_PARSE) {
            console.log(`  ⏭️  --no-parse flag set — skipping full parse`)
            stats.parsed++
            continue
        }

        console.log(`  🤖 Full AI parse (Gemini 2.0 Flash)...`)
        try {
            const parsed = await fullAiParse(pdf, { sourceUrl: link.url, siteName: sscSite.name, headline: link.headline })

            if (!parsed?.name) {
                console.warn(`  ⚠️  AI returned no name — saving raw response`)
                await writeFile(join(RESULTS_DIR, `${shortHash}_raw.json`), JSON.stringify(parsed, null, 2))
                stats.failed++
            } else {
                const resultFile = `${shortHash}_${(parsed.short_name ?? 'parsed').replace(/[^a-zA-Z0-9]/g, '_')}.json`
                await writeFile(join(RESULTS_DIR, resultFile), JSON.stringify(parsed, null, 2))
                console.log(`  ✅ Parsed: "${parsed.name}"`)
                console.log(`     Confidence: ${parsed.extraction_confidence}  |  Posts: ${parsed.posts?.length ?? 0}  |  App End: ${parsed.application_end ?? 'N/A'}`)
                parsed.posts?.forEach(p => console.log(`       • ${p.post_name} — ${p.total_vacancies ?? '?'} vacancies`))
                console.log(`     📁 results/${resultFile}`)
                stats.parsed++
                parsedResults.push({ name: parsed.name, confidence: parsed.extraction_confidence, posts: parsed.posts?.length ?? 0 })
            }
        } catch (err) {
            console.error(`  ❌ Full parse failed: ${err.message}`)
            stats.failed++
        }

        if (i < toProcess.length - 1) {
            console.log(`  ⏳ 2s cooldown...`)
            await new Promise(r => setTimeout(r, 2000))
        }
    }

    // ── Summary ────────────────────────────────────────────────────────────
    sec('📊 FINAL SUMMARY')
    console.log(`  Time: ${((Date.now() - t0) / 1000).toFixed(1)}s`)
    console.log(`  API notices: ${apiLinks.length}   Processed: ${toProcess.length}`)
    console.log()
    console.log(`  📥 Downloaded (new):   ${stats.downloaded}`)
    console.log(`  🔄 Duplicates skipped: ${stats.duplicates}`)
    console.log(`  ❌ Errors:             ${stats.failed}`)
    console.log()
    console.log('  🏷️  Classification breakdown:')
    for (const [type, count] of Object.entries(stats.classifiedAs)) {
        console.log(`     ${TYPE_EMOJI[type] ?? '❓'} ${type}: ${count}`)
    }
    if (Object.keys(stats.classifiedAs).length === 0) console.log('     (none classified yet)')
    console.log()
    console.log(`  ✅ Parsed as RECRUITMENT: ${stats.parsed}`)
    if (parsedResults.length > 0) {
        parsedResults.forEach((r, i) => console.log(`     ${i + 1}. [${r.confidence}] ${r.name} (${r.posts} posts)`))
    }
    console.log()
    console.log(`  Total hashes: ${Object.keys(seenHashes).length}`)
    if (stats.duplicates > 0) console.log('\n  💡 Dedup working! Run again to see all duplicates skipped.')
    console.log(DIV)
    console.log('  ✅ Test complete. Run again to test deduplication.')
    console.log(DIV)
}

main().catch(err => { console.error('\n❌ FATAL:', err.message, '\n', err.stack); process.exit(1) })
