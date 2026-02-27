-- ═══════════════════════════════════════════════════════════════════════════════
-- ExamTracker — Scraper Infrastructure Tables
-- Run this AFTER 004_pdf_pipeline.sql
--
-- Architecture (per updated scraper README):
--   Hash store → scraper_log.content_hash (persistent, not a JSON file)
--   PDF storage → Supabase Storage /raw-pdfs/{site_id}/{YYYY}/{MM}/{sha256}.pdf
--   PDF dedup  → pdf_hashes table (SHA-256 on raw bytes)
--   Tracking   → pdf_ingestion_log (one row per PDF entering the pipeline)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Drop and rebuild scraper_log with all required columns ───────────────────
-- The original 001_initial.sql created a simpler version.
-- This replaces it with the full schema per the scraper architecture.

DROP TABLE IF EXISTS scraper_log CASCADE;

CREATE TABLE scraper_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id         VARCHAR(100) NOT NULL,

    -- THIS IS THE HASH STORE — not a JSON file, not Redis,
    -- just this column. Railway filesystem resets on every deploy.
    -- Supabase persists forever.
    content_hash    CHAR(32),
    -- MD5 of the stripped notification section HTML

    -- Run result
    status          VARCHAR(20) NOT NULL,
    -- OK | NO_CHANGE | ERROR | BLOCKED | TIMEOUT
    new_pdfs_found  SMALLINT DEFAULT 0,
    duration_ms     INTEGER,
    http_status     SMALLINT,
    -- Actual HTTP status code from the site (200, 403, 404, 429, 500, etc.)
    error_message   TEXT,

    scraped_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scraper_log_site_id ON scraper_log(site_id);
CREATE INDEX idx_scraper_log_scraped ON scraper_log(scraped_at DESC);
-- For fast "get last hash for site_id" queries
CREATE INDEX idx_scraper_log_site_latest ON scraper_log(site_id, scraped_at DESC);

-- ─── pdf_hashes — SHA-256 deduplication ──────────────────────────────────────
-- One row per unique PDF ever seen.
-- Before uploading any PDF, check if its SHA-256 already exists here.
-- If yes → skip entirely (same PDF published on multiple sites is a common case).

CREATE TABLE pdf_hashes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hash        CHAR(64) NOT NULL UNIQUE,
    -- SHA-256 hex of raw PDF bytes (not the URL — the actual content)
    source_url  TEXT NOT NULL,
    -- URL where this PDF was first discovered
    site_id     VARCHAR(100) NOT NULL,
    -- Which site found it first
    storage_path TEXT NOT NULL,
    -- Full path in Supabase Storage: /raw-pdfs/{site_id}/{YYYY}/{MM}/{hash}.pdf
    found_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_pdf_hashes_hash ON pdf_hashes(hash);

-- ─── pdf_ingestion_log — tracks every PDF through the pipeline ────────────────
-- Created by scraper when a new PDF is discovered.
-- Updated by PDF parser as it processes the file.
-- Displayed in admin dashboard "Parsing Queue" view.

CREATE TABLE pdf_ingestion_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id         VARCHAR(100) NOT NULL,
    source_url      TEXT NOT NULL,
    -- Original URL where this PDF was found
    pdf_hash        CHAR(64) NOT NULL REFERENCES pdf_hashes(hash) ON DELETE CASCADE,
    storage_path    TEXT NOT NULL,
    -- Path in Supabase Storage (same as pdf_hashes.storage_path)
    link_text       TEXT,
    -- Anchor text of the link pointing to this PDF
    context_text    TEXT(1000),
    -- Surrounding paragraph — gives Claude context before parsing
    status          VARCHAR(20) DEFAULT 'QUEUED',
    -- QUEUED | PROCESSING | PARSED | FAILED | SKIPPED
    discovered_at   TIMESTAMPTZ DEFAULT NOW(),
    parsed_at       TIMESTAMPTZ,
    error           TEXT,
    retry_count     SMALLINT DEFAULT 0,
    exam_id         UUID REFERENCES exams(id) ON DELETE SET NULL
    -- Filled in after parsing succeeds and exam row is created
);

CREATE INDEX idx_pdf_ingestion_status   ON pdf_ingestion_log(status);
CREATE INDEX idx_pdf_ingestion_site     ON pdf_ingestion_log(site_id);
CREATE INDEX idx_pdf_ingestion_hash     ON pdf_ingestion_log(pdf_hash);
CREATE INDEX idx_pdf_ingestion_queued   ON pdf_ingestion_log(discovered_at)
    WHERE status = 'QUEUED';

-- ─── Recovery: pick up stuck PROCESSING pdfs ─────────────────────────────────
-- Called by the recovery pg_cron job (already scheduled in 003_notification_cron.sql).
-- Resets any pdf_ingestion_log row stuck in PROCESSING for >15 minutes.

CREATE OR REPLACE FUNCTION recover_stuck_pdf_processing()
RETURNS void AS $$
BEGIN
    UPDATE pdf_ingestion_log
    SET status = 'QUEUED',
        error  = 'Recovered — was stuck in PROCESSING for >15 minutes'
    WHERE status = 'PROCESSING'
      AND parsed_at < NOW() - INTERVAL '15 minutes';

    -- After 3 retries, give up
    UPDATE pdf_ingestion_log
    SET status = 'FAILED',
        error  = COALESCE(error, 'Max retries exceeded')
    WHERE status = 'QUEUED'
      AND retry_count >= 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION recover_stuck_pdf_processing() TO service_role;

-- ─── P0 alert function — fires when a P0 site has failed multiple runs ────────
-- Called by a pg_cron job. Inserts an alert into notification_queue for admin
-- (this is a system-level notification, not a user exam notification).

CREATE OR REPLACE FUNCTION alert_p0_scraper_failures()
RETURNS void AS $$
DECLARE
    v_failed_sites TEXT[];
BEGIN
    SELECT ARRAY_AGG(DISTINCT site_id)
    INTO v_failed_sites
    FROM scraper_log
    WHERE scraped_at > NOW() - INTERVAL '6 hours'
      AND site_id IN (
          -- P0 sites hardcoded list — update this as sites.json changes
          'ssc', 'upsc', 'ibps', 'sbi', 'rbi',
          'rrb_ahmedabad', 'rrb_ajmer', 'rrb_allahabad', 'rrb_bangalore',
          'rrb_bhopal', 'rrb_bhubaneswar', 'rrb_bilaspur', 'rrb_chandigarh',
          'rrb_chennai', 'rrb_gorakhpur', 'rrb_guwahati', 'rrb_jammu',
          'rrb_kolkata', 'rrb_malda', 'rrb_mumbai', 'rrb_muzaffarpur',
          'rrb_patna', 'rrb_ranchi', 'rrb_secunderabad', 'rrb_siliguri',
          'rrb_thiruvananthapuram'
      )
    GROUP BY site_id
    HAVING BOOL_AND(status NOT IN ('OK', 'NO_CHANGE'));
    -- All recent runs for this site have failures (no success or no_change)

    IF v_failed_sites IS NOT NULL AND ARRAY_LENGTH(v_failed_sites, 1) > 0 THEN
        -- Log it — in a full system you'd also queue an admin email here
        RAISE LOG 'P0 SCRAPER ALERT: Failed sites: %', array_to_string(v_failed_sites, ', ');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION alert_p0_scraper_failures() TO service_role;

-- Schedule P0 alert check every hour
SELECT cron.schedule(
    'p0-scraper-alert',
    '0 * * * *',
    $$ SELECT alert_p0_scraper_failures(); $$
);

-- Schedule PDF processing recovery every 15 minutes
SELECT cron.schedule(
    'pdf-processing-recovery',
    '*/15 * * * *',
    $$ SELECT recover_stuck_pdf_processing(); $$
);
