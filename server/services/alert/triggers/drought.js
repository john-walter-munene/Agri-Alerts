const { THRESHOLDS } = require("../crop.rules");

/**
 * Drought is multi-day by definition. We look at the full daily forecast
 * window and check whether the worst day matches a drought threshold.
 *
 * A drought match means: across the forecast window,
 *   - the MAX daily precipitation_probability is below the threshold AND
 *   - the AVG temp_max meets or exceeds the threshold.
 *
 * Returns at most ONE alert per evaluation (no per-day duplicates), anchored
 * to the first forecast date so the dedup key (farmer, trigger, date) is
 * stable across same-day re-evaluations.
 *
 * Note: precipitation_probability is a percent in our normalized weather, not
 * mm — so the threshold's `maxPrecipMm` is interpreted as "max daily precip
 * probability % below which we treat the day as effectively dry". This is a
 * pragmatic MVP simplification; once WeatherAI exposes mm values we swap in
 * mm directly without changing the engine shape.
 */
const evaluateDrought = (daily) => {
  if (!Array.isArray(daily) || daily.length === 0) return null;

  // Need at least 3 days of forecast to call it "drought" — anything less is
  // just a stretch of weather.
  if (daily.length < 3) return null;

  const maxPrecip = Math.max(
    ...daily.map((d) => d.precipitation_probability ?? 0)
  );
  const avgTemp =
    daily.reduce((s, d) => s + (d.temp_max ?? 0), 0) / daily.length;

  const t = THRESHOLDS.drought;
  let severity = null;
  if (maxPrecip <= t.high.maxPrecipMm && avgTemp >= t.high.minAvgTempC) {
    severity = "high";
  } else if (maxPrecip <= t.medium.maxPrecipMm && avgTemp >= t.medium.minAvgTempC) {
    severity = "medium";
  } else if (maxPrecip <= t.low.maxPrecipMm && avgTemp >= t.low.minAvgTempC) {
    severity = "low";
  }

  if (!severity) return null;

  return {
    severity,
    forecastDate: daily[0].date,
    rawWeather: { window: daily, maxPrecip, avgTemp },
  };
};

module.exports = { evaluateDrought };
