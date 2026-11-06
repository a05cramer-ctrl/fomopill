import { createRequire as __fp_createRequire } from "node:module";
import { fileURLToPath as __fp_fileURLToPath } from "node:url";
import { dirname as __fp_dirname } from "node:path";
const require = __fp_createRequire(import.meta.url);
const __filename = __fp_fileURLToPath(import.meta.url);
const __dirname = __fp_dirname(__filename);
var __fp_cjs_exports = {};

// lib/config.js
var num = (k, d) => {
  const v = process.env[k];
  if (v === void 0 || v === "") return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
var str = (k, d) => {
  const v = process.env[k];
  return v === void 0 || v === "" ? d : v;
};
function cfg() {
  return {
    // reading
    readRpcUrl: str("READ_RPC_URL", "https://solana-rpc.publicnode.com"),
    rpcUrl: str("RPC_URL", ""),
    readVia: str("READ_VIA", "rpc"),
    // "helius" => JSON batches of 20 on RPC_URL
    readPerTick: Math.max(0, Math.min(1e3, num("READ_PER_TICK", 150))),
    readConcurrency: Math.max(1, Math.min(32, num("READ_CONCURRENCY", 6))),
    readTimeoutMs: num("READ_TIMEOUT_MS", 6e3),
    tickBudgetMs: num("TICK_BUDGET_MS", 5e4),
    tickGapMs: num("TICK_GAP_MS", 5e4),
    windowSec: num("WINDOW_SEC", 600),
    // board / trigger
    triggerWallets: num("TRIGGER_WALLETS", 5),
    triggerNetUsd: num("TRIGGER_NET_USD", 250),
    minMcap: num("MIN_MCAP", 25e3),
    maxMcap: num("MAX_MCAP", 25e6),
    minLiq: num("MIN_LIQ", 8e3),
    cooldownMin: num("COOLDOWN_MIN", 60),
    boardTop: num("BOARD_TOP", 16),
    // trading
    live: process.env.LIVE === "1",
    botSecretKey: str("BOT_SECRET_KEY", ""),
    pillMint: str("PILL_MINT", ""),
    maxEntrySol: num("MAX_ENTRY_SOL", 0.5),
    entryPct: num("ENTRY_PCT", 10),
    reserveSol: num("RESERVE_SOL", 0.05),
    maxPositions: num("MAX_POSITIONS", 3),
    takeProfitX: num("TAKE_PROFIT_X", 1.5),
    trailPct: num("TRAIL_PCT", 25),
    stopX: num("STOP_X", 0.7),
    maxHoldH: num("MAX_HOLD_H", 12),
    slippageBps: num("SLIPPAGE_BPS", 800),
    minEntrySol: num("MIN_ENTRY_SOL", 0.01),
    feeCollectMinSol: num("FEE_COLLECT_MIN_SOL", 0.01),
    feeCollectEveryMin: num("FEE_COLLECT_EVERY_MIN", 60),
    confirmTimeoutMs: num("CONFIRM_TIMEOUT_MS", 45e3),
    // gate
    holderMin: num("HOLDER_MIN", 1e5),
    // the pill's X account (off unless X_POST=1 and the four X_* keys are set)
    xMinWallets: num("X_MIN_WALLETS", 8),
    xCallsPerHour: Math.max(0, num("X_CALLS_PER_HOUR", 2)),
    xMaxPerDay: Math.max(0, num("X_MAX_PER_DAY", 30)),
    xMarks: str("X_MARKS", "2,3,5,10").split(",").map(Number).filter((n) => Number.isFinite(n) && n > 1).sort((a, b) => a - b),
    holderSecret: str("HOLDER_SECRET", ""),
    cronSecret: str("CRON_SECRET", ""),
    delayMin: num("DELAY_MIN", 5)
  };
}
function publicConfig(c = cfg()) {
  return {
    triggerWallets: c.triggerWallets,
    windowMin: Math.round(c.windowSec / 60),
    triggerNetUsd: c.triggerNetUsd,
    maxEntrySol: c.maxEntrySol,
    entryPct: c.entryPct,
    takeProfitX: c.takeProfitX,
    trailPct: c.trailPct,
    stopX: c.stopX,
    maxHoldH: c.maxHoldH
  };
}

// lib/util.js
function getFetch(fetchFn) {
  return fetchFn || ((...a) => globalThis.fetch(...a));
}
async function fetchWithTimeout(fetchFn, url, init = {}, timeoutMs = 8e3) {
  const f = getFetch(fetchFn);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs);
  try {
    return await f(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}
function round(x, d = 2) {
  if (!Number.isFinite(x)) return 0;
  const p = 10 ** d;
  return Math.round(x * p) / p;
}
function jsonParseSafe(s, fallback = null) {
  if (s === null || s === void 0) return fallback;
  if (typeof s !== "string") return s;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}
var errMsg = (e) => (e && e.message ? String(e.message) : String(e)).slice(0, 300);

// lib/kv.js
function kvEnv(env = process.env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL || "";
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN || "";
  return { url: url.replace(/\/+$/, ""), token };
}
var KvError = class extends Error {
};
function kvClient({ env = process.env, fetchFn, timeoutMs = 8e3 } = {}) {
  const { url, token } = kvEnv(env);
  const configured = Boolean(url && token);
  async function pipeline(cmds) {
    if (!configured) throw new KvError("KV not configured (KV_REST_API_URL/KV_REST_API_TOKEN)");
    if (!cmds.length) return [];
    const body = JSON.stringify(cmds.map((c) => c.map((x) => typeof x === "string" ? x : String(x))));
    const res = await fetchWithTimeout(
      fetchFn,
      `${url}/pipeline`,
      { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body },
      timeoutMs
    );
    if (!res.ok) throw new KvError(`KV HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length !== cmds.length) throw new KvError("KV pipeline: bad response shape");
    return arr.map((r, i) => {
      if (r && typeof r === "object" && "error" in r) throw new KvError(`KV ${cmds[i][0]} ${cmds[i][1] ?? ""}: ${r.error}`);
      return r ? r.result : null;
    });
  }
  async function cmd(...args) {
    const [r] = await pipeline([args]);
    return r;
  }
  return { configured, pipeline, cmd, url };
}
var K = {
  lock: "fp:lock",
  tickGate: "fp:tickGate",
  // set NX for TICK_GAP_MS when the tick is open (no CRON_SECRET)
  lastSig: "fp:lastSig",
  window: "fp:window",
  // JSON array of [t,w,m,s,u,id] tuples (one value)
  board: "fp:board",
  // JSON {updatedAt,totals,coins} newest live board
  snaps: "fp:snaps",
  // list, newest first, max 10 JSON boards
  totals: "fp:totals",
  // hash of counters
  hTrades: "fp:h:trades",
  // hash hourIndex -> trades read
  hDoses: "fp:h:doses",
  // hash hourIndex -> doses
  doses: "fp:doses",
  // list newest first (capped)
  dosedAt: "fp:dosedAt",
  // hash mint -> ms
  dosePeak: "fp:dosePeak",
  // hash "<mint>@<at>" -> best USD price seen since that dose (recent doses only)
  xCalls: "fp:xCalls",
  // hash "<mint>@<at>" -> JSON posted call {mint, at, symbol, priceAtDose, mcapAtDose, id, marks}
  xCount: "fp:xCount",
  // hash "d:<day>" / "c:<hour>" -> posts made
  positions: "fp:positions",
  // JSON array
  trades: "fp:trades",
  // list newest first (capped)
  burns: "fp:burns",
  fees: "fp:fees",
  pendingBurns: "fp:pendingBurns",
  // JSON array
  feeLastAt: "fp:feeLastAt",
  prices: "fp:prices",
  // hash mint -> JSON {usdPrice, mcap, liquidity, symbol, name, icon, at}
  solPrice: "fp:solPrice",
  // JSON {usd, at}
  pill: "fp:pill",
  // JSON {wallet, sol, pillTokens, at}
  lastTick: "fp:lastTick",
  // JSON tick log
  holderRl: (w) => `fp:rl:${w}`
};
var hourIndex = (ms) => Math.floor(ms / 36e5);
function sum24h(flat, nowMs) {
  const h = hourIndex(nowMs);
  let total = 0;
  if (!Array.isArray(flat)) return 0;
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const k = Number(flat[i]);
    if (k > h - 24 && k <= h) total += Number(flat[i + 1]) || 0;
  }
  return total;
}
function flatToObj(flat) {
  const o = {};
  if (!Array.isArray(flat)) return o;
  for (let i = 0; i + 1 < flat.length; i += 2) o[flat[i]] = flat[i + 1];
  return o;
}
var parseList = (arr) => Array.isArray(arr) ? arr.map((s) => jsonParseSafe(s)).filter(Boolean) : [];

// lib/clean.js
var rot13 = (w) => w.replace(/[a-z]/g, (ch) => String.fromCharCode((ch.charCodeAt(0) - 84) % 26 + 97));
var BAD_ANY = ["avtt", "snttbg", "jrgonpx", "uvgyre"].map(rot13);
var BAD_WORD = ["xvxr", "xvxrf", "puvax", "puvaxf", "fcvp", "fcvpf", "genaal", "genaavrf", "snt", "sntf", "avtn", "avtnf"].map(rot13);
var LEET = { 0: "o", 1: "i", "!": "i", "|": "i", 3: "e", 4: "a", "@": "a", 5: "s", $: "s", 7: "t", 8: "b" };
function isBadText(t) {
  const n = " " + String(t || "").toLowerCase().replace(/[01!|34@5$78]/g, (ch) => LEET[ch]).replace(/[^a-z]+/g, " ") + " ";
  return BAD_ANY.some((w) => n.includes(w)) || BAD_WORD.some((w) => n.includes(" " + w + " "));
}
var cleanText = (t) => t == null || isBadText(t) ? null : t;

// lib/board.js
var movePct = (priceAtDose, usdPriceNow) => priceAtDose > 0 && usdPriceNow != null && Number.isFinite(usdPriceNow) ? round((usdPriceNow - priceAtDose) / priceAtDose * 100, 1) : null;

// lib/http.js
function send(res, status, body, { cache } = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", cache || "no-store");
  if (cache) res.setHeader("CDN-Cache-Control", cache);
  res.end(JSON.stringify(body));
}
var PUBLIC_CACHE = "public, s-maxage=15, stale-while-revalidate=30";

// handlers/stats.js
var num2 = (v) => v === void 0 || v === null || v === "" ? 0 : Number(v) || 0;
async function statsResponse({ env = process.env, fetchFn, now = () => Date.now() } = {}) {
  const c = cfg();
  const live = c.live && Boolean(c.botSecretKey);
  const kv = kvClient({ env, fetchFn });
  const base = {
    updatedAt: null,
    live,
    pill: { wallet: env.PILL_WALLET || null, sol: null, pillTokens: null },
    mint: c.pillMint || null,
    totals: { tradesRead24h: 0, tradesReadAll: 0, doses24h: 0, dosesAll: 0, positionsOpen: 0, wins: 0, losses: 0, realizedSol: 0, buybackSol: 0, burnedTokens: 0, feesCollectedSol: 0 },
    doses: [],
    positions: [],
    trades: [],
    burns: [],
    fees: [],
    config: publicConfig(c)
  };
  if (!kv.configured) return { status: 200, body: { ...base, error: "kv_not_configured" } };
  const [totalsFlat, hTrades, hDoses, dosesRaw, positionsRaw, tradesRaw, burnsRaw, feesRaw, pricesRaw, pillRaw, boardRaw, peakFlat] = await kv.pipeline([
    ["HGETALL", K.totals],
    ["HGETALL", K.hTrades],
    ["HGETALL", K.hDoses],
    ["LRANGE", K.doses, "0", "19"],
    ["GET", K.positions],
    ["LRANGE", K.trades, "0", "29"],
    ["LRANGE", K.burns, "0", "49"],
    ["LRANGE", K.fees, "0", "49"],
    ["GET", K.prices],
    ["GET", K.pill],
    ["GET", K.board],
    ["HGETALL", K.dosePeak]
  ]);
  const peaks = flatToObj(peakFlat);
  const t = flatToObj(totalsFlat);
  const prices = jsonParseSafe(pricesRaw, {}) || {};
  const positions = (jsonParseSafe(positionsRaw, []) || []).map((p) => {
    const valueSol = p.valueSol ?? null;
    const cost = Number(p.costSol) || 0;
    return {
      mint: p.mint,
      symbol: cleanText(p.symbol ?? prices[p.mint]?.symbol),
      icon: p.icon ?? prices[p.mint]?.icon ?? null,
      openedAt: p.openedAt,
      costSol: round(cost, 6),
      valueSol: valueSol == null ? null : round(valueSol, 6),
      pnlPct: valueSol != null && cost > 0 ? round((valueSol + (Number(p.realizedSol) || 0) - cost) / cost * 100, 1) : null,
      halved: Boolean(p.halved),
      buyTx: p.buyTx
    };
  });
  const nowMs = now();
  const pill = jsonParseSafe(pillRaw, null);
  const board = jsonParseSafe(boardRaw, null);
  const doses = parseList(dosesRaw).map((d) => {
    const usdPriceNow = prices[d.mint]?.usdPrice ?? null;
    const peak = Math.max(Number(peaks[`${d.mint}@${d.at}`]) || 0, Number(usdPriceNow) || 0);
    const peakX = d.priceAtDose > 0 && peak > 0 ? round(peak / d.priceAtDose, 2) : null;
    return { mint: d.mint, symbol: cleanText(d.symbol), name: cleanText(d.name), icon: d.icon ?? null, at: d.at, buyers: d.buyers, netUsd: d.netUsd, priceAtDose: d.priceAtDose ?? null, mcapAtDose: d.mcapAtDose ?? null, usdPriceNow, movePct: movePct(d.priceAtDose, usdPriceNow), peakX };
  });
  return {
    status: 200,
    body: {
      ...base,
      updatedAt: board && board.updatedAt || pill && pill.at || null,
      pill: pill ? { wallet: pill.wallet, sol: pill.sol ?? null, pillTokens: pill.pillTokens ?? null } : base.pill,
      totals: {
        tradesRead24h: sum24h(hTrades, nowMs),
        tradesReadAll: num2(t.tradesReadAll),
        doses24h: sum24h(hDoses, nowMs),
        dosesAll: num2(t.dosesAll),
        positionsOpen: positions.length,
        wins: num2(t.wins),
        losses: num2(t.losses),
        realizedSol: round(num2(t.realizedSol), 6),
        buybackSol: round(num2(t.buybackSol), 6),
        burnedTokens: round(num2(t.burnedTokens), 2),
        feesCollectedSol: round(num2(t.feesCollectedSol), 6)
      },
      doses,
      positions,
      trades: parseList(tradesRaw).map((x) => ({ at: x.at, side: x.side, mint: x.mint, symbol: cleanText(x.symbol), sol: x.sol, tx: x.tx })),
      burns: parseList(burnsRaw),
      fees: parseList(feesRaw)
    }
  };
}
async function handler(req, res) {
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (req.method !== "GET") return send(res, 405, { error: "method" });
  try {
    const r = await statsResponse({});
    return send(res, r.status, r.body, { cache: PUBLIC_CACHE });
  } catch (e) {
    return send(res, 500, { error: errMsg(e) });
  }
}
export {
  handler as default,
  statsResponse
};
