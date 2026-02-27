/**
 * ExamTracker — Railway Cron Setup
 *
 * The scraper does NOT use node-cron. It runs as 4 separate Railway cron services.
 * Each service starts, runs, and exits. Railway starts it again on schedule.
 *
 * WHY NOT node-cron:
 *   Railway restarts services on deploy. A long-lived process with node-cron
 *   loses its schedule on every restart. Railway native cron jobs fire on schedule
 *   regardless of restarts or deployments.
 *
 * SETUP IN RAILWAY DASHBOARD:
 *   Create 4 separate Railway services — all connected to the same scraper repo (REFER/).
 *   Set different env vars and cron schedules per service.
 *
 * ─── Service 1: examtracker-scraper-p0 ───────────────────────────────────────
 *   Source:        This repo (REFER/ folder)
 *   Start Command: node index.js
 *   Schedule:      0 *\/2 * * *     (every 2 hours)
 *   PRIORITY_FILTER=P0
 *
 * ─── Service 2: examtracker-scraper-p1 ───────────────────────────────────────
 *   Start Command: node index.js
 *   Schedule:      0 0,6,12,18 * * *   (every 6 hours)
 *   PRIORITY_FILTER=P1
 *
 * ─── Service 3: examtracker-scraper-p2 ───────────────────────────────────────
 *   Start Command: node index.js
 *   Schedule:      0 1,13 * * *   (every 12 hours)
 *   PRIORITY_FILTER=P2
 *
 * ─── Service 4: examtracker-scraper-p3 ───────────────────────────────────────
 *   Start Command: node index.js
 *   Schedule:      0 6 * * *   (daily at 6 AM IST)
 *   PRIORITY_FILTER=P3
 *
 * SHARED ENV VARS (set on all 4 services via Railway shared variables):
 *   SUPABASE_URL=
 *   SUPABASE_SERVICE_ROLE_KEY=
 *   PARSING_WEBHOOK_URL=https://your-app.railway.app/api/webhooks/new-pdf
 *   SCRAPER_WEBHOOK_SECRET=   (same as INTERNAL_API_SECRET in the main app)
 *   SCRAPE_CONCURRENCY=3
 *   REQUEST_DELAY_MS=2000
 *   REQUEST_TIMEOUT_MS=30000
 *   LOG_LEVEL=info
 *
 * EACH SERVICE SETS ITS OWN:
 *   PRIORITY_FILTER=P0   (or P1, P2, P3)
 *
 * That is it. No node-cron. No long-lived process. No missed runs on restart.
 */

// This file is documentation only.
// The actual scraper entry point is index.js
// Run locally with: PRIORITY_FILTER=P0 node index.js
