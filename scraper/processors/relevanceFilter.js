import { logger } from '../utils/logger.js'

export const KEYWORDS = {
    // Words that strongly indicate this is a new exam/job notification
    INCLUDE: [
        'recruitment', 'notification', 'vacancy', 'advertisement', 'engagement',
        'posts', 'appointment', 'walk-in', 'examination',
        'भर्ती', 'अधिसूचना', 'रिक्ति', 'विज्ञापन', 'नियुक्ति', 'पद', 'परीक्षा'
    ],
    // Words that strongly indicate this is NOT a new exam notification
    EXCLUDE: [
        'result', 'answer key', 'admit card', 'syllabus', 'holiday', 'tender',
        'corrigendum', 'amendment', 'annual report', 'rti', 'minutes', 'circular',
        'office order', 'transfer', 'seniority', 'marks', 'score', 'shortlist',
        'cancellation', 'postponement', 'rejection',
        'परिणाम', 'उत्तर कुंजी', 'प्रवेश पत्र', 'पाठ्यक्रम', 'छुट्टी', 'निविदा',
        'शुद्धिपत्र', 'संशोधन', 'रद्द'
    ]
}

export function isRelevantLink(linkText, contextText) {
    const textToAnalyze = `${linkText} ${contextText}`.toLowerCase()

    // 1. Check exclusions first (if it's a "Result" of a "Recruitment", it's still just a result)
    for (const keyword of KEYWORDS.EXCLUDE) {
        if (textToAnalyze.includes(keyword)) {
            logger.debug({ text: linkText.slice(0, 50), matched: keyword }, 'Rejected by exclusion filter')
            return false
        }
    }

    // 2. Check inclusions
    // On some badly designed gov sites, link text is just "Click here".
    // If it's pure generic text, we might have to pass it and rely on AI, 
    // but if it has keywords, we definitely want it.
    let hasIncludeMatch = false
    for (const keyword of KEYWORDS.INCLUDE) {
        if (textToAnalyze.includes(keyword)) {
            hasIncludeMatch = true
            break
        }
    }

    // If it didn't hit any EXCLUDE words, and it DID hit an INCLUDE word
    if (hasIncludeMatch) return true

    // Fallback: If it's extremely short (e.g., "Download PDF" or just a date) 
    // and didn't hit any excludes, we let it pass. Better to parse a useless PDF 
    // than miss an exam because the gov site used generic link text.
    if (textToAnalyze.length < 30) {
        return true
    }

    // If it's a long string describing something else entirely, skip it.
    return false
}
