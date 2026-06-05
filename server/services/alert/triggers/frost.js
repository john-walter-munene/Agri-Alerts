const { THRESHOLDS } = require("../crop.rules");

/**
 * Lower temp_min = worse. high severity = at/below 0°C.
 */
const classify = (tempMin) => {
  const t = THRESHOLDS.frost;
  if (tempMin <= t.high) return "high";
  if (tempMin <= t.medium) return "medium";
  if (tempMin <= t.low) return "low";
  return null;
};

const evaluateFrost = (day) => {
  if (!day || day.temp_min == null) return null;
  const severity = classify(day.temp_min);
  if (!severity) return null;
  return {
    severity,
    forecastDate: day.date,
    rawWeather: day,
  };
};

module.exports = { evaluateFrost };
