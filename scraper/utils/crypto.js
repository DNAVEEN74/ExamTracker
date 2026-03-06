import crypto from 'crypto'
import * as cheerio from 'cheerio'

export function hashNotificationSection($, customContent = null) {
    if (customContent && customContent.length > 50) {
        return crypto.createHash('md5')
            .update(customContent.replace(/\s+/g, ' ').trim())
            .digest('hex')
    }

    // Work on a cloned `$` to avoid mutating the original document which destroys links
    const $clone = cheerio.load($.html())

    // Remove everything that changes without new content (ads, counters, nav)
    $clone('script, style, nav, header, footer, .ads, #ads, .advertisement, iframe, img, aside').remove()
    $clone('[class*="counter"], [class*="visitor"], [id*="counter"], [id*="visitor"]').remove()
    $clone('time, .datetime, .timestamp, .clock').remove()

    // Government sites use varied class names — try the most specific first
    const candidateSelectors = [
        // Notification-specific
        '#notification-list', '.notification-list', '#notif-box', '.notif-section',
        '#news-updates', '.news-scroll', '.marquee',
        // Common recruitment page patterns
        '#recruitment', '.recruitment-notice', '#vacancy', '.vacancy-list',
        '#advertisement', '.advt-list', '#notice-board', '.notice-board',
        // Generic fallbacks
        'table', '.content-area', '#main-content', '#content', 'main', 'article',
        '.content', '#container',
    ]

    let content = ''
    for (const sel of candidateSelectors) {
        const found = $clone(sel).first().text().replace(/\d{2}[-/]\d{2}[-/]\d{2,4}/g, '').trim() // Strip dates
        if (found.length > 50) { content = found; break } // Lower threshold for sparse tables
    }
    if (!content) content = $clone('body').text().replace(/\d{2}[-/]\d{2}[-/]\d{2,4}/g, '').trim()

    return crypto.createHash('md5')
        .update(content.replace(/\s+/g, ' ').trim())
        .digest('hex')
}

export function hashBufferSha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex')
}
