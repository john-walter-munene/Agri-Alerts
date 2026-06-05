const { BASE_URL, phone, log, request } = require("./utils");

async function testDashboard() {
  const res = await request(
    `${BASE_URL}/farmers/${phone}/dashboard`
  );

  log("DASHBOARD", res);
}

testDashboard();