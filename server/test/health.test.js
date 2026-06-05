const { BASE_URL, log, request } = require("./utils");

async function testHealth() {
  const res = await request(`${BASE_URL}/health`);
  log("HEALTH CHECK", res);
}

testHealth();