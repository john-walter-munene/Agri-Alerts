const prisma = require("../lib/prisma");
const { HttpError } = require("../lib/httpError");
const { fetchWeather, resolveAiInsight } = require("./weather.service");
const { evaluateAlerts } = require("./alert/alert.engine");
const { persistAlerts, readAlertHistory } = require("./alert/alert.persistence");

/**
 * SQLite has no native String[] / Json column, so `alertTriggers` is stored as
 * a JSON-encoded string (see schema + spec). These helpers keep the (de)serial-
 * ization in one place so the rest of the codebase only sees JS arrays. When we
 * migrate to Postgres these helpers collapse to identity.
 */
const serializeFarmer = (data) => {
  const out = { ...data };
  if (Array.isArray(out.alertTriggers)) {
    out.alertTriggers = JSON.stringify(out.alertTriggers);
  }
  return out;
};

const hydrateFarmer = (farmer) => {
  if (!farmer) return farmer;
  let triggers = [];
  if (typeof farmer.alertTriggers === "string" && farmer.alertTriggers.length) {
    try {
      const parsed = JSON.parse(farmer.alertTriggers);
      if (Array.isArray(parsed)) triggers = parsed;
    } catch {
      // Legacy / corrupt data — fall back to empty list rather than 500.
      triggers = [];
    }
  }
  return { ...farmer, alertTriggers: triggers };
};

const findFarmerOr404 = async (phone) => {
  const farmer = await prisma.farmer.findUnique({ where: { phone } });
  if (!farmer) throw new HttpError(404, "Farmer not found");
  return farmer;
};

// Create
const createFarmerService = async (data) => {
  const created = await prisma.farmer.create({ data: serializeFarmer(data) });
  return hydrateFarmer(created);
};

// Get
const getFarmerByPhoneService = async (phone) => {
  const farmer = await findFarmerOr404(phone);
  return hydrateFarmer(farmer);
};

// Update
const updateFarmerService = async (phone, data) => {
  await findFarmerOr404(phone); // ensures 404 instead of Prisma P2025
  const updated = await prisma.farmer.update({
    where: { phone },
    data: serializeFarmer(data),
  });
  return hydrateFarmer(updated);
};

/**
 * Dashboard payload contract (see Step 4 README / spec):
 *
 *   {
 *     farmer,
 *     current:  { time, temperature, precipitation_probability, wind_speed, humidity },
 *     daily:    [ up to 7 days ],
 *     hourly:   [ up to 24 hours ],
 *     aiInsight: string | null,
 *     aiInsightSource: "weather-ai" | "fallback-static",
 *     alerts: EvaluatedAlert[],
 *     meta: { cached, fetchedAt, aiUsed, quotaRemaining }
 *   }
 *
 * `current` is derived from hourly[0] (no second WeatherAI call). `hourly` is
 * sliced here, not in the normalizer — same payload could feed a 48h chart
 * later without re-fetch.
 */
const getFarmerDashboardService = async (phone, opts = {}) => {
  const farmer = hydrateFarmer(await findFarmerOr404(phone));
  const weather = await fetchWeather(farmer.lat, farmer.lon, { force: !!opts.force });
  const alerts = evaluateAlerts(farmer, weather);
  const ai = resolveAiInsight(weather, farmer.cropType);

  // Persist for the history feed. Best-effort: persistence errors are logged
  // inside persistAlerts and never surfaced — the dashboard is the primary
  // value, history is secondary.
  await persistAlerts(farmer.id, alerts);

  const hourly24 = weather.hourly.slice(0, 24);
  const daily7 = weather.daily.slice(0, 7);
  const current = hourly24[0]
    ? {
        time: hourly24[0].time,
        temperature: hourly24[0].temperature,
        precipitation_probability: hourly24[0].precipitation_probability,
        wind_speed: hourly24[0].wind_speed,
        humidity: hourly24[0].humidity,
      }
    : null;

  return {
    farmer,
    current,
    daily: daily7,
    hourly: hourly24,
    aiInsight: ai.text,
    aiInsightSource: ai.source,
    alerts,
    meta: weather.meta,
  };
};

// Alerts history feed — reads from the persisted Alert table only.
// Triggering new evaluations is the dashboard endpoint's job; this endpoint
// is read-only and cheap, so it's safe to poll from the client.
const getFarmerAlertsService = async (phone, { limit } = {}) => {
  const farmer = await findFarmerOr404(phone);
  return readAlertHistory(farmer.id, { limit });
};

module.exports = {
  createFarmerService,
  getFarmerByPhoneService,
  updateFarmerService,
  getFarmerDashboardService,
  getFarmerAlertsService,
  // exported for ask.service to reuse without duplicating the 404 logic
  findFarmerOr404,
  hydrateFarmer,
};