# AETHERIA 3D — Global Real-Time Weather Intelligence Platform

![Aetheria 3D Weather Platform](https://img.shields.io/badge/Release-v2.0.0-blue.svg)
![Real Weather](https://img.shields.io/badge/Weather%20Data-100%25%20Real%20API-emerald.svg)
![License](https://img.shields.io/badge/License-MIT-purple.svg)

A state-of-the-art, production-grade 3D global weather intelligence dashboard built with modern web technologies, real-time meteorological API pipelines, dynamic city photography, interactive analytics charts, and 3D glassmorphic interactions.

Designed and Developed by **Ashirbad Pattnaik**.

---

## 🌟 Key Highlights & Features

1. **100% Real Global Weather Data**: Powered by Open-Meteo High-Resolution Numerical Meteorological models. No fake data, no hardcoded fallbacks.
2. **Global Coordinate Geocoding & Disambiguation**: Search any city, state, or country worldwide (e.g., Tokyo, London, Bhubaneswar, Paris, New York). Intelligent disambiguation for shared names (e.g., Springfield).
3. **Current GPS Location (One-Click)**: Browser Geolocation API integration with automatic reverse geocoding to canonical city/region/country.
4. **Dynamic City Photography**: Real-time representative high-resolution photographs fetched asynchronously from Wikipedia & Wikimedia Commons.
5. **Real Local Time Synchronization**: Live running clock calculating the selected city's exact IANA timezone (`Intl.DateTimeFormat`).
6. **24-Hour Hourly & 7-Day Daily Forecast**: Complete timeline with WMO weather codes, precipitation probability, and wind metrics.
7. **Interactive Visual Analytics (Chart.js)**:
   - 24-Hour Temperature Spline Area Chart (Ambient vs. Feels-like)
   - 24-Hour Humidity & Precipitation Probability Combo Chart
   - 24-Hour Wind Speed Curve
8. **Solar Trajectory Arc**: Visual representation of sunrise, solar noon, and sunset calculating the sun/moon's actual position along a quadratic bezier curve.
9. **Interactive Geographic Radar Map**: Built with Leaflet.js and CartoDB Voyager tiles, auto-centering on coordinates with animated radar pulse beacon.
10. **Favorite Cities & Recent Searches**: Persistent storage using `localStorage` with offline protection, fast switching, and live data synchronization.
11. **Unit Conversions**: Instant mathematical conversion between Metric (°C, km/h, km) and Imperial (°F, mph, mi) without redundant network requests.
12. **Dynamic Atmospheric Themes & Canvas Particle Physics**:
    - Rain system with random thunderstorm lightning flashes
    - Snow particle physics
    - Sunbeam floating ambient particles for daytime
    - Starfield twinkle generator for clear night skies
13. **3D Glassmorphism & Parallax Tilt**: Interactive card physics on desktop reacting to cursor coordinates, disabled gracefully for touch and reduced-motion settings.
14. **Weather Sharing & Snapshot**: Native Web Share API + formatted summary clipboard copy with high-definition passport card preview.
15. **Offline Resiliency**: Automatic network detection (`online`/`offline` listeners) with honest status indicator.

---

## 🛠️ Architecture & Technology Stack

- **Frontend Core**: Semantic HTML5, Modular Modern JavaScript (ES6+ Vanilla), CSS3 with Custom Properties & Glassmorphism.
- **Charts Engine**: [Chart.js 4.4+](https://www.chartjs.org/)
- **Map & Radar**: [Leaflet.js 1.9+](https://leafletjs.com/) with CartoDB Tile Layer.
- **Weather Provider**: [Open-Meteo API](https://open-meteo.com/) (Keyless, high-resolution global numerical weather prediction).
- **Geocoding & Reverse Geocoding**: Open-Meteo Geocoding API & BigDataCloud / OpenStreetMap Nominatim.
- **Dynamic City Image Provider**: Wikipedia REST API & Wikimedia Commons API.
- **Typography**: Google Fonts (`Outfit` & `Inter`).

---

## 📂 Project Structure

```
weather_app/
├── index.html              # Modern, accessible, semantic HTML5 structure
├── style.css               # Design system, 3D transforms, glassmorphism & responsive layout
├── script.js               # Master orchestrator, event listeners, canvas physics, DOM controller
├── weatherService.js       # Open-Meteo API pipeline, WMO parser, deterministic insights
├── locationService.js      # Geocoding, reverse geocoding & browser geolocation
├── imageService.js         # Wikipedia/Wikimedia dynamic city photography pipeline
├── storageService.js       # LocalStorage wrapper for favorites, recents, and preferences
├── config.js               # Application configuration & API endpoint definitions
├── .env.example            # Environment configuration template
├── .gitignore              # Ignored files and secrets
└── README.md               # Complete project documentation
```

---

## 🚀 How to Run Locally

### Method 1: Using Any Local Web Server (Recommended)
You can serve the application with any static HTTP server:

```bash
# Using Node.js npx serve
npx serve .

# OR using Python 3
python -m http.server 8000

# OR using VS Code Live Server extension
# Right-click index.html -> "Open with Live Server"
```

Then navigate to `http://localhost:8000` (or the provided port) in your browser.

### Method 2: Direct Browser Execution
Simply double-click `index.html` to open it in Chrome, Edge, Firefox, or Safari.

---

## 🧪 Testing Guide

| Feature | Test Case | Expected Behavior |
| :--- | :--- | :--- |
| **Search** | Type `"Tokyo"` or `"Bhubaneswar"` and press Enter | Resolves coordinates, fetches live weather, local time, hourly forecast, and city photo. |
| **Ambiguity** | Type `"Springfield"` | Displays disambiguation dropdown (Illinois, Missouri, Massachusetts, etc.) for selection. |
| **Invalid Search** | Type `"xyz123456nonexistent"` | Shows user-friendly toast: *"Location not found. Please verify spelling."* |
| **GPS Geolocation**| Click **"My Location"** | Prompts browser permission, retrieves coordinates, reverse geocodes city, and displays live weather. |
| **Units** | Click **°F** or **°C** | Instantly converts all temperatures, ranges, feels-like, and chart data without reloading. |
| **Favorites** | Click **☆** on any city | Adds to Favorites drawer. Clicking it from the drawer loads fresh live weather. |
| **Offline** | Disconnect Internet | Displays red top banner: *"You are currently offline. Displaying cached weather data."* |

---

## 🔒 Security & Best Practices

- **Zero Hardcoded Secrets**: Default services operate keylessly through public, licensed APIs.
- **XSS Prevention**: DOM nodes are created safely using `textContent` and sanitized structures.
- **Accessible (A11y)**: Focus rings, ARIA labels, semantic landmark elements, high color contrast, and `@media (prefers-reduced-motion: reduce)`.

---

## 👤 Author & Credits

Designed and Developed by **Ashirbad Pattnaik**
