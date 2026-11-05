# FOMO PILL

Fomo's #1 KOL is a pill. Static site + 4 Vercel functions (api/board, api/stats, api/holder, api/tick).
Every call and every board number is read off Solana by api/tick, once a minute. Nothing in this repo is sample data.

## 1. GitHub
New repo (e.g. fomopill). Upload EVERYTHING in this folder, including the api folder and .gitignore.
Check on GitHub that the 4 api files sit inside api/ (api/tick.js etc.). If they landed in the root, move them: edit the file, type api/ in front of the name, commit.

## 2. Vercel
Add New > Project > import the repo. Framework preset: Other. No build command. Output directory: leave empty. Deploy.

## 3. Storage (free)
Project > Storage > Upstash (Redis) > create + connect to this project.
It adds KV_REST_API_URL and KV_REST_API_TOKEN by itself.

## 4. Environment variables (Project > Settings > Environment Variables)
Required:
- CRON_SECRET      any long random string (you make it up)
- HOLDER_SECRET    any long random string (you make it up)
Recommended:
- RPC_URL          your Helius RPC URL from your api folder
Add after launch:
- PILL_MINT        the $FOMOPILL CA. Turns on the holder view: holders see fomo live, everyone else 5 minutes late.
- PILL_WALLET      the pill's wallet address (shown on the site)
Only when you fund the wallet and want it to trade:
- BOT_SECRET_KEY   the pill wallet's secret key
- LIVE             1
Redeploy after changing env vars (Deployments > ... > Redeploy).

## 5. The 1-minute tick (cron-job.org, free)
Create a cron job:
URL: https://YOUR-DOMAIN/api/tick?key=YOUR_CRON_SECRET
Schedule: every 1 minute. Method GET. Timeout 60 s.
Check: open that URL once; it returns JSON with "ok": true. After 1-2 minutes the board and calls fill in.

## 6. After launch
- config.js: fill CA, X, BUY (https://pump.fun/coin/CA), CHART (https://gmgn.ai/sol/token/CA). Commit.
- index.html: once you have the domain, change content="og.jpg" to content="https://YOUR-DOMAIN/og.jpg" (link previews on X need the full URL).
