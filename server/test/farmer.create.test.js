const { BASE_URL, phone, log, request } = require("./utils");

async function testCreateFarmer() {
  const res = await request(`${BASE_URL}/farmers`, {
    method: "POST",
    body: JSON.stringify({
      phone,
      name: "John Farmer",
      lat: -1.2921,
      lon: 36.8219,
      locationLabel: "Nairobi",
      cropType: "maize",
      alertTriggers: "rain,heat",
    }),
  });

  log("CREATE FARMER", res);
}

testCreateFarmer();