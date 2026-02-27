-- ═══════════════════════════════════════════════════════════════════════════════
-- ExamTracker — PDF Pipeline Schema Additions
-- Run this AFTER 003_notification_cron.sql
-- Adds columns needed to track parsing pipeline metadata per exam.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Add pipeline metadata columns to exams ───────────────────────────────────
-- These are written by the Python PDF parser after Claude Haiku extraction.
-- Admin queue uses pipeline_confidence to decide if Quick Approve is eligible.

ALTER TABLE exams
    ADD COLUMN IF NOT EXISTS pipeline_confidence  NUMERIC(4,3),
    -- 0.000 – 1.000 weighted confidence score (see PDF pipeline architecture doc)
    -- ≥ 0.90 → DRAFT (Quick Approve eligible)
    -- 0.70–0.89 → DRAFT (Full review recommended)
    -- < 0.70 → NEEDS_REVIEW (Full review required)
    -- NULL → manually entered (always trustworthy, no confidence needed)

    ADD COLUMN IF NOT EXISTS pipeline_metadata   JSONB,
    -- Per-field confidence scores from the parser, e.g.:
    -- { "application_end": 0.85, "required_qualification": 0.80,
    --   "vacancies_by_category": 0.75, "age_limits": 0.90,
    --   "extraction_methods": { "application_end": "REGEX", "qualification": "AI" } }

    ADD COLUMN IF NOT EXISTS source_snippets     JSONB,
    -- Raw text snippets used for each field (admin verification aid), e.g.:
    -- { "application_end": "Last date of application: 15/03/2026",
    --   "vacancies": "UR-1200, OBC-847, SC-423, ST-212, EWS-282" }

    ADD COLUMN IF NOT EXISTS extraction_method   VARCHAR(30) DEFAULT 'MANUAL';
    -- 'MANUAL' | 'REGEX' | 'AI' | 'OCR' | 'INFERRED'
    -- OCR extraction requires closer admin review (flagged in admin UI)

-- ─── Index for pipeline-based admin queue sorting ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_exams_pipeline_confidence
    ON exams(pipeline_confidence)
    WHERE pipeline_confidence IS NOT NULL AND is_active = FALSE;

-- ─── Update scraper_log with richer status tracking ───────────────────────────
ALTER TABLE scraper_log
    ADD COLUMN IF NOT EXISTS exam_id          UUID REFERENCES exams(id) ON DELETE SET NULL,
    -- Set after the exam row is created from this PDF
    ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(4,3),
    ADD COLUMN IF NOT EXISTS error_details    JSONB,
    ADD COLUMN IF NOT EXISTS retry_count      SMALLINT DEFAULT 0;

-- ─── Unique constraint: one scraper_log row per PDF URL ───────────────────────
-- Prevents the scraper from re-queuing the same PDF on every cron run.
CREATE UNIQUE INDEX IF NOT EXISTS idx_scraper_log_pdf_url
    ON scraper_log(pdf_url)
    WHERE pdf_url IS NOT NULL;
