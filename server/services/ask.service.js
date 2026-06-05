const { findFarmerOr404, hydrateFarmer } = require("./farmer.service");
const { fetchWeather } = require("./weather.service");
const { evaluateAlerts } = require("./alert/alert.engine");
const { generateAgriculturalAdvice } = require("./ai/gemini.service");

/**
 * "Ask about my farm" — free-text Q&A grounded in the farmer's location, crop
 * type, live forecast, and any active alerts.
 *
 * On WeatherAI Free this routes to Gemini. To switch to WeatherAI Pro, swap
 * `generateAgriculturalAdvice` for a `/v1/insights` call; the input + output
 * shape stay identical.
 */
const askFarmerService = async (phone, input = {}) => {
  const farmer = hydrateFarmer(await findFarmerOr404(phone));

  const weather = await fetchWeather(farmer.lat, farmer.lon);
  const alerts = evaluateAlerts(farmer, weather);

  const mode = input.mode || "custom";
  const question =
    mode === "auto"
      ? "Generate general farming advice based on current weather, crop type, and risk alerts."
      : input.question.trim();

  const aiAnswer = await generateAgriculturalAdvice({
    farmer,
    weather,
    alerts,
    question,
    mode,
  });

  return {
    question,
    mode,
    farmer,
    weather,
    alerts,
    aiAnswer,
  };
};

module.exports = { askFarmerService };