const { BASE_URL, phone, log, request } = require("./utils");

async function testGetFarmer() {
  const res = await request(`${BASE_URL}/farmers/${phone}`);
  log("GET FARMER", res);
}

testGetFarmer();