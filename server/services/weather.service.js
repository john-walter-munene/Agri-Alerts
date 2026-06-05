const { fetchForecast } = require("./weather/client");
const { getFallbackSummary } = require("./alert/crop.rules");

/**
 * Weather orchestrator.
 *
 * Calls the WeatherAI transport, normalizes the response, and supplies a
 * static crop-aware fallback summary when the quota guard suppresses the AI
 * field. Callers (dashboard / ask) receive a stable, source-agnostic shape.
 */
const fetchWeather = async (lat, lon, opts = {}) => {
  const { data, meta } = await fetchForecast({ lat, lon, force: !!opts.force });
  const normalized = normalizeWeather(data);
  return { ...normalized, meta };
};

/**
 * Normalize WeatherAI's response to a consistent internal shape.
 *
 * NOTE on null vs. 0:
 *   Missing numeric fields become `null` (not 0). The alert evaluators
 *   short-circuit on null. Defaulting to 0 caused spurious frost alerts
 *   whenever `temp_min` was absent (0°C is at our high-severity threshold).
 */
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const pick = (...vals) => {
  for (const v of vals) {
    const n = num(v);
    if (n !== null) return n;
  }
  return null;
};

const normalizeWeather = (weather) => {
  if (!weather || typeof weather !== "object") {
    return { ai_summary: null, hourly: [], daily: [] };
  }
  return {
    ai_summary: weather.ai_summary || weather.summary || null,
    hourly: (weather.hourly || []).map((h) => ({
      time: h.time,
      temperature: pick(h.temperature, h.temperature_2m),
      precipitation_probability: pick(h.precipitation_probability, h.precipitation),
      wind_speed: pick(h.wind_speed, h.windspeed),
      humidity: pick(h.humidity),
    })),
    daily: (weather.daily || []).map((d) => ({
      date: d.date,
      temp_min: pick(d.temp_min, d.temperature_min),
      temp_max: pick(d.temp_max, d.temperature_max),
      precipitation_probability: pick(d.precipitation_probability, d.precipitation_sum),
      wind_max: pick(d.wind_max, d.wind_speed_max),
      humidity: pick(d.humidity),
    })),
  };
};

/**
 * Resolve the AI insight string for the dashboard:
 *   - If WeatherAI returned ai_summary (meta.aiUsed === true), use it.
 *   - Otherwise we hit the quota fallback path — return a static crop-aware
 *     advisory and tell the caller which source was used.
 */
const resolveAiInsight = (weather, cropType) => {
  if (weather.ai_summary) {
    return { text: weather.ai_summary, source: "weather-ai" };
  }
  return { text: getFallbackSummary(cropType), source: "fallback-static" };
};

module.exports = { fetchWeather, normalizeWeather, resolveAiInsight };
