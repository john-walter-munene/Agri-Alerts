const { request, BASE_URL, phone, log } = require("./utils");

async function testCustomAsk() {
  try {
    const res = await request(`${BASE_URL}/farmers/${phone}/ask`, {
      method: "POST",
      body: JSON.stringify({
        mode: "custom",
        question: "Should I irrigate my maize this week?",
      }),
    });

    log("CUSTOM ASK", res);
  } catch (err) {
    console.error("ASK TEST FAILED:", err);
  }
}

async function testAutoAsk() {
  try {
    const res = await request(`${BASE_URL}/farmers/${phone}/ask`, {
      method: "POST",
      body: JSON.stringify({
        mode: "auto",
        question: "", // intentionally empty to test fallback
      }),
    });

    log("AUTO ASK (FALLBACK MODE)", res);
  } catch (err) {
    console.error("AUTO ASK TEST FAILED:", err);
  }
}

// Sequential tests.
async function run() {
  await testCustomAsk();
  await testAutoAsk();
}

run();