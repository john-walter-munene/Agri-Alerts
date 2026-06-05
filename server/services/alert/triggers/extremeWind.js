const { THRESHOLDS } = require("../crop.rules");

const classify = (windMax) => {
  const t = THRESHOLDS.extreme_wind;
  if (windMax >= t.high) return "high";
  if (windMax >= t.medium) return "medium";
  if (windMax >= t.low) return "low";
  return null;
};

const evaluateExtremeWind = (day) => {
  if (!day || day.wind_max == null) return null;
  const severity = classify(day.wind_max);
  if (!severity) return null;
  return {
    severity,
    forecastDate: day.date,
    rawWeather: day,
  };
};

module.exports = { evaluateExtremeWind };
