# pFPL — Technical Documentation
**predictivefpl.com**  
Last updated: March 2026  
Owner: [Your Name]

---

## 1. Product Overview

pFPL (Predictive FPL) is an AI-powered Fantasy Premier League assistant web application. It connects to a user's FPL account, analyses their squad and fixtures, and provides AI-driven recommendations for transfers, captaincy, and squad management.

**Live URL:** https://predictivefpl.com  
**Status:** Active, in production  
**User model:** Free tier (limited queries) + Pro subscription (unlimited)

---

## 2. Architecture Overview

```
Browser (React + Vite)
    │
    ├── Clerk (authentication)
    ├── Supabase (database, realtime)
    ├── Stripe (payments, handled client-side redirect only)
    │
    └── Vercel (hosting + serverless API)
            │
            ├── /api/fpl.js              → CORS proxy to FPL public API
            ├── /api/admin-users.js      → Clerk user management
            ├── /api/admin-email.js      → Email marketing (Resend)
            ├── /api/injuries.js         → Injury data (FPL API, cached 1hr)
            ├── /api/stripe-checkout.js  → Creates Stripe Checkout session
            ├── /api/stripe-webhook.js   → Listens for subscription events
            ├── /api/clerk-webhook.js    → Syncs new users to Supabase
            └── /api/lib/
                    ├── supabase-admin.js  → Service role DB client
                    └── security.js        → Rate limiting, CORS, sanitise
```

---

## 3. Tech Stack

| Layer | Service | Notes |
|-------|---------|-------|
| Frontend | React 18 + Vite | SPA, deployed to Vercel |
| Hosting | Vercel | Auto-deploys on `git push` to `main` |
| Authentication | Clerk | Email/social sign-in, session management |
| Database | Supabase (PostgreSQL) | Row-level security enabled |
| Payments | Stripe | Subscription billing — PCI compliant, we never store card data |
| Email | Resend | Transactional + marketing emails |
| AI | Anthropic Claude API | claude-sonnet-4-5 model |
| FPL Data | FPL Public API | fantasy.premierleague.com/api — no auth needed |
| Source control | GitHub | Private repo |

---

## 4. Repository Structure

```
predictivefpl/
├── api/                    Vercel serverless functions (Node.js)
│   ├── fpl.js             CORS proxy to FPL API
│   ├── admin-users.js     Admin: fetch Clerk users
│   ├── admin-email.js     Admin: send marketing emails
│   ├── injuries.js        Injury report (cached)
│   ├── stripe-checkout.js Create checkout session
│   ├── stripe-webhook.js  Handle subscription events
│   ├── clerk-webhook.js   Sync users to Supabase
│   └── lib/
│       ├── supabase-admin.js  Server-side Supabase (service role)
│       └── security.js        Security utilities
├── src/
│   ├── App.jsx            Main app shell + tab routing
│   ├── Router.jsx         Route definitions
│   ├── LandingPage.jsx    Public landing page
│   ├── AdminPage.jsx      Admin dashboard
│   ├── components/
│   │   ├── InjuriesTab.jsx         Injury report tab
│   │   ├── OpponentTeamModal.jsx   League opponent pitch view
│   │   ├── AdminEmailTool.jsx      Email marketing UI
│   │   └── PricingSection.jsx      Upgrade / pricing cards
│   ├── hooks/
│   │   └── useSubscription.js      Plan status + Stripe checkout
│   └── lib/
│       └── supabase.js             Frontend Supabase client
├── supabase/
│   └── schema.sql          Database schema (run once in Supabase SQL editor)
├── public/
├── vercel.json             Vercel config, security headers, function limits
├── .env.example            All required environment variables (template)
├── package.json
└── TECHNICAL.md            This file
```

---

## 5. Environment Variables

All secrets are stored in Vercel environment variables. **Never commit `.env.local` to git.**

### Frontend (VITE_ prefix — bundled into client)
| Variable | Source | Purpose |
|----------|--------|---------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys | Clerk frontend SDK |
| `VITE_SUPABASE_URL` | Supabase Dashboard → Settings → API | Supabase client |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API | Supabase client (RLS protected) |

### Server-only (Vercel only — never prefix with VITE_)
| Variable | Source | Purpose |
|----------|--------|---------|
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys | Fetch user list from Clerk |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard → Webhooks | Verify webhook signature |
| `SUPABASE_URL` | Supabase Dashboard → Settings → API | Server DB client |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API | Bypass RLS for admin ops |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys | Create checkout sessions |
| `STRIPE_PRO_PRICE_ID` | Stripe Dashboard → Products | Your Pro plan Price ID |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks | Verify webhook signature |
| `ANTHROPIC_API_KEY` | console.anthropic.com | Claude AI queries |
| `RESEND_API_KEY` | resend.com → API Keys | Send emails |
| `EMAIL_FROM` | — | Sender address e.g. `pFPL <noreply@predictivefpl.com>` |
| `APP_URL` | — | `https://predictivefpl.com` |
| `ADMIN_USER_IDS` | — | Comma-separated Clerk user IDs with admin access |

**To add/update in Vercel:**  
vercel.com → [project] → Settings → Environment Variables

---

## 6. Database Schema (Supabase)

All tables use Row Level Security. Users can only access their own rows.  
Serverless functions use the service role key to bypass RLS when needed.

### `public.users`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | Clerk user_id |
| email | text | Primary email |
| first_name | text | |
| last_name | text | |
| plan | text | `free` or `pro` |
| stripe_customer_id | text | Stripe Customer ID |
| stripe_subscription_id | text | Active subscription ID |
| subscription_status | text | `active`, `inactive`, `canceled` |
| created_at | timestamptz | |
| updated_at | timestamptz | Auto-updated |

### `public.fpl_teams`
| Column | Type | Notes |
|--------|------|-------|
| id | bigserial PK | |
| user_id | text FK → users.id | |
| fpl_team_id | integer | FPL entry ID |
| team_name | text | |
| overall_rank | integer | |
| total_points | integer | |
| synced_at | timestamptz | |

### `public.ai_queries`
| Column | Type | Notes |
|--------|------|-------|
| id | bigserial PK | |
| user_id | text FK | |
| prompt | text | |
| response | text | |
| gameweek | integer | |
| tokens_used | integer | |
| created_at | timestamptz | |

### `public.usage_limits`
| Column | Type | Notes |
|--------|------|-------|
| user_id | text PK FK | |
| month | text | `2026-03` format |
| query_count | integer | |

---

## 7. Authentication — Clerk

- **Sign-in methods:** Email/password, Google OAuth
- **Session management:** Clerk handles tokens, refresh, session persistence
- **Admin access:** Controlled by `ADMIN_USER_IDS` env var (Clerk user IDs)
- **User sync:** Clerk webhook → `/api/clerk-webhook.js` → upserts into Supabase `users` table on every `user.created` / `user.updated` event

**Clerk Dashboard:** dashboard.clerk.com  
**Webhook config:** Clerk → Webhooks → `https://predictivefpl.com/api/clerk-webhook`  
Events: `user.created`, `user.updated`

---

## 8. Payments — Stripe

**We never store or handle card details.** All payment processing is delegated 100% to Stripe's PCI-compliant infrastructure.

### Flow
1. User clicks "Upgrade to Pro"
2. Frontend calls `POST /api/stripe-checkout` with `userId` + `email`
3. Serverless function creates a Stripe Checkout Session and returns a URL
4. User is redirected to Stripe's hosted checkout page (stripe.com domain)
5. Stripe processes payment and calls our webhook
6. `/api/stripe-webhook.js` receives event, updates `users.plan = 'pro'` in Supabase
7. User is redirected to `/dashboard?upgrade=success`

### Stripe Dashboard
- URL: dashboard.stripe.com
- Webhook endpoint: `https://predictivefpl.com/api/stripe-webhook`
- Events subscribed: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

### Payment Service Alternatives (if switching from Stripe)
| Service | Notes |
|---------|-------|
| **Stripe** ⭐ (current) | Best docs, PCI compliant, global, 1.4%+25p UK |
| **Paddle** | Good for SaaS, handles VAT automatically, good for EU |
| **Lemon Squeezy** | Simple, built for indie devs, flat 5% fee |
| **Chargebee** | Enterprise-grade subscription management |

---

## 9. Email — Resend

- **Service:** resend.com
- **From address:** `pFPL <noreply@predictivefpl.com>`
- **Domain verification:** Add DNS records in Resend → Domains
- **Free tier:** 3,000 emails/month
- **Usage:** Admin email marketing (`/api/admin-email.js`) + future transactional emails
- **Personalisation tokens:** `{{name}}`, `{{email}}` in HTML templates

---

## 10. Security

### What's protected
- All API routes validate inputs and set security headers (via `api/lib/security.js`)
- Stripe webhook verified with HMAC signature (`stripe.webhooks.constructEvent`)
- Clerk webhook verified with svix HMAC signature
- Supabase RLS prevents users accessing each other's data
- No credit card data is ever stored — Stripe is PCI SAQ-A compliant
- Admin routes check `ADMIN_USER_IDS` env var
- Rate limiting on all API endpoints (in-memory; upgrade to Upstash Redis for scale)

### Security headers (vercel.json)
- `X-Frame-Options: DENY` — prevents clickjacking
- `X-Content-Type-Options: nosniff`
- `Content-Security-Policy` — restricts script/resource origins
- `Strict-Transport-Security` — forces HTTPS
- `Referrer-Policy: strict-origin-when-cross-origin`

### Sensitive data policy
| Data | Stored? | Where |
|------|---------|-------|
| Passwords | ❌ Never | Clerk handles (hashed, not accessible to us) |
| Card numbers | ❌ Never | Stripe only |
| Bank details | ❌ Never | Not collected |
| FPL team ID | ✅ | Supabase (not sensitive) |
| Email address | ✅ | Supabase + Clerk |
| Subscription status | ✅ | Supabase |
| AI query history | ✅ | Supabase (for usage tracking) |

---

## 11. Deployments

- **Platform:** Vercel
- **Auto-deploy:** Every push to `main` branch triggers a production deployment
- **Preview URLs:** Pull requests get unique preview URLs (e.g. `pfpl-pr-42.vercel.app`)
- **Rollback:** In Vercel dashboard → Deployments → click any previous deploy → "Promote to Production"

**To deploy manually:**
```bash
git add .
git commit -m "your message"
git push origin main
# Vercel auto-deploys in ~30s
```

---

## 12. External API Dependencies

| API | Auth | Rate Limit | Notes |
|-----|------|------------|-------|
| FPL (fantasy.premierleague.com/api) | None | Soft limit ~20 req/min | Proxied via /api/fpl.js to avoid CORS |
| Anthropic Claude | API Key | Depends on tier | Used for AI analysis |
| Clerk | Secret Key | — | User management |
| Stripe | Secret Key | — | Payments |
| Resend | API Key | Free: 100/day, 3000/mo | Email |

---

## 13. Costs (Monthly Estimates)

| Service | Free Tier | Expected Cost |
|---------|-----------|---------------|
| Vercel | Hobby (free) → Pro $20/mo if > 100GB bandwidth | ~$0–$20 |
| Clerk | Free up to 10,000 MAU | ~$0 |
| Supabase | Free up to 500MB DB, 2GB bandwidth | ~$0–$25 |
| Stripe | No monthly fee — 1.4%+25p per transaction | % of revenue |
| Resend | Free up to 3,000/mo | ~$0–$20 |
| Anthropic | Pay per token — ~$3 per 1M tokens (Sonnet) | ~$10–$50 |

---

## 14. Local Development

```bash
# Clone
git clone https://github.com/[your-username]/predictivefpl
cd predictivefpl

# Install
npm install

# Create env file
cp .env.example .env.local
# Fill in values from each service's dashboard

# Run dev server
npm run dev

# Run with Vercel functions locally (for API routes)
npm install -g vercel
vercel dev
```

---

## 15. Handover Checklist (for new owner)

- [ ] Transfer GitHub repo ownership
- [ ] Transfer Vercel project (vercel.com → Settings → Transfer Project)
- [ ] Transfer domain (predictivefpl.com) registrar access
- [ ] Share Clerk application (or create new and update env vars)
- [ ] Share Supabase project (or export DB and create new project)
- [ ] Share Stripe account (or create new and update webhook + price IDs)
- [ ] Share Resend account + domain verification
- [ ] Update `ADMIN_USER_IDS` env var to new owner's Clerk user ID
- [ ] Update `EMAIL_FROM` if domain changes
- [ ] Update Stripe webhook URL if domain changes
- [ ] Update Clerk webhook URL if domain changes

---

## 16. Support & Escalation

| Issue | Where to look |
|-------|--------------|
| Users can't sign in | Clerk Dashboard → Users → check for bans/blocks |
| Payment not processing | Stripe Dashboard → Events → filter by user email |
| Database errors | Supabase Dashboard → Database → Logs |
| API errors | Vercel Dashboard → Functions → Logs |
| Email not sending | Resend Dashboard → Logs |
| FPL data stale | Wait — FPL API updates ~30min after matches. Check cache TTL in `/api/injuries.js` |

---

*Document generated by Claude AI for pFPL (predictivefpl.com). Keep this file updated as the product evolves.*
