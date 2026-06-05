const { evaluateRain } = require("./triggers/rain");
const { evaluateFrost } = require("./triggers/frost");
const { evaluateExtremeWind } = require("./triggers/extremeWind");
const { evaluateDrought } = require("./triggers/drought");
const { getMessage } = require("./crop.rules");
const { TRIGGER_TYPES } = require("../../lib/enums");

/**
 * The alert engine.
 *
 * Pure function. No I/O, no Prisma, no fetch. Given a farmer and a normalized
 * forecast, returns a flat list of EvaluatedAlert objects:
 *
 *   {
 *     triggerType:  "rain" | "frost" | "extreme_wind" | "drought",
 *     severity:     "low" | "medium" | "high",
 *     forecastDate: "YYYY-MM-DD",
 *     message:      string,   // crop-aware template
 *     rawWeather:   object    // the day or window that fired the trigger
 *   }
 *
 * Why pure: the spec's core architectural move. The same function powers
 * - synchronous evaluation on dashboard load (today),
 * - a node-cron worker (Phase 2),
 * - WeatherAI webhook handlers (Phase 3).
 * No rewrites — just new callers. Persistence is the *caller's* job (see
 * Step 5 / farmer.service.js).
 *
 * Per-day triggers iterate over forecast.daily. Multi-day triggers (drought)
 * receive the whole window.
 */

// Per-day evaluators (run on each day in forecast.daily)
const PER_DAY_TRIGGERS = {
  rain: evaluateRain,
  frost: evaluateFrost,
  extreme_wind: evaluateExtremeWind,
};

// Multi-day evaluators (run once per forecast)
const MULTI_DAY_TRIGGERS = {
  drought: evaluateDrought,
};

/**
 * @param {Object} farmer - hydrated farmer (alertTriggers is a string[])
 * @param {Object} weather - normalized weather from weather.service
 * @returns {Array} evaluated alerts
 */
const evaluateAlerts = (farmer, weather) => {  if (!farmer || !weather) return [];

  // Default: if farmer has no opt-in list at all, evaluate everything.
  // (Created-via-zod farmers always have the full list; this defends against
  // legacy/seed-imported rows.)
  const enabled = Array.isArray(farmer.alertTriggers) && farmer.alertTriggers.length
    ? farmer.alertTriggers
    : [...TRIGGER_TYPES];

  const enabledSet = new Set(enabled);
  const daily = Array.isArray(weather.daily) ? weather.daily : [];
  const alerts = [];

  // Per-day triggers
  for (const day of daily) {
    for (const [triggerType, evaluator] of Object.entries(PER_DAY_TRIGGERS)) {
      if (!enabledSet.has(triggerType)) continue;
      const match = evaluator(day);
      if (match) {
        alerts.push({
          triggerType,
          severity: match.severity,
          forecastDate: match.forecastDate,
          message: getMessage(triggerType, farmer.cropType),
          rawWeather: match.rawWeather,
        });
      }
    }
  }

  // Multi-day triggers
  for (const [triggerType, evaluator] of Object.entries(MULTI_DAY_TRIGGERS)) {
    if (!enabledSet.has(triggerType)) continue;
    const match = evaluator(daily);
    if (match) {
      alerts.push({
        triggerType,
        severity: match.severity,
        forecastDate: match.forecastDate,
        message: getMessage(triggerType, farmer.cropType),
        rawWeather: match.rawWeather,
      });
    }
  }

  return alerts;
};

module.exports = { evaluateAlerts };
