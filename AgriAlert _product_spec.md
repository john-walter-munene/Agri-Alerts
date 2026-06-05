# AgriAlert Product Spec

> **Scope note**: This spec is calibrated for a **48-hour take-home build**. It deliberately trades some production-grade infrastructure (Postgres, scheduled cron, OTP auth) for a demoable vertical slice. Every cut is paired with the production replacement under [Production Path](#production-path-what-replaces-each-mvp-shortcut).

## What We're Building

**AgriAlert** is a weather intelligence platform for farmers. It combines real-time weather data with AI-generated agronomic insights to help farmers make better decisions, delivered via a clean web dashboard.

Farmers register once with their phone number, location, and crop type. The platform evaluates weather conditions against crop-aware risk triggers and surfaces AI-powered recommendations relevant to what they're growing.

## The Problem

Farmers in Africa make critical decisions — when to plant, when to irrigate, when to protect livestock — based on incomplete or irrelevant weather information. Generic weather apps don't understand crops, risk thresholds, or local agronomic context.

**AgriAlert closes that gap**: AI-interpreted weather data, contextualized per farm and crop, evaluated on every dashboard load.

---

## MVP Feature Set

### Farmer Profile
- Register with **phone number + name + location + primary crop type**
- Phone is the unique identifier (no passwords, no OTP — trust-based for the demo)
- Location stored as lat/lon (resolved from a city/region picker)
- Crop options: Maize, Tea, Wheat, Beans, Sorghum, Mixed
- **One pre-seeded demo farmer** so reviewers can see the dashboard in zero clicks

### Farm Dashboard
- **Current conditions**: temp, humidity, wind, UV index, precipitation
- **AI agronomic insight**: Gemini-powered summary from `/v1/insights`, e.g. *"High humidity overnight increases late blight risk for bean crops. Consider fungicide application before Thursday."*
- **7-day forecast grid**: daily high/low, rain probability, crop-risk badge per day
- **Hourly chart**: 24h temperature + precipitation curve (Recharts)
- **"Ask about my farm"** free-text box → forwards to `/v1/insights` with crop + location context. The wow moment.
- **"Re-check conditions"** button → forces fresh forecast fetch + alert re-evaluation, bypassing the cache

### Alert Engine (synchronous, evaluated on dashboard load)
- Pure-function evaluator: `evaluateAlerts(forecast, farmer) → EvaluatedAlert[]`
- Triggers: `rain`, `frost`, `extreme_wind`, `drought` — each a standalone evaluator over the forecast payload
- Generates a crop-aware AI alert message per matched trigger via `/v1/insights`
- Persists matched alerts to SQLite, deduped by `(farmerId, triggerType, forecastDate)`
- Surfaced inline on the dashboard **and** in the "My Alerts" feed
- **Not on a cron.** See [Architectural Decisions](#architectural-decisions) and [Production Path](#production-path-what-replaces-each-mvp-shortcut).

### Alerts History
- Chronological feed of past evaluated alerts per farmer
- Each alert shows: trigger type, severity, AI recommendation, timestamp

### Settings
- Update crop type
- Toggle alert triggers (enabled triggers filter which evaluators run)

---

## Stack

| Layer | Tech | Why |
|---|---|---|
| Frontend | React 18 + Vite | Fast DX, strong ecosystem |
| Styling | Tailwind CSS + shadcn/ui | Polished UI without custom CSS overhead |
| Data fetching | TanStack Query | Cache, refetch, loading states built-in |
| Charts | Recharts | Lightweight, React-native, responsive |
| Backend | Node.js 20 + Express + TypeScript | Plays to strengths, clean separation |
| Database | **PostgreSQL** (file-based, via Prisma) | Zero infra, deploys with the app, same queries as Postgres|
| ORM | Prisma | Type-safe queries, schema is Postgres-portable |
| API | WeatherAI (Pro): `/v1/insights`, `/v1/weather`, `/v1/weather-geo` | Core data source |
| Frontend hosting | Netlify | 1-command deploy, free |
| Backend hosting | Render | Free tier; SQLite file lives on the instance disk |
| Monorepo | `/client` + `/server` under one repo | Single GitHub link for submission |

> **What's gone vs. v1**: Postgres, `node-cron` scheduler (→ synchronous evaluation), OTP/auth (→ phone-as-ID).

---

## Data Model (PostgreSQL via Prisma)

```prisma
model Farmer {
  id            String   @id @default(uuid())
  phone         String   @unique
  name          String
  lat           Float
  lon           Float
  locationLabel String?
  cropType      String
  alertTriggers String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  alerts Alert[]
}

model Alert {
  id           String   @id @default(uuid())
  farmerId     String
  triggerType  String
  severity     String
  aiMessage    String?
  forecastDate String
  rawWeather   String?
  createdAt    DateTime @default(now())

  farmer Farmer @relation(fields: [farmerId], references: [id], onDelete: Cascade)

  @@unique([farmerId, triggerType, forecastDate])
}
```

> `alertTriggers` and `rawWeather` are JSON-encoded strings on SQLite; on Postgres these become `String[]` and `Json`. The Prisma client API surface stays nearly identical — porting is a schema diff, not a rewrite.

---

## API Surface (Express)

```
POST   /api/farmers                     Register farmer
GET    /api/farmers/:phone              Fetch profile by phone
PUT    /api/farmers/:phone              Update profile / settings

GET    /api/farmers/:phone/dashboard    Current + 7-day + hourly + AI insight + evaluated alerts (single response)
POST   /api/farmers/:phone/ask          Free-text "Ask about my farm" → /v1/insights with crop context
GET    /api/farmers/:phone/alerts       Alert history (persisted)

GET    /api/health                      Render health check
```

> **Consolidation**: `/forecast`, `/current`, and alert evaluation collapse into a single `/dashboard` endpoint. One round-trip from the client, one place server-side to apply the rate-limit guard, and the alert evaluator runs over the same forecast payload that powers the UI — no second WeatherAI call.

---

## Architectural Decisions

1. **Phone as identifier (no auth)**: matches real-world farmer identity, no password UX friction. Acceptable for a demo; production needs OTP.

2. **Server-side API proxy**: WeatherAI key never touches the browser. All `/v1/*` calls flow through Express.

3. **AI quota protection**: server tracks `X-RateLimit-Remaining` from WeatherAI responses; when < 50 credits remain, falls back to `?ai=false` + a static crop-aware advisory string. Insight calls are also short-circuited if no triggers fire.

4. **🔑 Alerts as derived state, not scheduled work** *(the core architectural move)*:
    - The alert engine is a **pure function** over the forecast payload — `evaluateAlerts(forecast, farmer)`.
    - It runs **synchronously on dashboard load**, not on a cron.
    - Why: in the MVP there is no push channel (no Telegram, no SMS, no email), so a 6-hour cron has no consumer. Scheduling work that has no destination is dead code.
    - **Decoupling alert *logic* from alert *delivery*** means the same evaluator powers (a) the dashboard today, (b) a `node-cron` worker once Telegram lands in Phase 2, and (c) WeatherAI webhook handlers in Phase 3. No rewrites — just new callers.
    - Bonus: trivially unit-testable (pure function, no I/O), instantly demoable (no "trust me, the cron ran at 3am"), and immune to Render free-tier sleep cycles that would otherwise kill a cron.

5. **Single `/dashboard` endpoint**: one forecast fetch powers the UI **and** the alert evaluator. Halves the WeatherAI call volume vs. separate `/current` + `/forecast` + `/alerts/evaluate` endpoints.

6. **Forecast caching (30 min, in-memory per farmer)**: protects the WeatherAI quota under repeated dashboard loads. The "Re-check conditions" button passes `?force=true` to bypass.

7. **Crop-type context in AI requests**: location + crop type are injected into every `/v1/insights` prompt — this is the single biggest differentiator vs. a generic weather app and is what makes the output regionally and agronomically relevant.

8. **SQLite over Postgres for MVP**: Prisma schema stays Postgres-portable. Saves 3–5h of hosted-DB provisioning + migration setup that adds no demo value in 48h. Schema-level differences are isolated to two fields (`alertTriggers`, `rawWeather`).

---

## Production Path (what replaces each MVP shortcut)

| MVP shortcut | Production replacement | When |
|---|---|---|
| **Synchronous alert evaluation** on dashboard load | `node-cron` worker invoking the *same* `evaluateAlerts()` function every 6h, dispatching matched alerts via `ChannelDispatcher` to Telegram / SMS / email | Phase 2 (when a push channel exists) |
| **`node-cron` polling** (Phase 2) | WeatherAI native webhooks (`/v1/webhooks`), per-farm trigger subscriptions, with a deduplication layer | Phase 3 |
| **SQLite file** | Managed Postgres (Supabase / Neon / Render Postgres). Schema port = swap two field types; queries unchanged. | Phase 2 |
| **Phone-as-ID, no auth** | SMS OTP via WeatherAI `/v1/sms/*` or Twilio; signed JWT session | Phase 2 |
| **In-memory forecast cache** | Redis with per-farmer keys + TTL; shared across instances | When horizontally scaling |
| **No background workers** | Dedicated worker process (separate Render service) running cron + webhook handlers; web tier becomes pure read API | Phase 3 |
| **No alert delivery channel** | `ChannelDispatcher` interface with Telegram / SMS / email implementations; alerts table gains `deliveredAt`, `deliveryChannel` columns | Phase 2 |
| **No observability** | Structured logging (pino) + Sentry + WeatherAI quota dashboard | Phase 2 |

---

## Future Roadmap

### Phase 2: Telegram Bot + Scheduled Delivery
- Farmers link Telegram account via a 6-digit code on the web dashboard
- Bot commands: `/forecast`, `/alerts`, `/stop`, `/resume`
- `node-cron` worker runs every 6h, calls the existing `evaluateAlerts()` pure function, dispatches matched alerts via `ChannelDispatcher` to in-app feed + Telegram
- Migrate SQLite → Postgres
- Add SMS OTP for registration

### Phase 3: Webhook-Driven Alerts
- Replace polling cron with WeatherAI native webhooks (`/v1/webhooks`)
- Per-farm webhook subscriptions per trigger type
- Near-real-time alerts vs. 6-hour polling
- Deduplication layer on `(farmerId, triggerType, forecastDate)` to prevent flooding

### Phase 4: Cooperative / Group Features
- Field officers manage groups of farmers
- Broadcast alerts to a cooperative zone (bounding box of farms)
- Group-level weather risk summary for NGO/extension officer dashboards

### Phase 5: SMS Delivery (Scale plan)
- Integrate WeatherAI `/v1/sms/alert` for direct SMS (no smartphone needed)
- `/v1/sms/bomet/register` for official Bomet Agricultural Alert System integration
- USSD menu support for feature phones

### Phase 6: Data & Analytics
- Crop yield correlation tracking (manual farmer input)
- Alert accuracy feedback loop ("Did it actually rain?")
- Export to CSV for NGO reporting
- REST API for integration with government agricultural systems
