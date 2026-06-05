const test = require("node:test");
const assert = require("node:assert/strict");

/**
 * Stub Prisma BEFORE loading the SUT.
 *
 * Why this pattern: node:test has no built-in module mocker. Rather than add
 * a dep (proxyquire/sinon), we seed require.cache with a fake module under
 * the exact path the SUT resolves. CommonJS dedup guarantees the SUT picks
 * up the stub.
 */
const mockPrisma = {
  alert: {
    calls: [],
    rows: [],
    failNext: false,
    async upsert(args) {
      if (mockPrisma.alert.failNext) {
        mockPrisma.alert.failNext = false;
        throw new Error("simulated DB write failure");
      }
      mockPrisma.alert.calls.push(args);
    },
    async findMany(args) {
      mockPrisma.alert.calls.push({ findMany: args });
      return mockPrisma.alert.rows;
    },
  },
};

require.cache[require.resolve("../lib/prisma")] = {
  id: require.resolve("../lib/prisma"),
  filename: require.resolve("../lib/prisma"),
  loaded: true,
  exports: mockPrisma,
};

const {
  persistAlerts,
  readAlertHistory,
  hydrateAlert,
} = require("../services/alert/alert.persistence");

test.beforeEach(() => {
  mockPrisma.alert.calls = [];
  mockPrisma.alert.rows = [];
  mockPrisma.alert.failNext = false;
});

// ============================================================================
// persistAlerts
// ============================================================================

test("persistAlerts: no-ops for empty/missing inputs", async () => {
  assert.equal(await persistAlerts("f1", []), 0);
  assert.equal(await persistAlerts("f1", null), 0);
  assert.equal(await persistAlerts(null, [{ triggerType: "rain" }]), 0);
  assert.equal(mockPrisma.alert.calls.length, 0);
});

test("persistAlerts: upserts each alert with the composite unique key", async () => {
  const alerts = [
    {
      triggerType: "rain",
      severity: "high",
      forecastDate: "2026-06-05",
      message: "Heavy rain in tea region",
      rawWeather: { precipitation_probability: 90 },
    },
    {
      triggerType: "frost",
      severity: "medium",
      forecastDate: "2026-06-06",
      message: "Frost risk tonight",
      rawWeather: { temp_min: 1 },
    },
  ];

  const count = await persistAlerts("farmer-uuid-1", alerts);

  assert.equal(count, 2);
  assert.equal(mockPrisma.alert.calls.length, 2);

  const first = mockPrisma.alert.calls[0];
  assert.deepEqual(first.where, {
    farmerId_triggerType_forecastDate: {
      farmerId: "farmer-uuid-1",
      triggerType: "rain",
      forecastDate: "2026-06-05",
    },
  });
  assert.equal(first.create.severity, "high");
  assert.equal(first.create.aiMessage, "Heavy rain in tea region");
  // rawWeather is JSON-encoded for SQLite
  assert.equal(typeof first.create.rawWeather, "string");
  assert.deepEqual(JSON.parse(first.create.rawWeather), {
    precipitation_probability: 90,
  });
});

test("persistAlerts: handles missing message + rawWeather as null, not undefined", async () => {
  await persistAlerts("f1", [
    { triggerType: "drought", severity: "low", forecastDate: "2026-06-05" },
  ]);
  const call = mockPrisma.alert.calls[0];
  assert.equal(call.create.aiMessage, null);
  assert.equal(call.create.rawWeather, null);
});

test("persistAlerts: failure is swallowed (best-effort) so dashboard still returns", async () => {
  mockPrisma.alert.failNext = true;
  const alerts = [
    { triggerType: "rain", severity: "high", forecastDate: "2026-06-05" },
    { triggerType: "frost", severity: "low", forecastDate: "2026-06-06" },
  ];

  // Suppress expected console.error noise for this test only.
  const originalErr = console.error;
  console.error = () => {};
  try {
    const count = await persistAlerts("f1", alerts);
    // First write failed, second succeeded -> count = 1, no throw
    assert.equal(count, 1);
  } finally {
    console.error = originalErr;
  }
});

// ============================================================================
// readAlertHistory + hydrateAlert
// ============================================================================

test("readAlertHistory: caps limit at 200 and floors at 1", async () => {
  await readAlertHistory("f1", { limit: 9999 });
  assert.equal(mockPrisma.alert.calls[0].findMany.take, 200);

  mockPrisma.alert.calls = [];
  await readAlertHistory("f1", { limit: -5 });
  assert.equal(mockPrisma.alert.calls[0].findMany.take, 1);

  mockPrisma.alert.calls = [];
  await readAlertHistory("f1");
  assert.equal(mockPrisma.alert.calls[0].findMany.take, 50);
});

test("readAlertHistory: filters by farmerId and sorts newest-first", async () => {
  await readAlertHistory("farmer-xyz");
  const args = mockPrisma.alert.calls[0].findMany;
  assert.deepEqual(args.where, { farmerId: "farmer-xyz" });
  assert.deepEqual(args.orderBy, { createdAt: "desc" });
});

test("readAlertHistory: hydrates rawWeather JSON and renames aiMessage -> message", async () => {
  mockPrisma.alert.rows = [
    {
      id: "a1",
      triggerType: "rain",
      severity: "high",
      aiMessage: "Rain expected",
      forecastDate: "2026-06-05",
      rawWeather: JSON.stringify({ precipitation_probability: 90 }),
      createdAt: new Date("2026-06-05T10:00:00Z"),
    },
  ];

  const out = await readAlertHistory("f1");
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], {
    id: "a1",
    triggerType: "rain",
    severity: "high",
    message: "Rain expected",
    forecastDate: "2026-06-05",
    rawWeather: { precipitation_probability: 90 },
    createdAt: new Date("2026-06-05T10:00:00Z"),
  });
});

test("hydrateAlert: tolerates corrupt/missing rawWeather without throwing", () => {
  assert.equal(
    hydrateAlert({ aiMessage: "x", rawWeather: "not-json{" }).rawWeather,
    null
  );
  assert.equal(
    hydrateAlert({ aiMessage: "x", rawWeather: null }).rawWeather,
    null
  );
  assert.equal(
    hydrateAlert({ aiMessage: "x" }).rawWeather,
    null
  );
});
