const { GoogleGenerativeAI } = require("@google/generative-ai");
const { HttpError } = require("../../lib/httpError");

/**
 * Lazy Gemini client. We avoid initializing at module-load so the server can
 * still boot (and serve health/dashboard) when GEMINI_API_KEY is absent —
 * useful for reviewers who only set WEATHER_API_KEY. The Ask flow itself will
 * surface a clean 503 instead.
 */
let cachedModel = null;
const getModel = () => {
  if (cachedModel) return cachedModel;
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new HttpError(
      503,
      "Ask is unavailable: GEMINI_API_KEY is not configured"
    );
  }
  const genAI = new GoogleGenerativeAI(key);
  cachedModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  return cachedModel;
};

const generateAgriculturalAdvice = async (input) => {
  const prompt = `
    You are an agricultural expert helping smallholder farmers in Kenya.

    Your goal is to provide practical, localized, and actionable farming advice.

    Rules:
    - Keep recommendations short and practical.
    - Consider rainfall, temperature, humidity, and wind.
    - Consider the farmer's crop type.
    - Mention risks if present.
    - Recommend actions the farmer should take.
    - Answer clearly for smallholder farmers.

    Farmer: ${JSON.stringify(input.farmer, null, 2)}
    Weather Forecast (Daily): ${JSON.stringify(input.weather.daily, null, 2)}
    Risk Alerts: ${JSON.stringify(input.alerts, null, 2)}
    Farmer Question: ${input.question || "Provide general farming advice based on current conditions"}

    Response Format:
    1. Summary
    2. Risks
    3. Recommended Actions
    `;

  const model = getModel();

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (err) {
    console.error("Gemini error:", err.message);
    // Don't leak the underlying provider error to the client.
    throw new HttpError(502, "AI provider error — please try again shortly");
  }
};

module.exports = { generateAgriculturalAdvice };