# ExamTracker India — PDF Parsing Pipeline & Data Schema Architecture

**Document Type:** Technical Reference
**Version:** 1.0
**Date:** February 2026
**Scope:** Automated extraction of structured exam data from government notification PDFs

---

## Overview

When the scraper detects a new notification URL on any of the 142 monitored government websites, it downloads the PDF. That PDF is a raw document in one of many unpredictable formats. The pipeline's job is to convert that raw PDF into a clean, structured row in the `exams` PostgreSQL table — with every eligibility field correctly populated so the matching engine can run against it.

**The Core Challenge:** Government PDFs are written for human readers, not machines. They use inconsistent formats, merged table cells, footnotes for critical eligibility criteria, and different date formats in different PDFs (sometimes in the same PDF). The pipeline must handle all of this reliably.

---

## Contents

1. [Pipeline Architecture Overview](#1-pipeline-overview)
2. [Stage 1: PDF Text Extraction](#2-text-extraction)
3. [Stage 2: Field Extraction — Regex Layer](#3-regex-extraction)
4. [Stage 3: AI Extraction — Claude Haiku Layer](#4-ai-extraction)
5. [Stage 4: Inference & Defaults Layer](#5-inference-layer)
6. [Stage 5: Confidence Scoring](#6-confidence-scoring)
7. [Stage 6: Admin Queue Submission](#7-admin-queue)
8. [Data Schema — Extracted Fields](#8-data-schema)
9. [Error Handling & Fallback Strategy](#9-error-handling)
10. [Implementation Stack](#10-implementation-stack)

---

## 1. Pipeline Overview

```
New PDF URL detected by scraper
         │
         ▼
  Stage 1: Text Extraction (pdfplumber / pdfminer)
         │
         ▼
  Stage 2: Regex Extraction
  ├── Dates: application_end, exam_date, admit_card_date, result_date
  ├── Vacancies: total + category breakdown
  ├── Age limits: per category
  └── Fees: per category
         │
         ▼
  Stage 3: AI Extraction (Claude Haiku)
  ├── Fields regex couldn't confidently extract
  ├── Complex educational qualification requirements
  ├── Post-wise eligibility breakdown
  └── Physical standards (for Police/Defence)
         │
         ▼
  Stage 4: Inference & Defaults
  ├── Standard GOI rules applied where PDF says "as per GOI norms"
  └── Category fills from known exam patterns
         │
         ▼
  Stage 5: Confidence Scoring
  ├── 0.0 – 1.0 score per field
  └── Overall record confidence
         │
         ▼
  Stage 6: Submit to Admin Queue
  ├── confidence < 0.70 → NEEDS_REVIEW (manual check required)
  └── confidence ≥ 0.90 → DRAFT (eligible for Quick Approve)
```

---

## 2. Stage 1: Text Extraction

### Tools

| Tool | Used For | Notes |
|------|---------|-------|
| `pdfplumber` | Primary text extraction + table detection | Best for table extraction from structured PDFs |
| `pdfminer.six` | Fallback for complex PDFs | More robust for PDFs with non-standard structure |
| `pytesseract` + `pdf2image` | OCR fallback for scanned PDFs | Slower; only used when digital extraction fails |

### Text Cleaning Pipeline
After extraction, raw text goes through:
1. Remove header/footer repetition across pages
2. Normalize whitespace and newlines
3. Fix common OCR errors (0 vs O, 1 vs l)
4. Normalize date formats to DD/MM/YYYY before passing to regex

### When to Use OCR
If digital text extraction returns <50 words per page on average, assume the PDF is scanned and fall back to pytesseract. OCR results are flagged in the pipeline with `extraction_method = "OCR"` — these records require closer admin review.

---

## 3. Stage 2: Regex Extraction

Regex extracts well-structured fields that follow predictable patterns across most government PDFs.

### Key Patterns

**Application Dates:**
```python
# Matches: "Last date: 15/03/2026", "Closing date: 15 March 2026"
date_patterns = [
    r'last\s+date[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
    r'closing\s+date[:\s]+(\d{1,2}\s+\w+\s+\d{4})',
    r'application\s+end[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
]
```

**Vacancies:**
```python
# Matches: "Total Vacancies: 2,500" or "Total Posts: 847"
vacancy_patterns = [
    r'total\s+(?:vacancies|posts)[:\s]+(\d[\d,]+)',
    r'(?:UR|General)[:\s]+(\d+).*?(?:OBC|SC|ST)[:\s]+(\d+)',
]
```

**Age Limits:**
```python
# Matches: "Maximum Age: 27 years (30 years for OBC)"
age_patterns = [
    r'maximum\s+age[:\s]+(\d{2})\s+years',
    r'age\s+limit.*?(\d{2})\s+years.*?(?:OBC|SC|ST)',
]
```

**Application Fees:**
```python
# Matches: "Application Fee: Rs. 100/- (SC/ST/PwBD: Nil)"
fee_patterns = [
    r'application\s+fee[:\s]+(?:Rs\.?\s*)?(\d+)',
    r'(?:SC/ST|PwBD|PH)[:\s]+(?:Rs\.?\s*)?(\d+|Nil|Exempt)',
]
```

**Confidence Assignment:** Each regex field gets `0.85` if matched with high-specificity pattern, `0.65` if matched with fallback pattern, `0.0` if no match.

---

## 4. Stage 3: AI Extraction (Claude Haiku Layer)

For fields that regex couldn't confidently extract, the pipeline sends the relevant PDF section to Claude Haiku with a structured prompt.

### When AI Extraction Is Triggered
- Regex confidence for a field < 0.70
- Post-wise eligibility breakdown required (multiple posts with different qualifications)
- Physical standards extraction (complex table structures)
- Educational qualification with stream-specific requirements

### Prompt Structure
```python
prompt = f"""
You are extracting structured data from an Indian government job notification PDF.
Extract the following fields as JSON:
- application_end_date (DD/MM/YYYY format)
- required_qualification (one of: CLASS_10, CLASS_12, ITI, DIPLOMA, GRADUATION, ENGINEERING_GRADUATION, PG)
- required_streams (array or null if any stream accepted)
- vacancies_by_category (object: {{general, obc, sc, st, ews, pwd, ex_servicemen}})
- age_limits (object: {{general, obc, sc_st, ews, pwd_general, ex_serviceman}})

Return ONLY valid JSON. If a field cannot be determined, use null.

PDF text:
{relevant_section}
"""
```

### AI Confidence Scoring
- AI-extracted fields get `0.80` baseline confidence
- Reduced to `0.60` if the extracted value seems unusual (e.g., vacancy count >50,000 for a single exam)
- Boosted to `0.90` if the same value is also found by regex

---

## 5. Stage 4: Inference & Defaults Layer

Some fields are not explicitly stated in PDFs but can be reliably inferred from standard Government of India rules.

| Inference Rule | Example |
|---------------|---------|
| "Age as per GOI rules" → apply standard category relaxations | OBC = general + 3, SC/ST = general + 5 |
| Fee = "as applicable" + exam category = SSC → apply standard SSC fees | General ₹100, SC/ST/PwBD ₹0 |
| Gender restriction = null → no restriction | Most central exams are open to all |
| `nationality_requirement` = null → default to INDIAN | Correct for 95%+ of central exams |

**Inferred fields** are flagged with `extraction_method = "INFERRED"` and get a confidence score of `0.75`.

---

## 6. Stage 5: Confidence Scoring

### Per-Field Confidence

| Extraction Method | Base Confidence | Shown In Admin As |
|------------------|----------------|-------------------|
| REGEX (high-specificity) | 0.85 | 🟢 Green dot |
| AI (Claude Haiku) | 0.80 | 🟡 Amber dot |
| INFERRED (GOI defaults) | 0.75 | 🟡 Amber dot |
| REGEX (fallback) | 0.65 | 🟠 Orange dot |
| NOT FOUND | 0.00 | 🔴 Red dot |

### Overall Record Confidence

The overall record confidence is the weighted average of per-field confidences, with `application_end` weighted 3×, `required_qualification` weighted 2×, and all other fields weighted 1×.

```python
def calculate_record_confidence(field_scores):
    weighted_sum = (
        field_scores['application_end'] * 3 +
        field_scores['required_qualification'] * 2 +
        sum(v for k, v in field_scores.items()
            if k not in ('application_end', 'required_qualification'))
    )
    weighted_count = 3 + 2 + (len(field_scores) - 2)
    return weighted_sum / weighted_count
```

### Queue Routing Based on Confidence

| Overall Confidence | Status Assigned | Admin Action Required |
|------------------|----------------|----------------------|
| ≥ 0.90 | DRAFT | Quick Approve eligible (if `application_end` > 7 days away) |
| 0.70–0.89 | DRAFT | Full form review recommended |
| < 0.70 | NEEDS_REVIEW | Full form review required — fields likely incorrect |
| Missing `application_end` | NEEDS_REVIEW | Cannot process without this critical field |

---

## 7. Stage 6: Admin Queue Submission

After pipeline processing, the record is inserted into the `exams` table with:
- `data_source = 'AUTO'`
- `notification_verified = FALSE`
- `is_active = FALSE`
- `status = 'DRAFT'` or `'NEEDS_REVIEW'`
- `pipeline_confidence = {overall_score}` (stored in JSONB `pipeline_metadata` column)
- `source_snippets = {field: extracted_text_snippet}` (for admin verification)

The admin then sees this record in the Exam Queue at `/admin/queue` and can approve or review it.

---

## 8. Data Schema — Extracted Fields

### Fields Extracted by Pipeline (Maps to `exams` Table)

| Field Group | Fields | Primary Extraction Method |
|------------|--------|--------------------------|
| Core Identity | `name`, `short_name`, `conducting_body`, `category`, `level`, `state_code` | Regex + AI |
| Key Dates | `notification_date`, `application_start`, `application_end`, `exam_date`, `admit_card_date`, `result_date`, `age_cutoff_date` | Regex (high priority) |
| Vacancies | `total_vacancies`, `vacancies_by_category` (JSONB) | Regex + AI for breakdown |
| Age Eligibility | `min_age`, `max_age_general`, `max_age_obc`, `max_age_sc_st`, `max_age_ews`, `max_age_pwd_general`, `max_age_ex_serviceman` | Regex + AI + Inference |
| Education | `required_qualification`, `required_streams`, `min_marks_percentage`, `allows_final_year` | AI (complex) |
| Other Eligibility | `nationality_requirement`, `gender_restriction`, `physical_requirements` (JSONB) | AI + Inference |
| Fees | `application_fee_general`, `application_fee_sc_st`, `application_fee_pwd`, `application_fee_women` | Regex + Inference |
| Source | `official_notification_url`, `data_source` | Provided by scraper |

---

## 9. Error Handling & Fallback Strategy

| Error Scenario | Pipeline Response |
|---------------|------------------|
| PDF download fails | Retry 3× with 5-minute backoff. After 3 failures, add to `failed_downloads` table and alert admin. |
| Text extraction returns empty | Try pdfminer fallback. If still empty, trigger OCR pipeline. Flag as `extraction_method = "OCR"`. |
| AI extraction returns invalid JSON | Retry once. If still invalid, set all AI-extracted fields to confidence 0.0 and mark record NEEDS_REVIEW. |
| `application_end` not found | Always mark NEEDS_REVIEW — this field is mandatory. Admin cannot quick-approve without it. |
| Duplicate URL detected | Check `official_notification_url` uniqueness before inserting. If duplicate, check if existing record needs update (e.g., corrigendum). |

---

## 10. Implementation Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| PDF text extraction | `pdfplumber` (primary), `pdfminer.six` (fallback) | Python libraries |
| OCR fallback | `pytesseract` + `pdf2image` | Slower; only for scanned PDFs |
| Regex extraction | Python `re` module | Custom patterns per field type |
| AI extraction | Claude Haiku via Anthropic API | Cost-optimized model for bulk extraction |
| Job queue | BullMQ on Railway.app | Same infrastructure as notification jobs |
| PDF storage | Supabase Storage (S3-compatible) | Cache source documents for verification |
| Database | PostgreSQL via Supabase | Same as rest of stack |
| Scraper | Node.js with Playwright | For sites requiring JavaScript rendering |

**Cost Estimate (at 50 new PDFs/day):**
- Claude Haiku: ~₹0.50/PDF × 50 PDFs/day = ₹25/day = ~₹750/month
- Supabase Storage: ~₹500/month for PDF storage
- Railway.app workers: ~₹1,500/month

---

*ExamTracker India — PDF Pipeline Architecture v1.0 — February 2026*
