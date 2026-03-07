import axios from 'axios'
import https from 'https'
import { chromium } from 'playwright'
import { CONFIG } from '../config/index.js'
import { logger } from '../utils/logger.js'

const customHttpsAgent = new https.Agent({ rejectUnauthorized: false })

export class PageFetcher {
    constructor() { this.browser = null; this.isFirst = true; }

    async delayIfNotFirst() {
        if (this.isFirst) {
            this.isFirst = false;
        } else {
            await new Promise(r => setTimeout(r, CONFIG.requestDelayMs))
        }
    }

    async init() {
        this.browser = await chromium.launch({ headless: true })
        logger.debug('Playwright browser launched')
    }

    async close() {
        if (this.browser) {
            await this.browser.close()
            logger.debug('Playwright browser closed')
        }
    }

    async fetchStatic(url) {
        const response = await axios.get(url, {
            headers: { 'User-Agent': CONFIG.userAgent },
            timeout: CONFIG.timeoutMs,
            maxRedirects: 5,
            responseType: 'text',
            maxContentLength: 10 * 1024 * 1024,
            httpsAgent: customHttpsAgent
        })
        return { html: response.data, httpStatus: response.status }
    }

    async fetchDynamic(url) {
        const context = await this.browser.newContext({
            userAgent: CONFIG.userAgent,
            ignoreHTTPSErrors: true
        })
        const page = await context.newPage()

        try {
            const response = await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: CONFIG.timeoutMs,
            })
            await page.waitForTimeout(800) // Brief pause — waitForSelector below is the real signal
            await page.waitForSelector('table, ul, .notification, .notice, #main-content', {
                timeout: 5000
            }).catch(() => { /* selector not found — proceed anyway */ })
            return { html: await page.content(), httpStatus: response?.status() ?? 200 }
        } catch (err) {
            logger.warn({ url, err: err.message }, 'Playwright fetch error')
            throw err
        } finally {
            await context.close()
        }
    }

    async fetch(site) {
        await this.delayIfNotFirst()
        try {
            return site.scrape_method === 'js_render'
                ? await this.fetchDynamic(site.notification_page)
                : await this.fetchStatic(site.notification_page)
        } catch (err) {
            const httpStatus = err.response?.status ?? null
            const status = httpStatus === 403 || httpStatus === 429
                ? 'BLOCKED'
                : err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED'
                    ? 'TIMEOUT'
                    : 'ERROR'
            return { html: null, httpStatus, errorStatus: status, errorMsg: err.message }
        }
    }
}
