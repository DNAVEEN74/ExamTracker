# ExamTracker India — UX/UI Design System Part 2
## Component Library, Screen Designs & Implementation

**Document Type:** Design System Reference (Sections 4–7)
**Version:** 1.0
**Date:** February 2026
**See Also:** `ExamTracker_Design_System_PART1.docx.pdf` (Philosophy, Colors, Typography)

---

## Overview

This document covers the practical implementation of ExamTracker India's design system — the component library, all 30+ screen specifications with pixel-perfect details, ad integration strategy, and the developer implementation checklist.

---

## Section 4: Component Library

### 4.1 Exam Card (Primary Component)

The most-seen component in the entire application. Must be scannable in 3 seconds and tappable with ease on mobile.

**Information Hierarchy (top to bottom):** Name → Deadline → Eligibility → CTA

**Card Anatomy:**

| Element | Specification |
|---------|--------------|
| Container | Background `#F8F9FA`, border `1px solid #E5E7EB`, radius `12px`, padding `16px`, margin-bottom `16px`. Hover: border `#FF6B35 (2px)` + shadow `0 4px 12px rgba(0,0,0,0.08)` |
| Exam Name | Inter Semibold 18px (`#1A1A1A`), line-height 1.4, max 2 lines (truncate with ...) |
| Deadline Badge | Top-right corner, Inter Medium 14px. Logic: >7 days = gray (`#8C8C8C`), 3–7 days = orange (`#FF6B35`), <3 days = red (`#EF4444`) + pulsing animation |
| Eligibility Status | Icon + text inline (left-aligned). Eligible = ✓ green, Not Eligible = ✗ red, Partial = ⚠ orange |
| Metadata Row | Inter Regular 14px (`#8C8C8C`). Shows: "SSC \| 2,500 vacancies \| Posted 2 days ago" |
| Primary CTA | NOT TRACKED: Orange button "Track This Exam". TRACKED: Gray outline "Tracking ✓". Height: 44px minimum (WCAG 2.5.5 AA) |

**Card States:**

| State | Visual Change | When |
|-------|--------------|------|
| Default | Standard styling | Normal display |
| Hover | Orange border (2px) + shadow lift | Mouse over / tap hold (300ms) |
| New (unread) | Orange vertical bar (4px) on left edge | Exam appeared in last 3 days + not yet tapped |
| Deadline urgent | Red badge pulses (0.8s interval) | Application closes in <3 days |
| Disabled | Opacity 0.5, strikethrough on exam name | Application deadline passed |

### 4.2 Buttons

| Button Type | Default State | Hover State | Usage |
|------------|--------------|------------|-------|
| Primary CTA | BG: `#FF6B35`, Text: `#FFFFFF`, radius: 8px, height: 44px | BG: `#E65A2E`, shadow: `0 2px 8px rgba(255,107,53,0.24)` | "Track Exam", "Continue", "Get Started" |
| Secondary | BG: transparent, Text: `#1A1A1A`, border: `1px #D1D5DB`, height: 44px | BG: `#F8F9FA`, border: `1px #8C8C8C` | "View Details", "Go Back", "Cancel" |
| Ghost (Text only) | BG: transparent, Text: `#5C5C5C`, no border | Text: `#1A1A1A`, underline | "Skip", "Learn More", "Not Interested" |
| Disabled | BG: `#F1F3F5`, Text: `#B8B8B8`, border: `1px #E5E7EB`, cursor: not-allowed | No change | During loading, validation failures |

**CRITICAL:** All buttons must have minimum 44px height for mobile touch targets (WCAG 2.5.5 AA).

---

## Section 5: Complete Screen Designs (30+ Screens)

### 5.1 Landing Page (Pre-Login)

**Mobile Layout (320px–768px):**

| Section | Specification |
|---------|--------------|
| Header | Height: 64px, sticky on scroll. Left: Logo + "ExamTracker" wordmark (Inter Bold 20px). Right: Hamburger icon (24×24px). Border-bottom: `1px solid #E5E7EB` |
| Hero | Padding: 48px 24px. Background: gradient `#FFFFFF → #FFF5F2`. H1: "Never Miss a Government Exam Deadline Again" (Inter Bold 36px). Subhead: Inter Regular 18px (`#5C5C5C`). CTA: Primary "Get Started Free" (full width) |
| Trust Indicators | 3 stats: "5000+ Exams Tracked", "100% Free Core Features", "DPDPA 2023 Compliant". Number: Inter Bold 32px (`#FF6B35`). Label: Regular 16px |

### 5.2 Onboarding Flow (9 Screens)

The onboarding flow must feel like a conversation, not a form. Razorpay-inspired progressive disclosure.

**Screen 0 — Phone Registration:**
- Welcome message: "Welcome to ExamTracker 👋" (Inter Bold 30px)
- Phone input: height 56px, border `2px solid #D1D5DB` (focus: `#FF6B35`), prefix "+91" fixed
- CTA: "Send OTP" (disabled until 10 digits entered)
- Secondary: "Or continue with Google"
- OTP modal: 6 separate 56×56px boxes, auto-focus, auto-submit on 6th digit
- Error: Red border on all boxes + "Incorrect OTP. 2 attempts remaining"

**Screen 1 — Name:**
- Progress: 1/9 (bar appears from this screen)
- Single first-name input, autofocus on load, max 50 characters
- CTA disabled until name entered

**Screen 2 — Mode Selection (Critical Decision Point):**
- 3 mode cards, stacked vertically on mobile (min height 140px, padding 24px)
- Selected state: border `#FF6B35`, background `#FFF5F2`
- Card 1 — Focused 🎯: "I know which exams I want. Just track those."
- Card 2 — Discovery 🔍: "Show me all government exams I'm eligible for right now." + "Most Popular" badge
- Card 3 — Vacancy-Aware ✅: "Only show exams where MY category actually has vacancies." + "Unique Feature" badge (blue)

**Screen 3 — Date of Birth (First Wow Moment):**
- Single scrollable date wheel (iOS/Android native style), default age 25
- INSTANT feedback on selection: Green card `#D1FAE5` showing "You are currently 26 years old — Still eligible for SSC CGL, IBPS PO, Railway NTPC, and 47 more central government exams"
- Age-specific messaging: >30 shows UPSC/State PSC, >40 shows teaching & PSU options

---

## Section 6: Ad Integration Strategy

**Critical Balance:** Ads must generate ₹15+ lakh/month at 500K MAU while NOT destroying user experience.

### 6.1 Ad Placement Zones

| Location | Format | Frequency | Design Rules |
|----------|--------|-----------|--------------|
| Home feed (between exam cards) | Native ad (styled like exam card) | 1 ad per 7 exam cards | Same border/padding/radius as exam card. "Sponsored" label 12px `#9CA3AF` top-right. BG: `#FAFBFC` (slightly different from `#F8F9FA`) |
| Exam detail page (bottom) | Banner 320×50 (mobile), 728×90 (desktop) | 1 banner per detail view | Fixed to bottom (sticky). Close button top-right. Appears AFTER user scrolls to Apply button |
| Search results | Native ad (coaching institute lead gen) | Top 2 results only | Yellow highlight border `#FEF3C7`. "Promoted" tag. Verified institutes only |

### 6.2 Ad Frequency Capping (Anti-Annoyance Rules)

- Maximum 3 ads per session (session = continuous 15 min of activity)
- Never show same ad twice in same session
- First-time users: NO ads in first 5 minutes (onboarding + initial browse)
- Premium users: ZERO ads — even after cancelling and reverting to free
- Interstitial ads: NEVER (destroys mobile UX)

---

## Section 7: Implementation Checklist

### Development Handoff

1. Set up design tokens file (`colors.js`, `typography.js`, `spacing.js`) matching Sections 2–3
2. Build component library in Storybook (Exam Card, Buttons, Form Inputs) from Section 4
3. Implement responsive breakpoints: Mobile-first (320px+), Tablet (768px+), Desktop (1024px+)
4. Test on actual budget Android devices (Redmi, Realme, Samsung A-series) — not just Chrome DevTools
5. Verify WCAG AA compliance: 4.5:1 contrast for text, 44px touch targets, keyboard navigation
6. Test onboarding flow with 10 real users before launch (target completion rate >80%)
7. Implement ad integration exactly as specified in Section 6 (frequency caps, visual design)

### Performance Budget (3G, Budget Android)

| Metric | Target |
|--------|--------|
| First Contentful Paint (FCP) | < 1.8s |
| Time to Interactive (TTI) | < 3.5s |
| Total Page Size (Homepage) | < 500KB |
| Lighthouse Performance Score | > 90 |

---

*This document is a living specification. Update with each design iteration.*
