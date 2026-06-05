const { HttpError } = require("../../lib/httpError");

/**
 * WeatherAI transport layer.
 *
 * Responsibilities:
 *   1. Make the actual HTTP call to /v1/weather (the only endpoint we use on
 *      the Free plan — see README "AI provider note").
 *   2. Track quota from X-RateLimit-Remaining and auto-downgrade to ai=false
 *      when below threshold so the WeatherAI AI sub-quota survives the demo.
 *   3. In-memory per-location cache with 30-min TTL and explicit-bypass
 *      support. Cache key is the rounded lat,lon — farmers in the same village
 *      share a cache entry. Privacy-neutral and a meaningful quota win.
 *
 * Design notes:
 *   - State (cache map, quota counter) is module-scoped. Singleton per process
 *     is correct for a single Render dyno; Phase 2 swaps in Redis.
 *   - `_setFetch` / `_setNow` are test-only hooks (underscore prefix) so the
 *     unit tests don't need msw / nock as deps.
 *   - We never throw the upstream response body to the caller — log it for
 *     the operator, surface a clean HttpError to the client.
 */

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min
const cache = new Map(); // key: "lat,lon" -> { fetchedAt, payload, aiUsed }

let quotaRemaining = Infinity; // optimistic until the first response updates it

// Injectable for tests
let _fetch = (...args) => fetch(...args);
let _now = () => Date.now();

const cacheKey = (lat, lon) => `${lat.toFixed(2)},${lon.toFixed(2)}`;

const getQuotaThreshold = () => {
  const raw = process.env.WEATHER_AI_QUOTA_THRESHOLD;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : 50;
};

const buildUrl = (lat, lon, withAi) => {
  const base = process.env.WEATHER_API_BASE_URL || "https://api.weather-ai.co";
  return `${base}/v1/weather?lat=${lat}&lon=${lon}&days=7&ai=${withAi ? "true" : "false"}`;
};

const fetchRaw = async (lat, lon, withAi) => {
  const key = process.env.WEATHER_API_KEY;
  if (!key) throw new HttpError(503, "Weather provider is not configured");

  const res = await _fetch(buildUrl(lat, lon, withAi), {
    headers: { Authorization: `Bearer ${key}` },
  });

  // Update quota counter from response header regardless of status.
  const remainingHeader = res.headers.get("x-ratelimit-remaining");
  if (remainingHeader != null) {
    const n = Number(remainingHeader);
    if (Number.isFinite(n)) quotaRemaining = n;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`WeatherAI ${res.status}: ${body.slice(0, 200)}`);
    throw new HttpError(502, "Weather provider failed");
  }

  return res.json();
};

/**
 * Fetch the weather forecast for a coordinate, honoring cache + quota.
 *
 * @param {Object} opts
 * @param {number} opts.lat
 * @param {number} opts.lon
 * @param {boolean} [opts.force=false] - bypass cache; does NOT bypass quota guard
 * @returns {Promise<{ data, meta: { cached, fetchedAt, aiUsed, quotaRemaining } }>}
 */
const fetchForecast = async ({ lat, lon, force = false }) => {
  const k = cacheKey(lat, lon);
  const now = _now();

  // Eviction-on-read: expired entries are removed when seen.
  const cached = cache.get(k);
  if (cached && now - cached.fetchedAt > CACHE_TTL_MS) {
    cache.delete(k);
  }

  if (!force && cache.has(k)) {
    const hit = cache.get(k);
    return {
      data: hit.payload,
      meta: {
        cached: true,
        fetchedAt: new Date(hit.fetchedAt).toISOString(),
        aiUsed: hit.aiUsed,
        quotaRemaining: Number.isFinite(quotaRemaining) ? quotaRemaining : null,
      },
    };
  }

  // Force-bypass invalidates the existing entry so subsequent natural reads
  // can't accidentally return data older than what the user just requested.
  if (force) cache.delete(k);

  const useAi = quotaRemaining > getQuotaThreshold();
  const payload = await fetchRaw(lat, lon, useAi);

  cache.set(k, { fetchedAt: now, payload, aiUsed: useAi });

  return {
    data: payload,
    meta: {
      cached: false,
      fetchedAt: new Date(now).toISOString(),
      aiUsed: useAi,
      quotaRemaining: Number.isFinite(quotaRemaining) ? quotaRemaining : null,
    },
  };
};

// --- test-only hooks (do not import from production code) ---
const _setFetch = (fn) => { _fetch = fn; };
const _setNow = (fn) => { _now = fn; };
const _resetState = () => {
  cache.clear();
  quotaRemaining = Infinity;
  _fetch = (...args) => fetch(...args);
  _now = () => Date.now();
};
const _peekQuota = () => quotaRemaining;

module.exports = {
  fetchForecast,
  CACHE_TTL_MS,
  _setFetch,
  _setNow,
  _resetState,
  _peekQuota,
};
