# ExamTracker — Government Site Scraper

The scraper that powers ExamTracker's exam notification pipeline.  
Hits **112 official Indian government recruitment sites** every 2-24 hours,  
detects new notifications, downloads PDFs to Cloudflare R2, and queues them for Claude AI parsing.

---

## Architecture

```
Cron Jobs (4 tiers by priority)
    ↓
index.js — Site Processor
    ↓ fetches HTML / RSS
Page Fetcher (Axios + Playwright)
    ↓ detects changes via MD5 hash
Hash Store (JSON file → Redis in prod)
    ↓ new notification found
PDF Downloader
    ↓
Cloudflare R2 Storage
    ↓
Parse Queue (local JSONL → BullMQ in prod)
    ↓
Claude AI Parser (next step — see parser/)
```

---

## Site Coverage (112 sites)

| Category              | Count | Priority | Interval  |
|-----------------------|-------|----------|-----------|
| SSC / UPSC / Banking  | 7     | P0       | 2 hours   |
| All 21 RRBs           | 22    | P0       | 3 hours   |
| State PSCs (22 states)| 21    | P1       | 6 hours   |
| Defence / Paramilitary| 10    | P0-P1    | 6 hours   |
| Banking (additional)  | 5     | P1-P2    | 6 hours   |
| Teaching (CTET/KVS)   | 5     | P0-P1    | 6 hours   |
| PSUs (Maharatna+)     | 20    | P1-P2    | 12 hours  |
| Health (AIIMS/ESIC)   | 4     | P1-P2    | 6 hours   |
| Transport (DMRC/AAI)  | 4     | P1-P2    | 12 hours  |
| Underrated/Hidden     | 20+   | P2-P3    | 12-24 hrs |

---

## Quick Start

```bash
# Install
npm install
npx playwright install chromium

# Copy env vars
cp .env.example .env
# Edit .env with your R2 credentials

# Run once (P0 sites only — fast test)
npm run scrape:p0

# Run all priorities
npm run scrape:all

# Start cron scheduler (keeps running)
node cron.js
```

---

## Environment Variables

| Variable              | Required | Description                                    |
|-----------------------|----------|------------------------------------------------|
| `R2_ENDPOINT`         | Yes      | Your Cloudflare R2 endpoint URL                |
| `R2_ACCESS_KEY_ID`    | Yes      | R2 access key                                  |
| `R2_SECRET_ACCESS_KEY`| Yes      | R2 secret key                                  |
| `R2_BUCKET`           | Yes      | R2 bucket name (create it first)               |
| `PRIORITY_FILTER`     | No       | Comma-separated: P0,P1,P2,P3 (default: P0,P1) |
| `SCRAPE_CONCURRENCY`  | No       | Parallel requests (default: 3)                 |
| `REQUEST_DELAY_MS`    | No       | Delay between requests in ms (default: 2000)   |
| `PARSING_WEBHOOK_URL` | No       | Your API endpoint to receive new PDFs          |
| `HASH_STORE_PATH`     | No       | Path to hash store JSON (default: ./data/)     |

---

## How Change Detection Works

Every time a site is scraped:
1. The HTML notification section is extracted (tables, notice lists)
2. Nav/headers/ads/scripts are stripped out
3. Remaining text is MD5 hashed
4. Hash is compared to the stored hash from last run
5. If hash changed → new notification detected → PDF extraction begins
6. If hash unchanged → skip (no wasted processing)

This prevents false positives from ad banners changing or timestamps updating.

---

## Output Format

Every new notification queued for parsing looks like this:

```json
{
  "site_id": "ssc",
  "site_name": "Staff Selection Commission",
  "category": "SSC",
  "state": null,
  "source_url": "https://ssc.nic.in/...notification.pdf",
  "r2_url": "r2://examtracker-notifications/ssc/2026/02/25/abc123.pdf",
  "link_text": "SSC CGL 2025 Notification",
  "context_text": "Staff Selection Commission invites applications for...",
  "scraped_at": "2026-02-25T10:30:00.000Z"
}
```

In dev mode, these are written to `./data/parse_queue.jsonl`.  
In prod, they're POST-ed to `PARSING_WEBHOOK_URL` for BullMQ processing.

---

## Adding New Sites

Edit `sites.json`. Add a new entry to the appropriate category:

```json
{
  "id": "unique_site_id",
  "name": "Full Organization Name",
  "short_name": "Short Name",
  "url": "https://example.gov.in",
  "notification_page": "https://example.gov.in/recruitment",
  "priority": "P1",
  "scrape_interval_hrs": 6,
  "scrape_method": "html_parse",
  "has_rss": false,
  "category": "CENTRAL_MINISTRY",
  "notes": "Any special notes about this site"
}
```

Use `"scrape_method": "js_render"` for sites that require JavaScript to load notifications (Playwright will handle it).

---

## Deployment (Railway.app — Recommended)

```toml
# railway.toml
[build]
builder = "nixpacks"
buildCommand = "npm install && npx playwright install chromium"

[deploy]
startCommand = "node cron.js"
restartPolicyType = "always"
```

Set all environment variables in Railway dashboard.

---

## Next Step: The Parser

Once PDFs are in R2 and queued, the **parser** (in `/parser/`) sends each PDF to  
Claude API and extracts structured exam data (deadlines, eligibility, vacancies) into  
your PostgreSQL database.

See `/parser/README.md` for setup.
