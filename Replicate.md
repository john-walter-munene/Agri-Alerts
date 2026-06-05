# AgriAlert — Local Setup Guide

This guide explains how to clone and run **AgriAlert** locally.

## 1. Clone the Repository

```bash
git clone https://github.com/john-walter-munene/Agri-Alerts.git
cd Agri-Alerts
```

---

## 2. Install Dependencies

From the project root:

```bash
npm install
```

This installs dependencies for the monorepo workspace.

---

## 3. Configure the Backend

Navigate into the server directory:

```bash
cd server
```

Create a `.env` file inside `server/`.

Add the following environment variables:

```env
# Server
PORT=3000

# Allowed frontend origin
CORS_ORIGIN=http://localhost:5173

# Database (PostgreSQL / Neon)
DATABASE_URL=your_database_url_here

# WeatherAI
WEATHER_API_KEY=your_weather_ai_key_here
WEATHER_API_BASE_URL=https://api.weather-ai.co

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key_here
```

### Required API Keys
- **WeatherAI API Key**
- **Google Gemini API Key**
- **PostgreSQL/Neon Database URL**

---

## 4. Generate Prisma Client & Database Schema

Still inside `server/`, run:

```bash
npx prisma generate
npx prisma migrate deploy
```

If running locally for the first time and you want fresh development migrations:

```bash
npx prisma migrate dev
```

(Optional) Verify schema:

```bash
npx prisma validate
```

---

## 5. Start the Backend

From the `server/` directory:

```bash
node app.js
```

The API should now run on:

```txt
http://localhost:3000
```

Health check:

```txt
http://localhost:3000/api/health
```

---

## 6. Configure the Frontend

Open a new terminal and move into the client:

```bash
cd client
```

Create a `.env.local` file:

```env
VITE_API_BASE_URL=http://localhost:3000
```

---

## 7. Run the Frontend

Start the development server:

```bash
npm run dev
```

The frontend should run on:

```txt
http://localhost:5173
```

---

## 8. Production Build (Optional)

To test a production build locally:

```bash
npm run build
npm run preview
```

---

## Expected Flow

Once both services are running:

1. Backend → `localhost:3000`
2. Frontend → `localhost:5173`
3. Register a farmer
4. View dashboard insights
5. Test **Ask About My Farm** AI recommendations

The application should now be fully functional locally.