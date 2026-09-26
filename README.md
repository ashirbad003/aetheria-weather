# 🌌 Aetheria Weather Intelligence

**A premium, immersive, real-time weather intelligence platform** with a dynamic 3D atmospheric interface, interactive analytics, location discovery, live maps, and intelligent weather insights — all built on real, live data with zero mock values.

> Designed and Developed by **Ashirbad Pattnaik**

---

## ✨ Overview

Aetheria isn't just a weather app — it's a weather **intelligence** experience. Search any city on Earth and get a cohesive, single-source-of-truth view of its atmosphere: live conditions, forecasts, air quality, UV exposure, rain timelines, nearby places, and a 3D environment that visually reacts to the sky above that exact location.

Every module in the app — weather, forecast, charts, AQI, UV, city image, famous places, map, and the 3D scene — is driven by **one canonical location object**. Select a city once, and everything updates together. No mixed-location data, ever.

```json
{
  "name": "Puri",
  "state": "Odisha",
  "country": "India",
  "latitude": 19.8135,
  "longitude": 85.8312,
  "timezone": "Asia/Kolkata"
}
```

---

## 🚀 Core Features

| Category | What it does |
|---|---|
| 🔎 **Global City Search** | Worldwide geocoding with suggestions, keyboard navigation, ambiguous-city handling, loading/empty/error states |
| 🌤️ **Real-Time Weather** | Live temperature, feels-like, humidity, pressure, wind, visibility, sunrise/sunset — coordinate-based, always current |
| 📈 **Forecast & Analytics** | Hourly & daily forecasts with responsive temperature, humidity, rain-probability, and wind charts |
| 🌧️ **Rain Probability Timeline** | Dedicated precipitation timeline built from real forecast data — never inferred or randomized |
| 🫁 **Air Quality (AQI)** | PM2.5, PM10, CO, NO₂, SO₂, O₃ where the provider supports it |
| ☀️ **UV Index** | Real UV index, category, and contextual guidance |
| 🧠 **Weather Intelligence** | Human-readable insights generated from actual retrieved data (trends, rain likelihood, humidity, wind, visibility) |
| 🌌 **Dynamic 3D Atmosphere** | GPU-friendly, lightweight 3D/CSS environment that reacts to real conditions: Clear Day/Night, Cloudy, Rain, Thunderstorm, Snow, Fog |
| 🧊 **3D Glassmorphism UI** | Translucent layered cards, soft shadows, subtle depth, parallax and tilt interactions |
| 🖼️ **City Imagery** | Real, location-matched imagery from legitimate providers (e.g. Wikimedia/Unsplash/Pexels) with skeleton loading and fallbacks |
| 📍 **Famous Places** | Dynamically discovered points of interest near the selected coordinates — no hardcoded city → landmark mappings |
| 🗺️ **Interactive Map** | Standard & Satellite modes with markers, popups, and smooth flyTo transitions |
| ⭐ **Favorites & Recents** | LocalStorage-backed favorite cities and recent searches with duplicate prevention |
| 🌡️ **Unit System** | °C/°F and km/h/mph, persisted locally |
| 📤 **Share & Snapshot** | Share current conditions via the Web Share API (clipboard fallback) or generate a clean visual snapshot |
| 🔄 **Controlled Auto-Refresh** | Non-aggressive refresh with a visible "Last Updated" timestamp and manual refresh |
| 📡 **Offline Mode** | Detects connectivity, clearly labels stale/cached data, and refreshes safely on reconnect |
| 📱 **PWA** | Installable, with manifest, service worker, icons, and safe asset caching (never caches live weather as "fresh") |

---

## 🖤 Design Principles

- **One truth, everywhere** — a single canonical location drives every module; no stale or mismatched city data.
- **Real data only** — no fake weather values, no hardcoded city→landmark mappings, no invented metrics. If a provider doesn't return a value, the UI says *"Data unavailable"* instead of guessing.
- **Premium, not noisy** — glassmorphism, atmospheric gradients, and subtle depth, without excessive glow, clutter, or motion.
- **Lightweight 3D** — atmospheric effects lean on CSS transforms, opacity, and efficient canvas rendering rather than heavy, continuous JS render loops.
- **Accessible by default** — semantic HTML, full keyboard navigation, ARIA labeling, readable contrast, and full `prefers-reduced-motion` support.
- **Mobile-first, not mobile-afterthought** — every module (search, charts, map, 3D effects, footer) is tuned for touch and small screens with zero horizontal overflow.

---

## 🏗️ Architecture

Each external integration lives in its own dedicated service layer — no scattered API calls inside UI components.

```
services/
├── weatherService.js     # Current weather + forecast (coordinate-based)
├── locationService.js    # Geocoding, city search, timezone resolution
├── imageService.js       # City imagery (Wikimedia / Unsplash / Pexels)
├── placesService.js      # Dynamic points-of-interest discovery
└── storageService.js     # Favorites, recents, unit preferences (localStorage)
```

**State flow on city selection:**

```
User selects a city
        │
        ▼
Update canonical location state
        │
        ├── Fetch weather
        ├── Fetch forecast
        ├── Update charts
        ├── Update AQI
        ├── Update UV
        ├── Update city image
        ├── Update famous places
        ├── Update map
        ├── Update 3D atmosphere
        └── Update weather intelligence
```

Request identity checks / cancellation prevent an in-flight response for a previously selected city from overwriting the currently selected one.

**Centralized weather-state mapper:** all provider conditions are normalized into one internal set of states —
`CLEAR · CLOUDY · RAIN · THUNDERSTORM · SNOW · FOG · NIGHT` — which drives the 3D background, icons, footer glow, and overall theme consistently, with no duplicate/conflicting logic across files.

---

## 🗺️ Map Modes

Only two map modes are supported:

- **Standard**
- **Satellite**

There is intentionally **no Dark mode** — any legacy CARTO Dark Matter tiles, dark-map buttons, handlers, or related config are fully removed from the codebase (not just hidden).

Switching modes preserves center, zoom, the selected-location marker, famous-place markers, and open popups.

---

## ⚙️ Getting Started

```bash
# clone
git clone <repo-url>
cd aetheria-weather-intelligence

# install dependencies
npm install

# configure environment
cp .env.example .env
# add your API keys (weather provider, geocoding, image provider, etc.)

# run locally
npm run dev
```

**Environment variables** (see `.env.example`):

```
WEATHER_API_KEY=
GEOCODING_API_KEY=
IMAGE_PROVIDER_API_KEY=
PLACES_API_KEY=
```

`.env` is git-ignored — never commit real keys.

---

## ✅ Quality Bar

- No hardcoded or fabricated weather/city data anywhere in the app
- No exposed secrets or API keys client-side
- No duplicate network requests, memory leaks, or repeated chart instances
- No uncaught console errors under normal use
- Tested across 320px → 1920px viewports with zero horizontal overflow
- Verified end-to-end across multiple cities (India, global) for search → weather → forecast → charts → AQI → UV → image → places → map → favorites → units

---

## 📄 License

All rights reserved © Ashirbad Pattnaik.

---

<div align="center">

**✦ CREATOR ✦**

Designed and Developed by

**ASHIRBAD PATTNAIK**

───── ✦ ─────

*Aetheria Weather Intelligence*

[GitHub](https://github.com/ashirbad003) · [Portfolio](https://ashirbad-portfolio-six.vercel.app)

</div>
