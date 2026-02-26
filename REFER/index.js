/**
 * ExamTracker India — Government Site Scraper
 * Node.js | Cheerio + Playwright | Cloudflare R2 Storage
 *
 * Flow:
 *   1. Load sites.json config
 *   2. For each site: fetch notification page
 *   3. Diff against last known hash (Redis/file)
 *   4. If changed: extract new PDF links
 *   5. Download PDFs → upload to Cloudflare R2
 *   6. Queue each PDF for Claude AI parsing
 */

import * as cheerio from "cheerio";
import axios from "axios";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import pLimit from "p-limit";
import pino from "pino";
import sitesConfig from "./sites.json" assert { type: "json" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = pino({ level: process.env.LOG_LEVEL || "info" });

// ─── CONFIG ────────────────────────────────────────────────────────────────

const CONFIG = {
  // Cloudflare R2 (S3-compatible)
  r2: {
    endpoint: process.env.R2_ENDPOINT, // https://<accountid>.r2.cloudflarestorage.com
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET || "examtracker-notifications",
    region: "auto",
  },

  // Hash store — file-based for dev, replace with Redis in prod
  hashStorePath: process.env.HASH_STORE_PATH || "./data/hashes.json",

  // Scrape limits — be respectful to government servers
  concurrency: parseInt(process.env.SCRAPE_CONCURRENCY || "3"),
  requestDelayMs: parseInt(process.env.REQUEST_DELAY_MS || "2000"),
  timeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || "30000"),

  // User agent — identify ourselves honestly
  userAgent:
    "ExamTrackerBot/1.0 (+https://examtracker.in/bot) Academic aggregation service",

  // Notification queue webhook — your backend API that triggers Claude parsing
  parsingWebhookUrl: process.env.PARSING_WEBHOOK_URL,

  // Filter — only process these priorities on this run (pass via env or args)
  priorityFilter: (process.env.PRIORITY_FILTER || "P0,P1").split(","),
};

// ─── R2 CLIENT ─────────────────────────────────────────────────────────────

const r2Client = new S3Client({
  endpoint: CONFIG.r2.endpoint,
  region: CONFIG.r2.region,
  credentials: {
    accessKeyId: CONFIG.r2.accessKeyId,
    secretAccessKey: CONFIG.r2.secretAccessKey,
  },
});

// ─── HASH STORE ─────────────────────────────────────────────────────────────
// In production: replace with Redis SET/GET calls (Upstash Redis recommended)

class HashStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.store = {};
  }

  async load() {
    try {
      const data = await fs.readFile(this.filePath, "utf8");
      this.store = JSON.parse(data);
    } catch {
      this.store = {};
    }
  }

  async save() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.store, null, 2));
  }

  get(siteId) {
    return this.store[siteId] || null;
  }

  set(siteId, hash) {
    this.store[siteId] = { hash, updatedAt: new Date().toISOString() };
  }

  hasChanged(siteId, newHash) {
    const existing = this.get(siteId);
    return !existing || existing.hash !== newHash;
  }
}

// ─── PAGE FETCHER ──────────────────────────────────────────────────────────

class PageFetcher {
  constructor() {
    this.browser = null;
  }

  async init() {
    // Launch browser for JS-heavy sites
    this.browser = await chromium.launch({ headless: true });
  }

  async close() {
    if (this.browser) await this.browser.close();
  }

  /**
   * Fetch a page using Cheerio (fast, for static HTML)
   */
  async fetchStatic(url) {
    const response = await axios.get(url, {
      headers: { "User-Agent": CONFIG.userAgent },
      timeout: CONFIG.timeoutMs,
      maxRedirects: 5,
    });
    return response.data;
  }

  /**
   * Fetch a page using Playwright (for JS-rendered pages)
   */
  async fetchDynamic(url) {
    const page = await this.browser.newPage();
    await page.setExtraHTTPHeaders({ "User-Agent": CONFIG.userAgent });
    try {
      await page.goto(url, {
        waitUntil: "networkidle",
        timeout: CONFIG.timeoutMs,
      });
      // Wait a bit for any lazy-loaded content
      await page.waitForTimeout(2000);
      return await page.content();
    } finally {
      await page.close();
    }
  }

  async fetch(site) {
    try {
      // Respect robots.txt delay
      await sleep(CONFIG.requestDelayMs);

      const html =
        site.scrape_method === "js_render"
          ? await this.fetchDynamic(site.notification_page)
          : await this.fetchStatic(site.notification_page);

      return html;
    } catch (err) {
      logger.error({ siteId: site.id, url: site.notification_page, err: err.message }, "Fetch failed");
      return null;
    }
  }
}

// ─── PDF EXTRACTOR ─────────────────────────────────────────────────────────

/**
 * Extract PDF links from HTML content.
 * Government sites have inconsistent structures — we use multiple strategies.
 */
function extractPdfLinks(html, baseUrl) {
  const $ = cheerio.load(html);
  const links = new Set();

  // Strategy 1: Direct .pdf href links
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const lower = href.toLowerCase();
    if (
      lower.includes(".pdf") ||
      lower.includes("/recruitment") ||
      lower.includes("/notification") ||
      lower.includes("/advertisement") ||
      lower.includes("/vacancy") ||
      lower.includes("advt") ||
      lower.includes("notice")
    ) {
      try {
        const absoluteUrl = new URL(href, baseUrl).toString();
        links.add(absoluteUrl);
      } catch {
        // Invalid URL — skip
      }
    }
  });

  // Strategy 2: onclick handlers that contain URLs
  $("[onclick]").each((_, el) => {
    const onclick = $(el).attr("onclick") || "";
    const urlMatch = onclick.match(/['"]([^'"]*\.pdf[^'"]*)['"]/i);
    if (urlMatch) {
      try {
        const absoluteUrl = new URL(urlMatch[1], baseUrl).toString();
        links.add(absoluteUrl);
      } catch {}
    }
  });

  // Strategy 3: meta refresh or embedded document links
  $("iframe[src], embed[src], object[data]").each((_, el) => {
    const src =
      $(el).attr("src") || $(el).attr("data") || $(el).attr("href") || "";
    if (src.toLowerCase().includes(".pdf")) {
      try {
        links.add(new URL(src, baseUrl).toString());
      } catch {}
    }
  });

  return Array.from(links);
}

/**
 * Extract notification text snippets alongside PDF links.
 * Used to give Claude context about what the PDF is about.
 */
function extractNotificationSnippets(html, baseUrl) {
  const $ = cheerio.load(html);
  const snippets = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const lower = href.toLowerCase();

    if (
      lower.includes(".pdf") ||
      lower.includes("/recruitment") ||
      lower.includes("/notification")
    ) {
      let absoluteUrl;
      try {
        absoluteUrl = new URL(href, baseUrl).toString();
      } catch {
        return;
      }

      // Get surrounding text for context
      const linkText = $(el).text().trim();
      const parentText = $(el).parent().text().trim().substring(0, 200);
      const grandparentText = $(el)
        .parent()
        .parent()
        .text()
        .trim()
        .substring(0, 300);

      snippets.push({
        url: absoluteUrl,
        link_text: linkText,
        context: grandparentText || parentText,
      });
    }
  });

  return snippets;
}

// ─── HASH FUNCTIONS ────────────────────────────────────────────────────────

/**
 * Hash only the notification-relevant section of a page.
 * Avoids false positives from ad banners, date changes, etc.
 */
function hashNotificationSection(html, siteId) {
  const $ = cheerio.load(html);

  // Remove noise elements
  $("script, style, nav, header, footer, .ads, #ads, .advertisement").remove();

  // Try to focus on notification table/list
  let content = "";
  const selectors = [
    "table", // Most gov sites use tables
    ".notification",
    ".notice",
    ".recruitment",
    "#notifications",
    "#notice",
    "#recruitment",
    "ul li a", // List of links
    ".content a", // Content area links
  ];

  for (const sel of selectors) {
    const found = $(sel).text().trim();
    if (found.length > 100) {
      content = found;
      break;
    }
  }

  // Fallback to full body text if nothing specific found
  if (!content) {
    content = $("body").text().trim();
  }

  // Normalize whitespace for stable hashing
  const normalized = content.replace(/\s+/g, " ").trim();
  return crypto.createHash("md5").update(normalized).digest("hex");
}

// ─── R2 UPLOADER ───────────────────────────────────────────────────────────

async function downloadPdf(url) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      headers: { "User-Agent": CONFIG.userAgent },
      timeout: CONFIG.timeoutMs,
    });
    return Buffer.from(response.data);
  } catch (err) {
    logger.error({ url, err: err.message }, "PDF download failed");
    return null;
  }
}

async function uploadToR2(pdfBuffer, key, metadata) {
  const command = new PutObjectCommand({
    Bucket: CONFIG.r2.bucket,
    Key: key,
    Body: pdfBuffer,
    ContentType: "application/pdf",
    Metadata: {
      source_url: metadata.sourceUrl || "",
      site_id: metadata.siteId || "",
      scraped_at: new Date().toISOString(),
      link_text: (metadata.linkText || "").substring(0, 255),
    },
  });

  await r2Client.send(command);
  return `r2://${CONFIG.r2.bucket}/${key}`;
}

function buildR2Key(siteId, pdfUrl) {
  // Key: site_id/YYYY/MM/DD/hash_of_url.pdf
  const date = new Date();
  const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
  const urlHash = crypto
    .createHash("md5")
    .update(pdfUrl)
    .digest("hex")
    .substring(0, 12);
  return `${siteId}/${dateStr}/${urlHash}.pdf`;
}

// ─── NOTIFICATION QUEUE ────────────────────────────────────────────────────

/**
 * Send a queued item to the parsing pipeline.
 * In production, this should write to a BullMQ queue or similar.
 * For now it sends a webhook POST.
 */
async function queueForParsing(item) {
  if (!CONFIG.parsingWebhookUrl) {
    // In dev mode, just write to a local queue file
    const queueFile = "./data/parse_queue.jsonl";
    await fs.mkdir("./data", { recursive: true });
    await fs.appendFile(
      queueFile,
      JSON.stringify({ ...item, queued_at: new Date().toISOString() }) + "\n"
    );
    logger.info({ item }, "Queued for parsing (local file)");
    return;
  }

  try {
    await axios.post(CONFIG.parsingWebhookUrl, item, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000,
    });
  } catch (err) {
    logger.error({ err: err.message }, "Failed to queue for parsing");
    // Don't throw — scraping succeeded, parsing queue is secondary
  }
}

// ─── RSS FETCHER ──────────────────────────────────────────────────────────

async function fetchRssLinks(rssUrl) {
  try {
    const response = await axios.get(rssUrl, {
      headers: {
        "User-Agent": CONFIG.userAgent,
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      timeout: CONFIG.timeoutMs,
    });

    const $ = cheerio.load(response.data, { xmlMode: true });
    const items = [];

    $("item").each((_, el) => {
      items.push({
        title: $(el).find("title").text().trim(),
        link: $(el).find("link").text().trim() || $(el).find("guid").text().trim(),
        pubDate: $(el).find("pubDate").text().trim(),
        description: $(el).find("description").text().trim().substring(0, 500),
      });
    });

    return items;
  } catch (err) {
    logger.error({ rssUrl, err: err.message }, "RSS fetch failed");
    return [];
  }
}

// ─── SITE PROCESSOR ───────────────────────────────────────────────────────

async function processSite(site, fetcher, hashStore) {
  logger.info({ siteId: site.id, url: site.notification_page }, "Processing site");

  // Handle RSS feeds separately
  if (site.has_rss && site.rss_url) {
    return await processRssSite(site, hashStore);
  }

  // Fetch HTML
  const html = await fetcher.fetch(site);
  if (!html) return { siteId: site.id, status: "fetch_failed" };

  // Hash check
  const newHash = hashNotificationSection(html, site.id);
  if (!hashStore.hasChanged(site.id, newHash)) {
    logger.debug({ siteId: site.id }, "No changes detected");
    return { siteId: site.id, status: "no_change" };
  }

  logger.info({ siteId: site.id }, "Changes detected! Extracting PDFs...");

  // Extract PDF links with context
  const snippets = extractNotificationSnippets(html, site.notification_page);
  const newPdfs = [];

  for (const snippet of snippets) {
    // Skip if it's not a PDF and not a recruitment link
    const url = snippet.url.toLowerCase();
    if (!url.includes(".pdf") && !url.includes("recruit") && !url.includes("notif")) {
      continue;
    }

    // Download PDF
    let r2Url = null;
    if (url.includes(".pdf")) {
      const pdfBuffer = await downloadPdf(snippet.url);
      if (pdfBuffer) {
        const r2Key = buildR2Key(site.id, snippet.url);
        try {
          r2Url = await uploadToR2(pdfBuffer, r2Key, {
            sourceUrl: snippet.url,
            siteId: site.id,
            linkText: snippet.link_text,
          });
        } catch (err) {
          logger.error({ err: err.message, url: snippet.url }, "R2 upload failed");
        }
      }
    }

    const queueItem = {
      site_id: site.id,
      site_name: site.name,
      category: site.category,
      state: site.state || null,
      source_url: snippet.url,
      r2_url: r2Url,
      link_text: snippet.link_text,
      context_text: snippet.context,
      scraped_at: new Date().toISOString(),
    };

    await queueForParsing(queueItem);
    newPdfs.push(queueItem);
  }

  // Update hash only after successful processing
  hashStore.set(site.id, newHash);

  return {
    siteId: site.id,
    status: "processed",
    newItems: newPdfs.length,
  };
}

async function processRssSite(site, hashStore) {
  const items = await fetchRssLinks(site.rss_url);
  if (!items.length) return { siteId: site.id, status: "rss_empty" };

  // Hash the RSS items list
  const contentHash = crypto
    .createHash("md5")
    .update(items.map((i) => i.link).join("|"))
    .digest("hex");

  if (!hashStore.hasChanged(site.id + "_rss", contentHash)) {
    return { siteId: site.id, status: "no_change" };
  }

  logger.info({ siteId: site.id, count: items.length }, "New RSS items found");

  for (const item of items) {
    if (!item.link) continue;

    let r2Url = null;
    if (item.link.toLowerCase().includes(".pdf")) {
      const pdfBuffer = await downloadPdf(item.link);
      if (pdfBuffer) {
        const r2Key = buildR2Key(site.id, item.link);
        try {
          r2Url = await uploadToR2(pdfBuffer, r2Key, {
            sourceUrl: item.link,
            siteId: site.id,
            linkText: item.title,
          });
        } catch {}
      }
    }

    await queueForParsing({
      site_id: site.id,
      site_name: site.name,
      category: site.category,
      state: site.state || null,
      source_url: item.link,
      r2_url: r2Url,
      link_text: item.title,
      context_text: item.description,
      pub_date: item.pubDate,
      scraped_at: new Date().toISOString(),
    });
  }

  hashStore.set(site.id + "_rss", contentHash);
  return { siteId: site.id, status: "processed", newItems: items.length };
}

// ─── MAIN ORCHESTRATOR ─────────────────────────────────────────────────────

async function main() {
  logger.info("ExamTracker Scraper starting...");

  // Flatten all sites from all categories
  const allSites = [];
  for (const category of Object.values(sitesConfig.sites)) {
    for (const site of category) {
      // Skip manual-only sites
      if (site.scrape_method === "manual") continue;
      // Skip sites without notification pages
      if (!site.notification_page) continue;
      // Apply priority filter
      if (!CONFIG.priorityFilter.includes(site.priority)) continue;

      allSites.push(site);
    }
  }

  logger.info(
    { total: allSites.length, priorities: CONFIG.priorityFilter },
    "Sites loaded"
  );

  // Load hash store
  const hashStore = new HashStore(CONFIG.hashStorePath);
  await hashStore.load();

  // Init browser for JS-rendered pages
  const fetcher = new PageFetcher();
  await fetcher.init();

  // Process sites with concurrency limit
  const limit = pLimit(CONFIG.concurrency);
  const results = await Promise.all(
    allSites.map((site) =>
      limit(() => processSite(site, fetcher, hashStore))
    )
  );

  await fetcher.close();
  await hashStore.save();

  // Summary
  const summary = {
    total: results.length,
    processed: results.filter((r) => r.status === "processed").length,
    noChange: results.filter((r) => r.status === "no_change").length,
    failed: results.filter((r) => r.status === "fetch_failed").length,
    newItems: results.reduce((sum, r) => sum + (r.newItems || 0), 0),
  };

  logger.info(summary, "Scraper run complete");
  return summary;
}

// ─── UTILS ────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── ENTRY POINT ──────────────────────────────────────────────────────────

main().catch((err) => {
  logger.error({ err: err.message, stack: err.stack }, "Scraper crashed");
  process.exit(1);
});
