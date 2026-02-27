# ExamTracker India — Authentication & Registration Architecture

**Document Type:** Technical Reference
**Version:** 1.0
**Date:** February 2026
**Auth System:** Fully Passwordless (Phone OTP + Magic Link + Google OAuth)
**Auth Provider:** Supabase Auth

---

## Overview

ExamTracker uses a fully passwordless authentication system. There are no passwords to remember, no password resets, and no credential leaks. Users verify identity via:
- **Phone OTP** (SMS via MSG91) — PRIMARY
- **Magic Link** (email via Resend) — SECONDARY
- **Google OAuth** (via Supabase) — TERTIARY

**Why Passwordless?** Indian aspirants use low-cost Android phones, often shared with family. Passwords get forgotten, especially for apps used infrequently between exam cycles. Phone OTP has the lowest friction for this demographic.

---

## Three Authentication Methods

| Method | Provider | Best For | Priority | Cost |
|--------|---------|---------|---------|------|
| Phone OTP | MSG91 (India) | 90%+ of users — budget Android, rural, semi-urban | PRIMARY | ₹0.25/OTP |
| Magic Link Email | Resend | Users who prefer email or don't want to share phone | SECONDARY | ~₹0.006/email |
| Google OAuth | Supabase + Google | Tech-comfortable users, college students | TERTIARY | Free |

### MSG91 vs Twilio — Why MSG91

| Factor | Twilio | MSG91 |
|--------|--------|-------|
| Cost per SMS to India | $0.0832 (~₹7) | ₹0.25 |
| Cost at 10K signups/month | ~₹70,000/month | ~₹2,500/month |
| India TRAI DLT compliance | Does not handle | Native support |
| Cost difference | — | **28x cheaper** |

---

## Flow 1: Phone OTP — New User Registration (Primary Path)

### Step-by-Step

| Step | Actor | Action | Result |
|------|-------|--------|--------|
| 1 | User | Enters phone number (+91XXXXXXXXXX) | Frontend validates format, enables "Send OTP" button |
| 2 | Frontend → Supabase | `supabase.auth.signInWithOtp({ phone })` | Supabase generates OTP, fires SMS Hook to Edge Function |
| 3 | Edge Function → MSG91 | Edge Function calls MSG91 Send OTP API | SMS delivered with DLT-approved template |
| 4 | User | Enters 6-digit OTP in 6-box input | Auto-focus advances per digit; auto-submit on 6th |
| 5 | Frontend → Supabase | `supabase.auth.verifyOtp({ phone, token, type: "sms" })` | Supabase validates token |
| 6a | Supabase (valid OTP) | Returns session (access_token + refresh_token) | Check for user_profiles row → Dashboard or Onboarding |
| 6b | Supabase (wrong OTP) | Returns error | Show "Incorrect OTP. X attempts remaining." Lock after 5 failures for 10 min |
| 6c | Supabase (expired OTP) | Returns error | Show "OTP expired. Request a new one." |

**OTP SMS Template:** "Your Exam Tracker OTP is {{otp}}. Valid for 10 minutes. Do not share. -ExamTracker"

**Rate Limits:**
- 60-second cooldown between OTP requests (countdown shown)
- Maximum 5 OTP requests per phone number per hour
- Lock for 10 minutes after 5 wrong OTP attempts

---

## Flow 2: Phone OTP — Returning User Login

Login and registration use the **exact same flow** — no separate screens.

**No Separate Login/Register Screens (Intentional):** Having two screens confuses users who don't remember if they've signed up before. One "Enter your phone number" screen handles both. If the number is new → account created. If it exists → logged in.

| Step | What Happens |
|------|-------------|
| User enters phone number | Frontend validates |
| Supabase checks `auth.users` | Existing number = login; new number = registration |
| OTP verified | Redirect to Dashboard (returning) or Onboarding (new user) |

---

## Flow 3: Magic Link via Email

For users who prefer email. User enters email, receives a one-time sign-in link (valid 1 hour), clicks it, authenticated — no OTP to type.

**Frontend call:** `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: "https://examtracker.in/auth/callback" } })`

**Resend Integration:** In Supabase dashboard → Auth → SMTP settings, set custom SMTP to Resend's endpoint. All auth emails route through Resend for professional deliverability.

**Email:** Subject "Sign in to ExamTracker", minimal design — one "Sign In" button, expiry info, no marketing content.

**Callback route:** The link contains the token as a URL fragment → `/auth/callback` page calls `supabase.auth.getSession()` → validates server-side → new user = Onboarding, returning = Dashboard.

**Edge Case:** A user who signs up with phone OTP then tries magic link with the same email will create a separate unlinked account. Handle via `supabase.auth.updateUser({ email })` on the already-authenticated session to link identities rather than create duplicates.

---

## Flow 4: Google OAuth

One-tap Google sign-in. Supabase handles the entire OAuth flow.

| Step | Actor | Action | Result |
|------|-------|--------|--------|
| 1 | User | Clicks "Continue with Google" | `supabase.auth.signInWithOAuth({ provider: "google" })` |
| 2 | Supabase → Google | Redirect to Google's OAuth consent screen | User sees account picker |
| 3 | User → Google | Selects Google account | Google authenticates, returns auth code to Supabase callback URL |
| 4 | Google → Supabase | Exchange code for tokens | Supabase creates/updates user in `auth.users` |
| 5 | Supabase → Frontend | Redirect to `/auth/callback` with session | Profile check → Onboarding or Dashboard |

**Setup:** Add ExamTracker as OAuth app in Google Cloud Console. Set redirect URI to `https://[supabase-project].supabase.co/auth/v1/callback`. Add Client ID + Secret to Supabase Auth → Providers → Google.

---

## Session Management

| Token | Lifetime | Notes |
|-------|----------|-------|
| `access_token` (JWT) | 60 minutes | Auto-refreshed by supabase-js in the background |
| `refresh_token` | **30 days** (extend from default 7) | Stored in localStorage; single-use, rotated on every refresh |

**Why 30-day refresh token?** Users expect to stay logged in across sessions for a tracking app. Force-logout is frustrating for an app that users open infrequently between exam cycles.

---

## "Lost Access" — Replacing Forgot Password

Since there are no passwords, "forgot password" doesn't exist. Instead:

| Scenario | Solution |
|----------|---------|
| Lost phone or new SIM | Switch to magic link email on sign-in screen |
| Lost access to email | Switch to phone OTP — same phone = same account |
| No backup contact | Support contact required (rare; acceptable at MVP) |

**Best Practice During Onboarding:** After completing onboarding, nudge users to add both phone AND email. "Add your email as backup — so you never lose access." Reduces lost access cases to near zero.

---

## Account Linking — One User, Multiple Sign-In Methods

A user who signs up with phone OTP and later wants to also use magic link must NOT end up with two separate accounts.

**How to handle:**
- During onboarding Step 2: "Add your email to never lose access" (for phone signups) or "Add your phone for WhatsApp alerts" (for email signups)
- Use `supabase.auth.updateUser({ email })` or `supabase.auth.updateUser({ phone })` on the authenticated session — adds identifier to existing record, not a new record
- For Google OAuth: if Gmail matches an existing magic-link account, Supabase v2 auto-links them (verify "Link identities between providers" is enabled in Auth settings)

---

## Security Rules & Rate Limits

| Rule | Limit | Reason |
|------|-------|--------|
| OTP request cooldown | 60 seconds | Prevents SMS flooding |
| Max OTP requests per phone/hour | 5 attempts | Prevents MSG91 credit abuse |
| Wrong OTP attempts before lock | 5 attempts | 10-minute lock after 5 failures |
| OTP expiry | 10 minutes | Secure but long enough for slow typers |
| Magic link expiry | 60 minutes | Standard Supabase default |
| Refresh token lifetime | 30 days | Keep users logged in across sessions |
| Session per device | Unlimited | Users use phone + computer + family tablet |
| Supabase RLS on users table | User reads/writes own row only | Row-Level Security |

---

## Supabase Auth Configuration Checklist

**Auth → General Settings:**
- Site URL: `https://examtracker.in`
- Redirect URLs: `https://examtracker.in/auth/callback` (+ `localhost:3000` for dev)
- JWT expiry: 3600 (1 hour)
- Refresh token rotation: ENABLED
- Refresh token reuse interval: 10 seconds (prevents race conditions)
- Password login: DISABLED

**Auth → Providers:**
- Phone: ENABLED. SMS Provider: Custom (SMS Hook, not Twilio)
- Email: ENABLED. Disable "Confirm email". Custom SMTP → Resend credentials
- Google: ENABLED. Add Client ID + Secret from Google Cloud Console

**Auth → Rate Limits:**
- OTP request rate: 5 per hour per phone
- Sign in rate: 10 per 5 minutes per IP (Supabase default)

---

## MSG91 Setup (One-Time)

1. Register on msg91.com. Complete KYC.
2. Register entity on TRAI DLT portal (mandatory for India SMS). MSG91 guides through this.
3. Create OTP SMS template: "Your Exam Tracker OTP is {{otp}}. Valid for 10 minutes. Do not share. -ExamTracker" — submit for DLT approval (24–48 hours)
4. Get API key from MSG91 dashboard. Add to Supabase Edge Function environment variables.
5. Create Supabase Edge Function: receives `{ phone, otp }` from SMS Hook, calls MSG91 Send OTP API, returns 200.

---

## Post-Auth Routing Logic

The `/auth/callback` Next.js route handler runs a single server-side check immediately after Supabase confirms the session:

```sql
SELECT onboarding_completed, onboarding_step
FROM user_profiles
WHERE user_id = $1
```

| User State | Condition | Redirect |
|-----------|-----------|---------|
| Brand new user | `auth.users` exists, NO `user_profiles` row | `/onboarding` — begin 9-screen flow |
| Partially onboarded | `user_profiles` exists, `onboarding_completed = FALSE` | `/onboarding?step={onboarding_step}` — resume where left off |
| Fully onboarded | `user_profiles` exists, `onboarding_completed = TRUE` | `/dashboard` — personalized exam list |

---

*ExamTracker India — Auth Architecture v1.0 — February 2026*
