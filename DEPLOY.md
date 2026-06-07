# WC 2026 Intelligence — Deployment Guide
## Zero coding experience required. Follow every step in order.

---

## STEP 1 — Create your accounts (do this first, takes ~20 mins)

1. **GitHub** → github.com → Sign up (free)
2. **Vercel**  → vercel.com → "Sign up with GitHub" (free)
3. **Railway** → railway.app → "Login with GitHub" (free tier)
4. **Supabase** → supabase.com → Sign up → New project → name it `wc2026` → save your password
5. **API-Football** → api-football.com → Register → Subscribe to **Pro plan** (€19/mo) → copy your API key from dashboard
6. **Anthropic** → console.anthropic.com → Sign in with your Claude account → API Keys → Create key → copy it
7. **AdSense** → adsense.google.com → Apply (needs a live website URL — do this after Step 4)

---

## STEP 2 — Set up Supabase database

1. Open your Supabase project
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Open the file `supabase_schema.sql` from this folder
5. Copy the entire contents and paste into the SQL editor
6. Click **Run** — you should see "Success"
7. Go to **Settings → API** and copy:
   - `Project URL` (looks like https://xxxxx.supabase.co)
   - `anon public` key
   - `service_role` key (keep this secret!)

---

## STEP 3 — Upload code to GitHub

1. Go to github.com → click the **+** button → **New repository**
2. Name it `wc2026-intelligence`, set to **Public**, click **Create repository**
3. On your computer, download this entire `wc2026` folder as a ZIP
4. On the GitHub page, drag and drop all the files from the ZIP into the browser window
5. Click **Commit changes**

---

## STEP 4 — Deploy frontend to Vercel

1. Go to vercel.com → **Add New Project**
2. Select your `wc2026-intelligence` repository
3. Set **Root Directory** to `frontend`
4. Click **Environment Variables** and add these (one by one):
   ```
   VITE_SUPABASE_URL         = (your Supabase Project URL)
   VITE_SUPABASE_ANON_KEY    = (your Supabase anon key)
   VITE_API_URL              = https://wc2026-backend.up.railway.app/api
   ```
   (you'll update VITE_API_URL after Step 5)
5. Click **Deploy** → wait 90 seconds → your app is live!
6. Copy your Vercel URL (e.g. https://wc2026-intelligence.vercel.app)

---

## STEP 5 — Deploy backend to Railway

1. Go to railway.app → **New Project** → **Deploy from GitHub repo**
2. Select `wc2026-intelligence`
3. Set **Root Directory** to `backend`
4. Go to **Variables** tab and add:
   ```
   PORT                  = 3001
   FRONTEND_URL          = (your Vercel URL from Step 4)
   SUPABASE_URL          = (your Supabase Project URL)
   SUPABASE_SERVICE_KEY  = (your Supabase service_role key)
   API_FOOTBALL_KEY      = (your API-Football key)
   ANTHROPIC_API_KEY     = (your Anthropic API key)
   ```
5. Railway auto-deploys. Copy your Railway URL (e.g. https://wc2026-backend.up.railway.app)
6. Go back to Vercel → your project → Settings → Environment Variables
7. Update `VITE_API_URL` to `https://your-railway-url.up.railway.app/api`
8. Redeploy on Vercel (click **Redeploy** in the deployments tab)

---

## STEP 6 — Set up Google AdSense

1. Go to adsense.google.com and apply using your Vercel URL
2. Google will review your site (24–48 hours)
3. Once approved, go to AdSense → **Ads** → **By ad unit** → **Display ads** → create a unit
4. Copy the code snippet
5. Open `frontend/index.html` in GitHub, uncomment the `<script>` tag and replace `ca-pub-XXXXXXXX` with your publisher ID
6. In `frontend/src/pages/HomePage.jsx`, replace the `<!-- PASTE YOUR ADSENSE -->` comments with your ad unit code
7. Commit the changes — Vercel redeploys automatically

---

## STEP 7 — Test everything

1. Open your Vercel URL on your phone
2. You should see the app load with all 48 teams
3. Tap any fixture → the match modal opens
4. Tap **Generate AI analysis** → analysis appears (needs Anthropic key working)
5. Enter a test result → tap **Update rankings** → rankings should change
6. On iPhone: tap Share → **Add to Home Screen** → it installs as an app icon
7. On Android: Chrome shows a banner automatically offering to install

---

## Monthly costs (after free tiers)

| Service        | Cost           |
|----------------|----------------|
| Vercel         | Free           |
| Railway        | Free (≤$5/mo)  |
| Supabase       | Free           |
| API-Football   | €19/month      |
| Anthropic API  | ~€0.01/analysis|
| Total          | ~€20-25/month  |

Revenue from AdSense at 10,000 daily users ≈ €60–150/day during the tournament.

---

## Troubleshooting

**App loads but no data** → Check Supabase URL and anon key in Vercel env vars

**AI analysis fails** → Check Anthropic API key in Railway variables

**Scores not updating** → Check API-Football key in Railway variables, verify Pro plan is active

**AdSense not showing** → Normal until approved. Replace placeholder divs once approved.

Need help? The error messages in Railway logs (under **Deployments → View logs**) tell you exactly what's wrong.
