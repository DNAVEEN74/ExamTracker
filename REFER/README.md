# ExamTracker — Government Site Scraper

## What This Service Does

Visits 142 official Indian government recruitment websites on a schedule,
detects when new notifications appear, downloads the PDF, stores it in
Supabase Storage, and hands it to the PDF parsing pipeline.

That is all it does. It does not parse PDFs. It does not match users.
It does not send notifications. It finds new PDFs and passes them on.

---

## How It Fits Into the Bigger System

```
Railway Cron Jobs (4 tiers by priority)
          ↓
Scraper Service (separate Railway service)
          ↓
Visits government website notification page
          ↓
Compares page hash against last known hash (Supabase DB)
          ↓
No change → write OK to scraper_log → stop
          ↓
Change detected → extract all PDF links from page
          ↓
For each new PDF:
  Download PDF bytes
  Compute SHA-256 hash
  Check against pdf_hashes table → already seen? skip
  Upload to Supabase Storage /raw-pdfs/{site_id}/{YYYY-MM}/{hash}.pdf
  Write to pdf_ingestion_log
  POST to /api/webhooks/new-pdf on main app (triggers PDF pipeline)
          ↓
Write result to scraper_log (site_id, status, new_pdfs_found, duration_ms)
```

---

## Where Everything Lives

| Concern | Solution | Why |
|---|---|---|
| Cron scheduling | Railway native cron jobs | Survives deploys and restarts. node-cron dies when Railway restarts the service — Railway cron jobs do not. |
| Hash store (change detection) | Supabase PostgreSQL (`scraper_log.content_hash`) | Railway filesystem is ephemeral — resets on every deploy. A JSON file hash store means every restart looks like every site changed. PostgreSQL persists forever. |
| PDF storage | Supabase Storage | Consistent with what the PDF pipeline expects. No second storage service. |
| Scraper service | Separate Railway service | Completely isolated from the Next.js web app. Crashes, restarts, and deployments of the scraper do not affect the main app. |
| Logging | Supabase `scraper_log` table | Admin dashboard Site Health reads from this table. Without it the health screen shows nothing. |

---

## Deployment — Four Separate Railway Cron Services

The scraper does not run as a long-lived `node cron.js` process.
It runs as four separate Railway cron jobs — one per priority tier.
Each cron job starts the process, runs the scrape, and exits.

Railway cron jobs fire on schedule no matter what. They do not depend
on a running process. If the previous run is still going when the next
one fires, Railway starts a new instance — they run in parallel safely
because the hash check in Supabase is atomic.

**Create four services in Railway dashboard — all pointing to the same scraper repo:**

```
Service: examtracker-scraper-p0
  Start Command: PRIORITY_FILTER=P0 node index.js
  Cron Schedule: 0 */2 * * *       ← every 2 hours
  
Service: examtracker-scraper-p1
  Start Command: PRIORITY_FILTER=P1 node index.js
  Cron Schedule: 0 0,6,12,18 * * * ← every 6 hours

Service: examtracker-scraper-p2
  Start Command: PRIORITY_FILTER=P2 node index.js
  Cron Schedule: 0 1,13 * * *       ← every 12 hours

Service: examtracker-scraper-p3
  Start Command: PRIORITY_FILTER=P3 node index.js
  Cron Schedule: 0 6 * * *          ← once daily at 6 AM IST
```

All four share the same environment variables.
All four write to the same `scraper_log` table.
None of them stay running between runs.

---

## Priority Tiers

How often a site is scraped is based on how frequently it posts new
notifications and how critical missing one would be.

| Priority | Sites | Interval | Why this frequency |
|---|---|---|---|
| **P0** | SSC, UPSC, IBPS, SBI, RBI, RRB (all 21 boards) | Every 2 hours | Highest volume, largest user base. SSC CGL notification can attract 3 crore applicants. Missing it for even 4 hours = trust destroyed. |
| **P1** | State PSCs (22 states), Defence (NDA/CDS/CAPF), Teaching (CTET/KVS/NVS), AIIMS, ESIC | Every 6 hours | High importance, but these orgs post less frequently. 6 hours is sufficient. |
| **P2** | Maharatna/Navratna PSUs, High Courts, DMRC, AAI, Port Trusts | Every 12 hours | Post infrequently. Missing by 12 hours is acceptable. |
| **P3** | Niche central ministries, obscure state departments, rarely updated orgs | Once daily | Low traffic sites, rarely post. Daily check is fine. |

---

## Change Detection — How New Notifications Are Spotted

The scraper does not download every PDF on every run. That would be
thousands of redundant downloads every day. Instead it detects
**when the page has changed** and only then extracts PDFs.

**How it works:**

1. Fetch the site's notification page HTML
2. Strip noise — remove `<script>`, `<style>`, nav, header, footer, ads
3. Focus on the notification section — tables, `.recruitment`, `#notices`, `ul li a` links
4. Hash the remaining text content with MD5
5. Compare against the stored hash in `scraper_log` for this site
6. If hash matches → nothing new → write `status = NO_CHANGE` to scraper_log → stop
7. If hash differs → something changed → proceed to PDF extraction → update stored hash

**Why MD5 and not SHA-256 for page hashing?**

SHA-256 is for security. MD5 is for fast equality comparison. A page
content hash is not a security operation — it just needs to detect
whether two strings are the same. MD5 is faster and the output is
shorter. SHA-256 is used for PDF deduplication (where a collision
would cause a real problem — skipping a new PDF that looks identical).

**Why does this avoid false positives?**

Government sites update their pages constantly — timestamps change,
ads rotate, banners swap. By stripping noise before hashing, the hash
only changes when the notification content itself changes — not when
a banner image rotates or a timestamp updates.

---

## PDF Deduplication — Why SHA-256 on the PDF Bytes

The same notification PDF is often published across multiple sites.
SSC CGL is linked from ssc.gov.in and all 21 regional SSC sites.
Without deduplication you would parse 22 identical PDFs and create
22 duplicate exam records.

**How it works:**

1. Download PDF bytes
2. Compute SHA-256 of the raw bytes (not the URL — the actual content)
3. Check `pdf_hashes` table: `SELECT id FROM pdf_hashes WHERE hash = $1`
4. If found → this exact PDF was already processed → skip completely
5. If not found → new PDF → upload to Supabase Storage → insert into pdf_hashes → proceed

**Why SHA-256 and not MD5 here?**

PDF deduplication is a real correctness concern. If two different PDFs
accidentally produce the same hash (a collision), a real new exam gets
silently skipped — a user misses a notification. SHA-256 has no known
collisions. The extra compute time is irrelevant for a file download.

---

## The pdf_hashes Table

```sql
CREATE TABLE pdf_hashes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash        CHAR(64) NOT NULL UNIQUE,  -- SHA-256 hex string
  source_url  TEXT NOT NULL,             -- Original URL where PDF was found
  site_id     VARCHAR(100) NOT NULL,     -- Which site found it first
  r_path      TEXT NOT NULL,             -- Path in Supabase Storage
  found_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_pdf_hashes_hash ON pdf_hashes(hash);
```

---

## The scraper_log Table

Every run — whether it found new PDFs or not — writes a row here.
This is what powers the Site Health screen in the admin dashboard.

```sql
CREATE TABLE scraper_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         VARCHAR(100) NOT NULL,
  scraped_at      TIMESTAMPTZ DEFAULT NOW(),
  status          VARCHAR(20) NOT NULL,
  -- OK | NO_CHANGE | ERROR | BLOCKED | TIMEOUT
  content_hash    CHAR(32),
  -- MD5 of the notification section — stored here, not in a file
  -- This IS the hash store. Compare new hash against this column.
  new_pdfs_found  SMALLINT DEFAULT 0,
  duration_ms     INTEGER,
  error_message   TEXT,
  http_status     SMALLINT
  -- 200, 403, 404, 500 etc — useful for spotting government site changes
);

CREATE INDEX idx_scraper_log_site_id  ON scraper_log(site_id);
CREATE INDEX idx_scraper_log_scraped  ON scraper_log(scraped_at DESC);
```

**The hash is stored in scraper_log, not a separate table.**
To get the last known hash for a site, query:

```sql
SELECT content_hash FROM scraper_log
WHERE site_id = $1
ORDER BY scraped_at DESC
LIMIT 1;
```

---

## The pdf_ingestion_log Table

Every PDF that enters the pipeline gets a row here. This tracks it
from discovery through parsing.

```sql
CREATE TABLE pdf_ingestion_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         VARCHAR(100) NOT NULL,
  source_url      TEXT NOT NULL,
  pdf_hash        CHAR(64) NOT NULL REFERENCES pdf_hashes(hash),
  storage_path    TEXT NOT NULL,
  -- Path in Supabase Storage
  link_text       TEXT,
  -- Anchor text of the link that pointed to this PDF
  context_text    TEXT,
  -- Surrounding paragraph text — gives Claude context before opening PDF
  status          VARCHAR(20) DEFAULT 'QUEUED',
  -- QUEUED | PROCESSING | PARSED | FAILED | DUPLICATE
  discovered_at   TIMESTAMPTZ DEFAULT NOW(),
  parsed_at       TIMESTAMPTZ,
  exam_id         UUID REFERENCES exams(id)
  -- Filled in after parsing succeeds and exam record is created
);
```

---

## Two Fetch Strategies

Government sites fall into two categories based on how they render
their notification pages.

**Static HTML (Cheerio) — used for ~80% of sites**

Most government sites are plain HTML. The notification table is in
the raw HTML response. Cheerio parses it instantly with no browser
overhead.

```
Axios GET request → HTML response → Cheerio parse → extract links
Time per site: ~500ms–2s
```

**JavaScript-rendered (Playwright) — used for ~20% of sites**

Some sites load their notification list via JavaScript after the
initial page load. A plain HTML request returns an empty table.
Playwright launches a headless Chromium browser, waits for the
JavaScript to finish executing, then extracts the fully rendered HTML.

```
Playwright → launch page → wait for networkidle → extract HTML → Cheerio parse
Time per site: ~5s–15s
```

Sites are marked `scrape_method: "js_render"` in `sites.json` when
they need Playwright. Everything else uses Cheerio.

**The scraper initialises one Playwright browser instance per run
and reuses it across all JS-rendered sites in that run.** Opening
and closing a browser per site would be extremely slow.

---

## RSS Feeds — When Available, Always Prefer

About 15% of sites publish an RSS feed of their notifications.
RSS is more reliable than HTML scraping — it is a structured data
format that does not break when the website redesigns, and it
explicitly lists new items with timestamps.

When a site has `has_rss: true` in its config, the scraper fetches
the RSS feed instead of parsing HTML. The feed items are hashed
collectively — if the list of item links changes, something is new.

---

## Supabase Storage Structure

All PDFs are stored in Supabase Storage under a consistent path:

```
/raw-pdfs/{site_id}/{YYYY}/{MM}/{sha256_hash}.pdf
```

Examples:
```
/raw-pdfs/ssc/2026/03/a3f8c2d1e4b5...pdf
/raw-pdfs/upsc/2026/03/9b7e1a2c5f4d...pdf
/raw-pdfs/rrb_ahmedabad/2026/03/2c4a8b1e7f9d...pdf
```

**Why hash as filename?**
- Guarantees uniqueness — no overwriting
- Makes deduplication check implicit — if the file exists, the hash was already processed
- Makes the path deterministic — you can reconstruct the path from the hash

---

## What Happens After a New PDF Is Found

The scraper's job ends when it successfully uploads the PDF to
Supabase Storage. It then fires a webhook to hand off to the
PDF parsing pipeline.

```
POST https://examtracker.in/api/webhooks/new-pdf
Header: x-scraper-secret: YOUR_SECRET

Body:
{
  "site_id": "ssc",
  "site_name": "Staff Selection Commission",
  "category": "SSC",
  "state": null,
  "source_url": "https://ssc.gov.in/...notification.pdf",
  "storage_path": "/raw-pdfs/ssc/2026/03/a3f8c2d1...pdf",
  "link_text": "Recruitment Notice for SSC CGL 2025",
  "context_text": "Staff Selection Commission invites applications...",
  "pdf_hash": "a3f8c2d1e4b5...",
  "ingestion_log_id": "uuid-of-pdf_ingestion_log-row",
  "scraped_at": "2026-03-01T10:30:00.000Z"
}
```

The PDF pipeline API route receives this, picks up the PDF from
Supabase Storage using `storage_path`, and begins the 7-stage
parsing process. The scraper never needs to know what happened next.

---

## Handling Blocked and Failing Sites

Government sites block scrapers occasionally. The scraper handles
this gracefully — it never crashes the entire run because one site
returned 403.

| HTTP Response | What Scraper Does | scraper_log status |
|---|---|---|
| 200 OK | Parse HTML normally | OK or NO_CHANGE |
| 403 Forbidden | Log and skip — do not retry in same run | BLOCKED |
| 404 Not Found | The page moved — log for manual investigation | ERROR |
| 429 Too Many Requests | Wait 60 seconds, retry once, then skip | BLOCKED |
| 5xx Server Error | Government server down — log and skip | ERROR |
| Timeout (>30s) | Log and skip | TIMEOUT |
| HTML instead of PDF | Site requires login for PDF — log | BLOCKED |

**P0 site blocked for 2+ consecutive runs → alert email sent to you via Resend immediately.**

This alert is triggered by a pg_cron job that runs every hour and checks:

```sql
SELECT site_id FROM scraper_log
WHERE site_id IN (SELECT id FROM sites WHERE priority = 'P0')
  AND scraped_at > NOW() - INTERVAL '6 hours'
GROUP BY site_id
HAVING COUNT(*) FILTER (WHERE status NOT IN ('OK','NO_CHANGE')) = COUNT(*)
-- All recent runs for this P0 site have failed
```

---

## Respecting Government Servers

Government sites are public infrastructure. The scraper must be
a responsible citizen:

- **User-Agent:** `ExamTrackerBot/1.0 (+https://examtracker.in/bot)` — identifies itself honestly
- **Request delay:** 2 seconds between requests to the same site
- **Concurrency:** Maximum 3 sites scraped in parallel — never hammers one server
- **Timeout:** 30 seconds max per request — does not hang indefinitely
- **Retry policy:** Maximum 1 retry per failed request — never spams a struggling server
- **No login bypass:** If a site requires login to access PDFs, the scraper marks it BLOCKED and stops — it does not attempt to bypass authentication

---

## Sites Configuration (`sites.json`)

Each site in the config has these fields:

```json
{
  "id": "ssc",
  "name": "Staff Selection Commission",
  "short_name": "SSC",
  "url": "https://ssc.gov.in",
  "notification_page": "https://ssc.gov.in/recruitment",
  "priority": "P0",
  "scrape_interval_hrs": 2,
  "scrape_method": "html_parse",
  "has_rss": false,
  "rss_url": null,
  "category": "SSC",
  "state": null,
  "notes": "Main recruitment page. Tables with PDF links."
}
```

`scrape_method` options:
- `html_parse` — Cheerio on raw HTML response (fast, default)
- `js_render` — Playwright headless browser (for JS-heavy sites)
- `rss` — RSS feed parsing (most reliable when available)
- `manual` — Site does not support automation, data entered manually in admin dashboard

---

## Environment Variables

```env
# Supabase — for hash store, scraper_log, and PDF storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Main app webhook — triggers PDF parsing pipeline
PARSING_WEBHOOK_URL=https://examtracker.in/api/webhooks/new-pdf
SCRAPER_WEBHOOK_SECRET=your-secret-key

# Alert email — where to send P0 failure alerts
ALERT_EMAIL=you@examtracker.in

# Scrape config
PRIORITY_FILTER=P0           # Set per Railway service
SCRAPE_CONCURRENCY=3
REQUEST_DELAY_MS=2000
REQUEST_TIMEOUT_MS=30000
LOG_LEVEL=info
```

No R2. No Redis. No BullMQ. Just Supabase and the main app webhook.

---

## Railway Deployment

```toml
# railway.toml — same file used by all 4 cron services
[build]
builder = "nixpacks"
buildCommand = "npm install && npx playwright install chromium --with-deps"

[deploy]
restartPolicyType = "always"
```

**Each of the 4 Railway services sets its own `PRIORITY_FILTER` env var.**
All other env vars are shared via Railway's shared variables feature.

The start command for each service is `node index.js`.
Railway's cron schedule handles the timing — not node-cron.
The process starts, runs, and exits. Railway starts it again on schedule.

---

## Quick Start (Local Dev)

```bash
cd scraper/
npm install
npx playwright install chromium

cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
# Leave PARSING_WEBHOOK_URL empty for local dev
# New PDFs will be written to ./data/parse_queue.jsonl instead

# Run P0 sites only (fast test — 7 sites)
PRIORITY_FILTER=P0 node index.js

# Run a single specific site
SITE_ID=ssc node index.js

# Run all priorities
PRIORITY_FILTER=P0,P1,P2,P3 node index.js
```

---

## What Was Deliberately Left Out

**No BullMQ or Redis.** The scraper is a short-lived process that
starts, runs through its site list, and exits. There is no persistent
queue needed. The webhook to the PDF pipeline is fire-and-forget.
If the webhook fails, the pdf_ingestion_log row stays as QUEUED
and a recovery cron in the main app picks it up.

**No Cloudflare R2.** Supabase Storage handles all PDF storage.
Using two different storage services for the same files creates
inconsistency and confusion. One storage, one path format, done.

**No node-cron inside the process.** Railway cron jobs handle
scheduling. The scraper process does not need to know about time
or schedules — it just runs and exits. This is simpler and more
reliable than a long-lived process managing its own schedule.

---

## Setup Checklist

- [ ] Create `pdf_hashes` table in Supabase
- [ ] Create `scraper_log` table in Supabase (with `content_hash` column)
- [ ] Create `pdf_ingestion_log` table in Supabase
- [ ] Create `raw-pdfs` bucket in Supabase Storage (set to private)
- [ ] Deploy scraper as a Railway service connected to the scraper folder
- [ ] Create 4 Railway cron services with correct `PRIORITY_FILTER` and schedule per tier
- [ ] Add all environment variables to Railway shared variables
- [ ] Build `/api/webhooks/new-pdf` route in main Next.js app
- [ ] Test: run `PRIORITY_FILTER=P0 node index.js` locally → verify scraper_log row written → verify PDF appears in Supabase Storage → verify webhook fires
- [ ] Test: run same command twice → verify second run writes NO_CHANGE, no duplicate PDF
- [ ] Test: manually corrupt the hash in scraper_log → verify next run re-detects as changed