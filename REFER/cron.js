/**
 * ExamTracker Scraper — Cron Schedule Configuration
 *
 * Deploy this with node-cron or as separate cron jobs on your server.
 * Or use Railway.app / Render.com cron jobs with the npm scripts.
 *
 * RECOMMENDED: Run as 4 separate cron jobs with different priority filters
 */

import cron from "node-cron";
import { exec } from "child_process";
import pino from "pino";

const logger = pino({ level: "info" });

/**
 * CRON SCHEDULE BREAKDOWN:
 *
 * P0 sites (SSC, UPSC, IBPS, SBI, RBI, all 21 RRBs):
 *   → Every 2 hours: 0 0,2,4,6,8,10,12,14,16,18,20,22 * * *
 *
 * P1 sites (State PSCs, Defence, Banking additional, Teaching, PSUs):
 *   → Every 6 hours: 0 0,6,12,18 * * *
 *
 * P2 sites (Secondary PSUs, Underrated gems, High Courts):
 *   → Every 12 hours: 0 0,12 * * *
 *
 * P3 sites (Very niche, rarely updated):
 *   → Once daily: 0 6 * * *
 */

// ─── P0: Every 2 hours ───────────────────────────────────────────────────────
cron.schedule(
  "0 */2 * * *",
  () => {
    logger.info("Running P0 scrape (every 2 hrs)...");
    exec(
      "PRIORITY_FILTER=P0 node index.js",
      { cwd: process.cwd() },
      (err, stdout, stderr) => {
        if (err) logger.error({ err: err.message }, "P0 scrape failed");
        else logger.info("P0 scrape complete");
      }
    );
  },
  { timezone: "Asia/Kolkata" }
);

// ─── P1: Every 6 hours ───────────────────────────────────────────────────────
cron.schedule(
  "0 0,6,12,18 * * *",
  () => {
    logger.info("Running P1 scrape (every 6 hrs)...");
    exec(
      "PRIORITY_FILTER=P1 node index.js",
      { cwd: process.cwd() },
      (err) => {
        if (err) logger.error({ err: err.message }, "P1 scrape failed");
        else logger.info("P1 scrape complete");
      }
    );
  },
  { timezone: "Asia/Kolkata" }
);

// ─── P2: Every 12 hours ──────────────────────────────────────────────────────
cron.schedule(
  "0 1,13 * * *",
  () => {
    logger.info("Running P2 scrape (every 12 hrs)...");
    exec(
      "PRIORITY_FILTER=P2 node index.js",
      { cwd: process.cwd() },
      (err) => {
        if (err) logger.error({ err: err.message }, "P2 scrape failed");
        else logger.info("P2 scrape complete");
      }
    );
  },
  { timezone: "Asia/Kolkata" }
);

// ─── P3: Once daily at 6am IST ───────────────────────────────────────────────
cron.schedule(
  "0 6 * * *",
  () => {
    logger.info("Running P3 scrape (daily)...");
    exec(
      "PRIORITY_FILTER=P3 node index.js",
      { cwd: process.cwd() },
      (err) => {
        if (err) logger.error({ err: err.message }, "P3 scrape failed");
        else logger.info("P3 scrape complete");
      }
    );
  },
  { timezone: "Asia/Kolkata" }
);

logger.info("ExamTracker Cron Scheduler started. All 4 tiers active.");
logger.info("P0: every 2hrs | P1: every 6hrs | P2: every 12hrs | P3: daily 6am IST");

/**
 * ALTERNATIVE: Use Railway.app Cron Jobs
 *
 * In your railway.toml or Railway dashboard, create 4 services:
 *
 *   Service 1 — examtracker-scraper-p0
 *     Command: npm run scrape:p0
 *     Cron: 0 *\/2 * * *
 *
 *   Service 2 — examtracker-scraper-p1
 *     Command: PRIORITY_FILTER=P1 node index.js
 *     Cron: 0 0,6,12,18 * * *
 *
 *   Service 3 — examtracker-scraper-p2
 *     Command: PRIORITY_FILTER=P2 node index.js
 *     Cron: 0 1,13 * * *
 *
 *   Service 4 — examtracker-scraper-p3
 *     Command: PRIORITY_FILTER=P3 node index.js
 *     Cron: 0 6 * * *
 */
