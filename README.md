# pFPL! — Outsmart Your Gameweek

AI-powered Fantasy Premier League predictions, transfer suggestions, and captain picks — built on the live FPL API + Claude AI.

---

## 🚀 Deploy to Vercel (5 minutes)

### Step 1 — Upload to GitHub

1. Go to [github.com](https://github.com) and sign in
2. Click **"New repository"** (green button, top right)
3. Name it `pfpl`, set to **Public**, click **Create repository**
4. On the next screen, click **"uploading an existing file"**
5. Drag and drop **this entire folder** into the upload area
6. Click **"Commit changes"**

### Step 2 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account
2. Click **"Add New Project"**
3. Find and select your `pfpl` repository
4. Vercel auto-detects it as a Vite/React app — **no config needed**
5. Click **"Deploy"**
6. In ~60 seconds you'll have a live URL like `pfpl-abc123.vercel.app`

### Step 3 — Add your Anthropic API key

For the AI Insight feature to work:
1. In Vercel, go to your project → **Settings → Environment Variables**
2. Add: `VITE_ANTHROPIC_API_KEY` = your key from [console.anthropic.com](https://console.anthropic.com)
3. Redeploy (Vercel → Deployments → Redeploy)

> Note: The app currently calls the Claude API directly from the browser. For production, you'd move this to a Vercel serverless function to keep your key private.

---

## 🛠 Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 📱 How to Use

1. Find your **FPL Team ID** in your FPL profile URL:
   `fantasy.premierleague.com/entry/`**`1234567`**`/event`
2. Enter it on the home screen and hit **Load My Team**
3. Explore the four tabs:
   - **Squad** — All 15 players with predicted points & fixture difficulty
   - **Transfers** — AI-detected blank/doubt players with replacement suggestions
   - **Captain** — Top 3 picks ranked by confidence
   - **AI ⚡** — Claude-powered personalised gameweek analysis

---

## 🔧 Tech Stack

- **React 18** + **Vite** — fast, lightweight frontend
- **FPL Official API** — public, no key required
- **Claude AI (claude-sonnet)** — personalised analysis
- **allorigins.win** — CORS proxy for FPL API calls

---

## 🗺 Roadmap

- [ ] Multi-gameweek planning
- [ ] Chip strategy advisor (Wildcard, Triple Captain, Bench Boost)
- [ ] Price change tracker
- [ ] Mini-league rank tracker
- [ ] Serverless API proxy (secure key handling)

---

## ⚠️ Disclaimer

pFPL! is a fan-made tool and is not affiliated with the official Fantasy Premier League or the Premier League. Always check the official FPL site for the latest injury and availability news before your gameweek deadline.
