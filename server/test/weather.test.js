const test = require("node:test");
const assert = require("node:assert/strict");

const {
  fetchForecast,
  _setFetch,
  _setNow,
  _resetState,
  _peekQuota,
  CACHE_TTL_MS,
} = require("../services/weather/client");

const { normalizeWeather, resolveAiInsight } = require("../services/weather.service");
const { evaluateAlerts } = require("../services/alert/alert.engine");

/**
 * Ensures we don't hit the network from these tests.
 */
const mockOk = (body, headers = {}) => ({
  ok: true,
  status: 200,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  json: async () => body,
  text: async () => JSON.stringify(body),
});

const mockErr = (status, body, headers = {}) => ({
  ok: false,
  status,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  json: async () => body,
  text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
});

const samplePayload = {
  ai_summary: "Cool and clear in Bomet this week.",
  hourly: [
    { time: "2026-06-05T10:00", temperature: 18, precipitation_probability: 20, wind_speed: 8, humidity: 65 },
  ],
  daily: [
    { date: "2026-06-05", temp_min: 12, temp_max: 22, precipitation_probability: 30, wind_max: 18, humidity: 60 },
  ],
};

// Tests need a key envvar so the client doesn't short-circuit.
process.env.WEATHER_API_KEY = "wai_test_key";

test.beforeEach(() => _resetState());

// ============================================================================
// Normalizer
// ============================================================================

test("normalizeWeather: missing numeric fields become null, not 0", () => {
  const out = normalizeWeather({
    daily: [{ date: "2026-06-05" /* no temps, no wind */ }],
    hourly: [{ time: "2026-06-05T10:00" }],
  });
  assert.equal(out.daily[0].temp_min, null);
  assert.equal(out.daily[0].temp_max, null);
  assert.equal(out.daily[0].wind_max, null);
  assert.equal(out.hourly[0].temperature, null);
});

test("normalizeWeather: null temp_min does NOT trigger a frost alert", () => {
  const weather = normalizeWeather({
    daily: [{ date: "2026-06-05" /* missing temp_min */ }],
  });
  const farmer = { cropType: "maize", alertTriggers: ["frost"] };
  assert.deepEqual(evaluateAlerts(farmer, weather), []);
});

test("normalizeWeather: handles totally empty/garbage input", () => {
  assert.deepEqual(normalizeWeather(null), { ai_summary: null, hourly: [], daily: [] });
  assert.deepEqual(normalizeWeather({}), { ai_summary: null, hourly: [], daily: [] });
});

test("resolveAiInsight: uses ai_summary when present", () => {
  const r = resolveAiInsight({ ai_summary: "Sunny." }, "maize");
  assert.equal(r.text, "Sunny.");
  assert.equal(r.source, "weather-ai");
});

test("resolveAiInsight: falls back to static crop-aware copy when missing", () => {
  const r = resolveAiInsight({ ai_summary: null }, "tea");
  assert.equal(r.source, "fallback-static");
  assert.ok(r.text.toLowerCase().includes("tea"));
});

// ============================================================================
// Cache
// ============================================================================

test("cache: second call within TTL is a hit, no second fetch", async () => {
  let calls = 0;
  _setFetch(async () => {
    calls++;
    return mockOk(samplePayload, { "x-ratelimit-remaining": "900" });
  });

  const a = await fetchForecast({ lat: -0.7833, lon: 35.3417 });
  const b = await fetchForecast({ lat: -0.7833, lon: 35.3417 });

  assert.equal(calls, 1);
  assert.equal(a.meta.cached, false);
  assert.equal(b.meta.cached, true);
});

test("cache: ?force=true invalidates the entry and refetches", async () => {
  let calls = 0;
  _setFetch(async () => {
    calls++;
    return mockOk(samplePayload, { "x-ratelimit-remaining": "900" });
  });

  await fetchForecast({ lat: -0.7833, lon: 35.3417 });
  await fetchForecast({ lat: -0.7833, lon: 35.3417 });   // hit
  await fetchForecast({ lat: -0.7833, lon: 35.3417, force: true }); // miss

  assert.equal(calls, 2);
});

test("cache: entry expires after TTL and is evicted on read", async () => {
  let now = 1_000_000;
  _setNow(() => now);
  let calls = 0;
  _setFetch(async () => {
    calls++;
    return mockOk(samplePayload, { "x-ratelimit-remaining": "900" });
  });

  await fetchForecast({ lat: 1, lon: 2 });
  now += CACHE_TTL_MS + 1;
  await fetchForecast({ lat: 1, lon: 2 });

  assert.equal(calls, 2);
});

test("cache: rounds lat/lon to 0.01 so nearby farmers share a hit", async () => {
  let calls = 0;
  _setFetch(async () => {
    calls++;
    return mockOk(samplePayload, { "x-ratelimit-remaining": "900" });
  });

  await fetchForecast({ lat: -0.7833, lon: 35.3417 });
  // ~30m away — same 0.01 cell
  await fetchForecast({ lat: -0.7831, lon: 35.3418 });

  assert.equal(calls, 1);
});

// ============================================================================
// Quota guard
// ============================================================================

test("quota: tracks X-RateLimit-Remaining across requests", async () => {
  _setFetch(async () => mockOk(samplePayload, { "x-ratelimit-remaining": "123" }));
  await fetchForecast({ lat: 1, lon: 2 });
  assert.equal(_peekQuota(), 123);
});

test("quota: below threshold -> request goes out with ai=false", async () => {
  let capturedUrl = null;
  // First call seeds quota at 10 (below default threshold of 50)
  _setFetch(async (url) => {
    capturedUrl = url;
    return mockOk(samplePayload, { "x-ratelimit-remaining": "10" });
  });
  await fetchForecast({ lat: 1, lon: 2 });
  assert.ok(capturedUrl.includes("ai=true")); // first call still tried AI

  // Force a refetch — now quota is known low, should request ai=false
  await fetchForecast({ lat: 1, lon: 2, force: true });
  assert.ok(capturedUrl.includes("ai=false"));
});

test("quota: response meta includes aiUsed flag and quotaRemaining", async () => {
  _setFetch(async () => mockOk(samplePayload, { "x-ratelimit-remaining": "999" }));
  const r = await fetchForecast({ lat: 1, lon: 2 });
  assert.equal(r.meta.aiUsed, true);
  assert.equal(r.meta.quotaRemaining, 999);
});

// ============================================================================
// Error mapping
// ============================================================================

test("error: upstream 500 surfaces as HttpError 502 (no body leak)", async () => {
  _setFetch(async () => mockErr(500, '{"error":"Internal server error"}'));
  await assert.rejects(
    () => fetchForecast({ lat: 1, lon: 2 }),
    (err) => {
      assert.equal(err.status, 502);
      assert.equal(err.message, "Weather provider failed");
      return true;
    }
  );
});
