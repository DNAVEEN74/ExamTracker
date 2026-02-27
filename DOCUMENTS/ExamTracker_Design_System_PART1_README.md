# ExamTracker India — UX/UI Design System Part 1
## Design Philosophy, Colors & Typography

**Document Type:** Design System Reference (Sections 1–3)
**Version:** 1.0
**Date:** February 2026
**Continues In:** `ExamTracker_Design_System_PART2.docx.pdf` (Component Library, Screen Designs, Implementation)

---

## Overview

This document covers the foundational design decisions for ExamTracker India — the philosophy, color system, and typography that underpin every screen. The design is optimized for aspirants checking the app on their commute, during study breaks, and before bed. Every interaction must feel instant, clear, and confidence-building.

---

## Section 1: Design Philosophy & Principles

### 1.1 Core Philosophy: Think Fast, Track Faster

**Three North Star Principles:**

1. **Scannable in 3 seconds** — User should grasp "Do I have new exams? Am I missing a deadline?" at a glance
2. **Clarity over cleverness** — No design jargon, no ambiguous icons. Plain language wins ("You're eligible ✓" not "Match: 100%")
3. **Progressive confidence** — Each screen builds trust by showing immediate value. Onboarding reveals eligibility as you type.

### 1.2 The Claude.ai Inspiration

ExamTracker adapts minimalist design principles from Claude's interface, but optimized for rapid information consumption rather than text conversation:

| Claude Principle | How ExamTracker Applies It |
|-----------------|---------------------------|
| Generous whitespace | Exam cards have 16px padding minimum. Never cramped, even on small screens |
| Dark mode ready | High contrast text, avoid pure white backgrounds. Color palette works in both modes |
| Minimal navigation | Logo left, hamburger menu right (like Claude mobile). No bottom nav conflicting with browser UI |
| Typography hierarchy | Clear size jumps (16px body → 20px headings → 24px page titles). Never subtle 1–2px differences |
| Subtle accent color | Orange (#FF6B35) used sparingly for CTAs and deadlines. Not sprayed everywhere |

**Critical Difference:** Claude serves text conversations. ExamTracker serves scanning exam lists. The minimalism is adapted for rapid information consumption.

---

## Section 2: Color System

### 2.1 Primary Palette — Minimal & Clean

All colors tested for WCAG AA compliance on budget Android screens.

| Color Name | Hex Code | Usage | WCAG |
|-----------|---------|-------|------|
| Background Primary | `#FFFFFF` | Main app background | AAA |
| Background Secondary | `#F8F9FA` | Exam cards, input fields | AAA |
| Text Primary | `#1A1A1A` | Headings, exam names | AAA |
| Text Secondary | `#5C5C5C` | Body text, descriptions | AA |
| Text Tertiary | `#8C8C8C` | Metadata, timestamps | AA |

### 2.2 Accent Colors — Energy & Opportunity

| Color Name | Hex Code | Usage |
|-----------|---------|-------|
| Accent Primary | `#FF6B35` | Primary CTAs ("Track This Exam"), deadline badges (3–7 days), hover states |
| Accent Light | `#FFF5F2` | Deadline alert backgrounds, selected mode card in onboarding |
| Accent Dark | `#E65A2E` | Button hover states, pressed states |

### 2.3 Status Colors

| Status | Icon | Hex Code | When to Use |
|--------|------|---------|-------------|
| Success ✓ | Green | `#10B981` | Eligibility confirmed, onboarding complete, application submitted |
| Warning ⚠ | Amber | `#F59E0B` | 7 days until deadline, age relaxation applies, partial eligibility |
| Error ✗ | Red | `#EF4444` | Not eligible, deadline passed, payment failed, urgent (<3 days) |
| Info ℹ | Blue | `#3B82F6` | Tooltips, "Why we ask this" explanations, premium feature callouts |

---

## Section 3: Typography System

### 3.1 Font Family

**Primary Font Stack:**
```css
font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Why Inter?**
- Excellent readability at small sizes — crucial for budget Android screens
- Open-source with no licensing costs
- Supports Devanagari script — Hindi-ready for v2
- System font fallbacks load instantly (every KB matters on slow 3G networks)

### 3.2 Type Scale & Usage

| Token | Size | Weight | Line Height | Usage | Example |
|-------|------|--------|-------------|-------|---------|
| `4xl` | 36px | 700 | 1.2 | Landing page hero | "Never Miss a Deadline" |
| `3xl` | 30px | 700 | 1.3 | Onboarding titles | "What should we call you?" |
| `2xl` | 24px | 600 | 1.4 | Dashboard page titles | "New for You" |
| `xl` | 20px | 600 | 1.5 | Section headings | "Eligible Exams" |
| `lg` | 18px | 600 | 1.5 | Exam card titles | "SSC CGL Tier 1 2026" |
| `base` | 16px | 400 | 1.6 | **DEFAULT body text** | Exam descriptions |
| `sm` | 14px | 400 | 1.5 | Metadata, timestamps | "Posted 2 days ago" |
| `xs` | 12px | 400 | 1.4 | Captions, ad labels | "Sponsored" |

---

## Design Rationale

This design system is built for **India's exam aspirant demographic**:

- **80%+ users on budget Android phones** (Redmi, Realme, Samsung A-series) — every pixel and kilobyte matters
- **Checking the app in transit** — information must be scannable in 3 seconds or less
- **High emotional stakes** — clean, calm design reduces anxiety rather than adding to it
- **First-generation aspirants** — no design jargon, no ambiguous UI patterns

---

*Continue to Part 2 for Component Library, Screen Designs (30+ screens), Ad Integration Strategy, and Implementation Checklist.*

*Living document — update with each design iteration.*
