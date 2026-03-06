import { CONFIG } from '../config/index.js'

export function extractLinks($, baseUrl, siteConfig) {
    const links = []

    // 1. Identify what selectors to use based on site config or defaults
    const pdfSelectors = siteConfig.pdf_selector || 'a[href*=".pdf"], [onclick*=".pdf"], [data-href*=".pdf"]'
    const detailSelectors = siteConfig.detail_page_selector || null
    const dynamicSelectors = siteConfig.dynamic_url_selector || null

    // --- PDF Links ---
    $(pdfSelectors).each((_, el) => {
        if (links.length >= CONFIG.maxLinksPerSite) return false
        const rawHref = $(el).attr('href') || $(el).attr('data-href') || ''
        const onclick = $(el).attr('onclick') || ''

        let urlStr = rawHref
        if (!urlStr && onclick) {
            const match = onclick.match(/['"]([^'"]*\.pdf[^'"]*)['"]/i)
            if (match) urlStr = match[1]
        }

        if (!urlStr) return

        try {
            links.push({
                url: new URL(urlStr, baseUrl).toString(),
                type: 'pdf',
                link_text: $(el).text().trim().slice(0, 500),
                context: $(el).closest('tr, li, div, section').text().trim().slice(0, 1000),
            })
        } catch { }
    })

    // --- Detail Page Links (Stage 2) ---
    if (detailSelectors) {
        $(detailSelectors).each((_, el) => {
            if (links.length >= CONFIG.maxLinksPerSite * 2) return false
            const href = $(el).attr('href')
            if (!href || href.toLowerCase().includes('.pdf')) return // skip if it's already a PDF

            try {
                const url = new URL(href, baseUrl)
                // Only follow links staying on the same domain
                if (url.hostname === new URL(baseUrl).hostname) {
                    links.push({
                        url: url.toString(),
                        type: 'detail_page',
                        link_text: $(el).text().trim().slice(0, 500),
                        context: $(el).closest('tr, li, div, section').text().trim().slice(0, 1000),
                    })
                }
            } catch { }
        })
    }

    // --- Dynamic Downloads / non-PDF raw files ---
    if (dynamicSelectors) {
        $(dynamicSelectors).each((_, el) => {
            if (links.length >= CONFIG.maxLinksPerSite * 2) return false
            const href = $(el).attr('href')
            if (!href) return

            try {
                links.push({
                    url: new URL(href, baseUrl).toString(),
                    type: 'dynamic',
                    link_text: $(el).text().trim().slice(0, 500),
                    context: $(el).closest('tr, li, div, section').text().trim().slice(0, 1000),
                })
            } catch { }
        })
    }

    // Deduplicate by URL
    const seen = new Set()
    return links.filter(l => {
        if (seen.has(l.url)) return false
        seen.add(l.url)
        return true
    })
}
