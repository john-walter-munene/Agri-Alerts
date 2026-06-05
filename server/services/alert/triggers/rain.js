const { THRESHOLDS } = require("../crop.rules");

/**
 * Classify a percent value against the rain thresholds.
 * Returns "high" | "medium" | "low" | null (no match).
 */
const classify = (prob) => {
  const t = THRESHOLDS.rain;
  if (prob >= t.high) return "high";
  if (prob >= t.medium) return "medium";
  if (prob >= t.low) return "low";
  return null;
};

/**
 * Evaluate a single forecast day for the rain trigger.
 * Input is a normalized day from weather.service (precipitation_probability in %).
 * Returns { severity, forecastDate, rawWeather } or null.
 */
const evaluateRain = (day) => {
  if (!day || day.precipitation_probability == null) return null;
  const severity = classify(day.precipitation_probability);
  if (!severity) return null;
  return {
    severity,
    forecastDate: day.date,
    rawWeather: day,
  };
};

module.exports = { evaluateRain };
