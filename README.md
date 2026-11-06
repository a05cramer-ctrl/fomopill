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
Nothing else is needed to run: the board, the calls and the stats work with just the storage from step 3.
Add after launch:
- PILL_MINT        the $FOMOPILL CA. Turns on the holder view: holders see fomo live, everyone else 5 minutes late.
- HOLDER_SECRET    any long random string (you make it up). Needed once PILL_MINT is set.
- PILL_WALLET      the pill's wallet address (shown on the site)
Optional:
- RPC_URL          your Helius RPC URL (faster reads than the public RPC)
- CRON_SECRET      locks /api/tick to ?key=CRON_SECRET. If you set it, add the same value in GitHub:
                   repo > Settings > Secrets and variables > Actions > New secret, name CRON_SECRET.
Only when you fund the wallet and want it to trade:
- BOT_SECRET_KEY   the pill wallet's secret key
- LIVE             1
Redeploy after changing env vars (Deployments > ... > Redeploy).

## 5. The 1-minute tick (already running)
.github/workflows/tick.yml calls https://fomopill-omega.vercel.app/api/tick once a minute from GitHub Actions
(free on a public repo). Without CRON_SECRET the tick runs for anyone but never more than once per 50 s.
Check: GitHub > Actions > tick shows the runs; each line is the tick's JSON. New domain? Change URL in that file.

## 6. After launch
- config.js: fill CA, X, BUY (https://pump.fun/coin/CA), CHART (https://gmgn.ai/sol/token/CA). Commit.
- index.html: once you have the domain, change content="og.jpg" to content="https://YOUR-DOMAIN/og.jpg" (link previews on X need the full URL).
