# ExamTracker India 🎯

**Personal eligibility intelligence for Indian government job aspirants.**

> Never miss a government exam deadline again. Know which exams you can apply for, your category vacancies, and every deadline — all personalized to your profile.

---

## Monorepo Structure

```
EXAM EXTRACTOR/
├── frontend/          # Next.js 14 (App Router) — User-facing web app
├── backend/           # Node.js + Express + TypeScript — REST API
├── scraper/           # Node.js + Playwright — Government site scraper
├── DOCUMENTS/         # Architecture documentation (read-only reference)
└── REFER/             # Design tokens, reference scraper code
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, shadcn/ui, Tailwind CSS, Zustand, Framer Motion |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL via Supabase (Mumbai region) |
| Auth | Supabase Auth — Phone OTP (MSG91) + Magic Link (Resend) + Google OAuth |
| Email | Resend |
| Payments | Razorpay (₹49/month or ₹399/year) |
| Cache | Upstash Redis |
| Jobs | BullMQ on Railway.app |
| Hosting | Vercel (frontend) + Railway.app (backend + jobs) |

---

## Getting Started

### Frontend
```bash
cd frontend
cp .env.local.example .env.local   # fill in your Supabase keys
npm install
npm run dev                         # → http://localhost:3000
```

### Backend
```bash
cd backend
cp .env.example .env               # fill in all service keys
npm install
npm run dev                         # → http://localhost:8000
# Health check: GET http://localhost:8000/health
```

### Scraper
```bash
cd scraper
cp .env.example .env
npm install
npm run scrape:p0                   # Scrape P0 priority sites only
```

---

## Architecture Docs

All architecture decisions are documented in `DOCUMENTS/`:

| Document | Contents |
|---|---|
| `ARCHITECTURE_README.md` | Full engineering bible — DB schema, eligibility engine, API design |
| `examtracker_auth_architecture_README.md` | Auth flows — Phone OTP, Magic Link, Google OAuth |
| `examtracker_admin_dashboard_architecture_README.md` | Admin dashboard — exam CRUD, approval queue |
| `examtracker_notification_architecture_README.md` | Email notifications via Resend |
| `examtracker_pdf_pipeline_architecture_README.md` | PDF parsing — regex + Claude Haiku |
| `ExamTracker_Design_System_PART1_README.md` | Colors, typography (Inter font, #FF6B35 accent) |
| `ExamTracker_Design_System_PART2_README.md` | Component library, screen specs |
| `ExamTracker_9_UX_Moments_README.md` | Critical UX moments — dashboard, onboarding, upgrade |
| `exam_tracker_india_saas_research_report_README.md` | Market research — 35-45M aspirant market |
| `exam_tracker_pricing_model_README.md` | Pricing — freemium + ₹49/month premium |

---

## Development Phases

| Phase | Timeline | Milestone |
|---|---|---|
| **0: Setup** | Week 0 | Supabase + Vercel + Razorpay configured |
| **1: Auth + Onboarding** | Weeks 1–3 | User can register & see personalized exam list |
| **2: Exam DB + Dashboard** | Weeks 4–6 | Core product loop complete |
| **3: Payments + Premium** | Weeks 7–8 | First paying user |
| **4: Growth** | Weeks 9–12 | SEO traffic + Hindi interface |

---

*ExamTracker India — February 2026*
