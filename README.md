<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0f2027,50:2c5364,100:00c6ff&height=220&section=header&text=Aetheria%20Weather%20Intelligence&fontSize=42&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Real-Time%20%E2%80%A2%203D%20Atmospheric%20%E2%80%A2%20Weather%20Intelligence&descAlignY=58&descSize=18" width="100%" alt="Aetheria banner"/>

<a href="https://github.com/ashirbad003">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=22&duration=2500&pause=800&color=00C6FF&center=true&vCenter=true&width=600&lines=Real+weather.+Real+intelligence.;3D+atmosphere+that+reacts+to+the+sky.;No+mock+data.+No+hardcoded+cities.;Built+by+Ashirbad+Pattnaik." alt="Typing SVG" />
</a>

<br/>

![Status](https://img.shields.io/badge/status-active-2c5364?style=for-the-badge&labelColor=0f2027)
![PWA](https://img.shields.io/badge/PWA-installable-00c6ff?style=for-the-badge&labelColor=0f2027)
![No Mock Data](https://img.shields.io/badge/data-100%25%20real--time-brightgreen?style=for-the-badge&labelColor=0f2027)
![Made with JS](https://img.shields.io/badge/JavaScript-ES2022-f7df1e?style=for-the-badge&logo=javascript&logoColor=000&labelColor=0f2027)
![Maps](https://img.shields.io/badge/Maps-Standard%20%7C%20Satellite-2c5364?style=for-the-badge&labelColor=0f2027)

<br/>

[![Live Demo](https://img.shields.io/badge/🌍%20LIVE%20DEMO-aetheria--weather--phi.vercel.app-00c6ff?style=for-the-badge&labelColor=0f2027)](https://aetheria-weather-phi.vercel.app)

</div>

---

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

---

## 🛠️ Tech Stack

<div align="center">

<img src="https://skillicons.dev/icons?i=html,css,js,react,nodejs,threejs,git,vscode&theme=dark" alt="tech stack icons"/>

</div>

---

## 🐍 Live Contribution Graph

<div align="center">

<img src="https://raw.githubusercontent.com/ashirbad003/ashirbad003/output/github-contribution-grid-snake.svg" alt="snake contribution graph" width="100%"/>

<sub>Animated automatically every 24h via GitHub Actions — see <code>.github/workflows/snake.yml</code></sub>

</div>

---

## 🎬 Demo

<div align="center">

### 🌍 [**Try Aetheria Live →**](https://aetheria-weather-phi.vercel.app)

<!--
  Add your own screen recording alongside the live link once ready:
  1. Record a short clip of the 3D atmosphere + search + map in action
  2. Convert it to a GIF (e.g. via ezgif.com or ScreenToGif)
  3. Upload it to your repo (e.g. /assets/demo.gif) and swap the src below
-->

<img src="./assets/demo.gif" alt="Aetheria live demo" width="90%"/>

<sub>🎥 Live 3D atmosphere, global search, and analytics — recorded from the actual running app</sub>

</div>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:00c6ff,50:2c5364,100:0f2027&height=120&section=footer" width="100%" alt="footer wave"/>
