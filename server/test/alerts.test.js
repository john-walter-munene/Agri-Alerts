const test = require("node:test");
const assert = require("node:assert/strict");

const { evaluateAlerts } = require("../services/alert/alert.engine");
const { evaluateRain } = require("../services/alert/triggers/rain");
const { evaluateFrost } = require("../services/alert/triggers/frost");
const { evaluateExtremeWind } = require("../services/alert/triggers/extremeWind");
const { evaluateDrought } = require("../services/alert/triggers/drought");

/**
 * Pure-function unit tests for the alert engine. No HTTP, no DB.
 * Run with `node --test test/alerts.test.js` or `npm test`.
 */

// --- helpers ---
const day = (over = {}) => ({
  date: "2026-06-05",
  temp_min: 18,
  temp_max: 26,
  precipitation_probability: 10,
  wind_max: 15,
  humidity: 55,
  ...over,
});

const farmer = (over = {}) => ({
  cropType: "maize",
  alertTriggers: ["rain", "frost", "extreme_wind", "drought"],
  ...over,
});

// ============================================================================
// Per-trigger evaluators
// ============================================================================

test("rain: returns null below low threshold", () => {
  assert.equal(evaluateRain(day({ precipitation_probability: 50 })), null);
});

test("rain: classifies low / medium / high", () => {
  assert.equal(evaluateRain(day({ precipitation_probability: 70 })).severity, "low");
  assert.equal(evaluateRain(day({ precipitation_probability: 85 })).severity, "medium");
  assert.equal(evaluateRain(day({ precipitation_probability: 99 })).severity, "high");
});

test("rain: passes through forecastDate + rawWeather", () => {
  const m = evaluateRain(day({ precipitation_probability: 80, date: "2026-07-01" }));
  assert.equal(m.forecastDate, "2026-07-01");
  assert.equal(m.rawWeather.precipitation_probability, 80);
});

test("frost: high severity at/below 0°C", () => {
  assert.equal(evaluateFrost(day({ temp_min: 0 })).severity, "high");
  assert.equal(evaluateFrost(day({ temp_min: -3 })).severity, "high");
});

test("frost: medium / low bands", () => {
  assert.equal(evaluateFrost(day({ temp_min: 1 })).severity, "medium");
  assert.equal(evaluateFrost(day({ temp_min: 3 })).severity, "low");
});

test("frost: no match above 4°C", () => {
  assert.equal(evaluateFrost(day({ temp_min: 5 })), null);
});

test("extreme_wind: high at >=80 km/h", () => {
  assert.equal(evaluateExtremeWind(day({ wind_max: 80 })).severity, "high");
});

test("extreme_wind: no match below 40 km/h", () => {
  assert.equal(evaluateExtremeWind(day({ wind_max: 39 })), null);
});

test("drought: requires at least 3 days of forecast", () => {
  const win = [day({ precipitation_probability: 0, temp_max: 35 })];
  assert.equal(evaluateDrought(win), null);
});

test("drought: high when all days are very dry and very hot", () => {
  const win = Array.from({ length: 5 }, (_, i) =>
    day({
      date: `2026-06-0${i + 1}`,
      precipitation_probability: 0,
      temp_max: 33,
    })
  );
  const m = evaluateDrought(win);
  assert.equal(m.severity, "high");
  assert.equal(m.forecastDate, "2026-06-01"); // anchored to first day
});

test("drought: no match when even one wet day breaks the streak", () => {
  const win = Array.from({ length: 7 }, (_, i) =>
    day({
      date: `2026-06-0${i + 1}`,
      precipitation_probability: i === 3 ? 70 : 0, // one wet day in the middle
      temp_max: 33,
    })
  );
  assert.equal(evaluateDrought(win), null);
});

// ============================================================================
// Engine orchestration
// ============================================================================

test("engine: empty input returns []", () => {
  assert.deepEqual(evaluateAlerts(farmer(), {}), []);
  assert.deepEqual(evaluateAlerts(null, { daily: [] }), []);
  assert.deepEqual(evaluateAlerts(farmer(), null), []);
});

test("engine: emits a per-trigger alert for each matching day", () => {
  const weather = {
    daily: [
      day({ date: "2026-06-05", precipitation_probability: 90 }), // rain medium
      day({ date: "2026-06-06", temp_min: -1 }),                 // frost high
      day({ date: "2026-06-07", wind_max: 65 }),                 // extreme_wind medium
    ],
  };
  const alerts = evaluateAlerts(farmer(), weather);

  // Only the named triggers should appear (no numeric `score` shape)
  for (const a of alerts) {
    assert.ok(["rain", "frost", "extreme_wind", "drought"].includes(a.triggerType));
    assert.ok(["low", "medium", "high"].includes(a.severity));
    assert.ok(a.forecastDate);
    assert.ok(typeof a.message === "string" && a.message.length > 0);
  }

  // Find each expected alert
  const rain = alerts.find((a) => a.triggerType === "rain");
  const frost = alerts.find((a) => a.triggerType === "frost");
  const wind = alerts.find((a) => a.triggerType === "extreme_wind");
  assert.equal(rain.severity, "medium");
  assert.equal(frost.severity, "high");
  assert.equal(wind.severity, "medium");
});

test("engine: respects farmer.alertTriggers — disabled triggers do not fire", () => {
  const weather = {
    daily: [
      day({ date: "2026-06-05", precipitation_probability: 99 }), // would be rain high
      day({ date: "2026-06-06", temp_min: -2 }),                  // would be frost high
    ],
  };
  const alerts = evaluateAlerts(
    farmer({ alertTriggers: ["rain"] }), // frost disabled
    weather
  );
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].triggerType, "rain");
});

test("engine: empty alertTriggers list falls back to all triggers (defensive)", () => {
  const weather = {
    daily: [day({ date: "2026-06-05", precipitation_probability: 99 })],
  };
  const alerts = evaluateAlerts(farmer({ alertTriggers: [] }), weather);
  assert.ok(alerts.some((a) => a.triggerType === "rain"));
});

test("engine: message varies by cropType", () => {
  const weather = {
    daily: [day({ date: "2026-06-05", precipitation_probability: 99 })],
  };
  const maize = evaluateAlerts(farmer({ cropType: "maize" }), weather);
  const tea = evaluateAlerts(farmer({ cropType: "tea" }), weather);
  assert.notEqual(maize[0].message, tea[0].message);
  assert.ok(maize[0].message.toLowerCase().includes("maize"));
  assert.ok(tea[0].message.toLowerCase().includes("tea"));
});

test("engine: unknown crop falls back to mixed copy (no throw)", () => {
  const weather = {
    daily: [day({ date: "2026-06-05", precipitation_probability: 99 })],
  };
  const alerts = evaluateAlerts(farmer({ cropType: "bananas" }), weather);
  assert.equal(alerts.length, 1);
  assert.ok(alerts[0].message.length > 0);
});

test("engine: drought emits at most one alert per evaluation", () => {
  const weather = {
    daily: Array.from({ length: 7 }, (_, i) =>
      day({
        date: `2026-06-0${i + 1}`,
        precipitation_probability: 0,
        temp_max: 33,
      })
    ),
  };
  const alerts = evaluateAlerts(farmer(), weather);
  const droughts = alerts.filter((a) => a.triggerType === "drought");
  assert.equal(droughts.length, 1);
});
