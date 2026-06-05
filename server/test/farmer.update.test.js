const { BASE_URL, phone, log, request } = require("./utils");

async function testUpdateFarmer() {
  const res = await request(`${BASE_URL}/farmers/${phone}`, {
    method: "PUT",
    body: JSON.stringify({
      name: "John Updated Farmer",
      lat: -1.3,
      lon: 36.8,
      locationLabel: "Updated Nairobi",
      cropType: "maize",
      alertTriggers: "rain,heat,drought",
    }),
  });

  log("UPDATE FARMER", res);
}

testUpdateFarmer();