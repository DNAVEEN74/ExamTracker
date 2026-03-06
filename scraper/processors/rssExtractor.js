import * as cheerio from 'cheerio'
import axios from 'axios'
import https from 'https'
import { CONFIG } from '../config/index.js'
import { logger } from '../utils/logger.js'

export async function fetchRssLinks(rssUrl) {
    try {
        const res = await axios.get(rssUrl, {
            headers: { 'User-Agent': CONFIG.userAgent, Accept: 'application/rss+xml,application/xml,text/xml' },
            timeout: CONFIG.timeoutMs,
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        })
        const $ = cheerio.load(res.data, { xmlMode: true })
        const items = []
        $('item').each((_, el) => {
            const url = $(el).find('link').text().trim() || $(el).find('guid').text().trim()
            if (url) {
                items.push({
                    url,
                    type: url.toLowerCase().includes('.pdf') ? 'pdf' : 'detail_page',
                    link_text: $(el).find('title').text().trim().slice(0, 500),
                    context: $(el).find('description').text().trim().slice(0, 1000),
                })
            }
        })
        return items
    } catch (err) {
        logger.warn({ rssUrl, err: err.message }, 'RSS fetch failed')
        return []
    }
}
