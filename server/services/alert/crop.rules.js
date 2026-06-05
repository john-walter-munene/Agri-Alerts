/**
 * Crop rules: thresholds and per-crop message templates.
 *
 * Thresholds (rain, frost, extreme_wind, drought) are currently uniform across
 * crops — only the messages vary per crop. This is deliberate for the MVP:
 * - One source of truth (this file) instead of a 6x4 grid that nobody tunes.
 * - Per-crop threshold overrides are a clean Phase 2 extension — add an
 *   optional `thresholdOverrides` field per crop entry and have triggers
 *   prefer it.
 *
 * Severity → template lookup is by trigger + severity, with crop-specific
 * copy. Templates are static (no AI per alert) — see the README "AI provider
 * note" for why we don't burn the WeatherAI Free AI quota here.
 */

const THRESHOLDS = {
  rain: {
    // precipitation probability (%) thresholds
    low: 70,
    medium: 85,
    high: 95,
  },
  frost: {
    // temp_min (°C). Lower = worse. high severity = at/below 0°C.
    low: 4,
    medium: 2,
    high: 0,
  },
  extreme_wind: {
    // wind_max (km/h)
    low: 40,
    medium: 60,
    high: 80,
  },
  drought: {
    // 7-day window: max daily precip (mm) AND avg max temp (°C)
    low: { maxPrecipMm: 5, minAvgTempC: 28 },
    medium: { maxPrecipMm: 2, minAvgTempC: 30 },
    high: { maxPrecipMm: 1, minAvgTempC: 32 },
  },
};

/**
 * Crop-aware message templates per trigger.
 * Keyed as MESSAGES[triggerType][cropType] -> string.
 *
 * Severity is appended by the engine ("[HIGH RISK] " etc.) — keep template
 * copy focused on the agronomic action, not the severity label.
 */
const MESSAGES = {
  rain: {
    maize:   "Heavy rain likely. Delay any planned fertilizer top-dressing; risk of nutrient runoff on maize fields.",
    tea:     "Sustained wet conditions ahead. Defer plucking on tea blocks until leaves dry to avoid bruising and post-harvest losses.",
    wheat:   "Significant rainfall expected. If wheat is near maturity, monitor for lodging and delay harvest until fields dry.",
    beans:   "Wet, humid conditions favour fungal diseases like halo blight in beans. Inspect crops and prepare fungicide if needed.",
    sorghum: "Heavy rain ahead. Check field drainage; standing water harms sorghum root health.",
    mixed:   "Heavy rain expected. Postpone any open-field activities (spraying, fertilizing) and check drainage on low-lying plots.",
  },
  frost: {
    maize:   "Frost risk overnight. Young maize is highly vulnerable — irrigate in the late afternoon to raise soil temperature.",
    tea:     "Frost expected. Tea bushes can suffer leaf scorch — apply overhead irrigation pre-dawn if available.",
    wheat:   "Frost expected. Wheat in the booting/heading stage is most at risk — monitor for tip burn.",
    beans:   "Frost likely. Beans are very frost-sensitive; consider covering nursery plants if possible.",
    sorghum: "Frost expected. Sorghum tolerates cold poorly at seedling stage — delay any planned planting.",
    mixed:   "Frost expected overnight. Protect vulnerable crops (beans, young seedlings) — cover where possible.",
  },
  extreme_wind: {
    maize:   "Strong winds expected. Maize is prone to lodging — avoid late-season irrigation that softens soil around roots.",
    tea:     "High winds will damage exposed tea foliage. Avoid pruning operations until winds subside.",
    wheat:   "Strong winds may cause wheat lodging, especially if heads are heavy. Postpone irrigation.",
    beans:   "High winds can shred bean foliage. Check trellises and supports.",
    sorghum: "Strong winds expected. Tall sorghum varieties are at lodging risk — inspect plants after the event.",
    mixed:   "Strong winds expected. Secure trellises, shade nets, and check on tall crops.",
  },
  drought: {
    maize:   "Extended dry, hot spell ahead. Conserve soil moisture on maize — mulch where possible and prioritise irrigation for tasselling plants.",
    tea:     "Prolonged dry spell forecast. Tea is sensitive to drought stress — reduce plucking intervals and consider shade interventions.",
    wheat:   "Dry, hot period ahead. If wheat is in grain-fill, supplemental irrigation now will protect yield.",
    beans:   "Dry spell forecast. Beans are drought-sensitive at flowering/pod-fill — irrigate early morning or late evening to reduce evaporation.",
    sorghum: "Dry, hot week ahead. Sorghum tolerates drought relatively well, but young plants still need careful watering.",
    mixed:   "Extended dry spell ahead. Prioritise water for the most sensitive crops (beans, vegetables) and mulch to conserve soil moisture.",
  },
};

/**
 * Resolve a message template, with a sane fallback for unknown crops (should
 * never happen given zod validation, but defends against future schema drift).
 */
const getMessage = (triggerType, cropType) => {
  const perTrigger = MESSAGES[triggerType] || {};
  return (
    perTrigger[cropType] ||
    perTrigger.mixed ||
    "Weather risk detected — review your field conditions."
  );
};

/**
 * Static crop-aware summary used as the dashboard's "AI insight" when the
 * WeatherAI quota guard suppresses the AI field (ai=false on the upstream
 * call). One sentence per crop — informational, not alarmist. The named
 * trigger alerts carry the actionable advice.
 */
const FALLBACK_SUMMARY = {
  maize:   "Weather summary unavailable right now. Review the 7-day forecast and any active alerts before planning maize fieldwork.",
  tea:     "Weather summary unavailable right now. Check the 7-day forecast and active alerts before plucking or pruning tea blocks.",
  wheat:   "Weather summary unavailable right now. Review the 7-day forecast and active alerts before any wheat field operation.",
  beans:   "Weather summary unavailable right now. Inspect beans for disease pressure and consult the 7-day forecast before spraying.",
  sorghum: "Weather summary unavailable right now. Use the 7-day forecast and active alerts to guide sorghum field decisions.",
  mixed:   "Weather summary unavailable right now. Consult the 7-day forecast and active alerts before any field activity.",
};

const getFallbackSummary = (cropType) =>
  FALLBACK_SUMMARY[cropType] || FALLBACK_SUMMARY.mixed;

module.exports = {
  THRESHOLDS,
  MESSAGES,
  FALLBACK_SUMMARY,
  getMessage,
  getFallbackSummary,
};
