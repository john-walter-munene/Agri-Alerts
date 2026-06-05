const prisma = require("../../lib/prisma");

/**
 * Alert persistence layer.
 *
 * Separated from the pure `alert.engine` for two reasons:
 *   1. The engine stays I/O-free and trivially unit-testable.
 *   2. Persistence is opt-in. Some callers (e.g. ask.service) evaluate alerts
 *      only to feed an AI prompt and shouldn't pollute the history table.
 *
 * Persistence is idempotent via the schema's
 *   @@unique([farmerId, triggerType, forecastDate])
 * index. A dashboard refresh on the same day with the same forecast = zero
 * new rows. A forecast that has shifted severity = an in-place update.
 *
 * `rawWeather` is JSON-encoded (SQLite has no Json column — same shim as
 * `alertTriggers`). The history reader hydrates it back to an object.
 */

/**
 * Upsert every evaluated alert for a farmer.
 *
 * Engineering choice: failures here are LOGGED, not thrown. The dashboard's
 * primary value is showing today's alerts; if SQLite can't write history
 * (disk full, lock contention) we'd rather return a usable dashboard than a
 * 500. The history endpoint will simply lag a refresh.
 *
 * @param {string} farmerId
 * @param {Array} alerts - output of evaluateAlerts()
 * @returns {Promise<number>} count successfully persisted (best-effort)
 */
const persistAlerts = async (farmerId, alerts) => {
  if (!farmerId || !Array.isArray(alerts) || alerts.length === 0) return 0;

  let persisted = 0;
  for (const a of alerts) {
    try {
      await prisma.alert.upsert({
        where: {
          farmerId_triggerType_forecastDate: {
            farmerId,
            triggerType: a.triggerType,
            forecastDate: a.forecastDate,
          },
        },
        create: {
          farmerId,
          triggerType: a.triggerType,
          severity: a.severity,
          aiMessage: a.message ?? null,
          forecastDate: a.forecastDate,
          rawWeather: a.rawWeather ? JSON.stringify(a.rawWeather) : null,
        },
        update: {
          severity: a.severity,
          aiMessage: a.message ?? null,
          rawWeather: a.rawWeather ? JSON.stringify(a.rawWeather) : null,
        },
      });
      persisted++;
    } catch (err) {
      // Don't take down the dashboard for a history-write failure.
      console.error(
        `persistAlerts: failed to upsert ${a.triggerType}@${a.forecastDate} for ${farmerId}: ${err.message}`
      );
    }
  }
  return persisted;
};

/**
 * Read a farmer's alert history from the DB.
 *
 * Sorted newest-first. `rawWeather` is parsed back into an object; `message`
 * is renamed from the column's legacy name `aiMessage`.
 *
 * @param {string} farmerId
 * @param {Object} [opts]
 * @param {number} [opts.limit=50]
 * @returns {Promise<Array>}
 */
const readAlertHistory = async (farmerId, { limit = 50 } = {}) => {
  const cappedLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const rows = await prisma.alert.findMany({
    where: { farmerId },
    orderBy: { createdAt: "desc" },
    take: cappedLimit,
  });
  return rows.map(hydrateAlert);
};

const hydrateAlert = (row) => {
  let rawWeather = null;
  if (typeof row.rawWeather === "string" && row.rawWeather.length) {
    try {
      rawWeather = JSON.parse(row.rawWeather);
    } catch {
      rawWeather = null;
    }
  }
  return {
    id: row.id,
    triggerType: row.triggerType,
    severity: row.severity,
    message: row.aiMessage,
    forecastDate: row.forecastDate,
    rawWeather,
    createdAt: row.createdAt,
  };
};

module.exports = { persistAlerts, readAlertHistory, hydrateAlert };
