/**
 * Application Configuration & API Settings
 * Default providers (Open-Meteo & Wikimedia Commons) require no API keys,
 * ensuring high reliability, zero rate-limit issues, and real global coverage.
 */
const CONFIG = {
    APP_NAME: "Aetheria Global 3D Weather",
    APP_VERSION: "2.0.0",
    AUTHOR: "Ashirbad Pattnaik",

    // Primary Free & Keyless Endpoints
    OPEN_METEO_GEOCODING_URL: "https://geocoding-api.open-meteo.com/v1/search",
    OPEN_METEO_WEATHER_URL: "https://api.open-meteo.com/v1/forecast",
    OPEN_METEO_AIR_QUALITY_URL: "https://air-quality-api.open-meteo.com/v1/air-quality",
    REVERSE_GEOCODE_URL: "https://api.bigdatacloud.net/data/reverse-geocode-client",
    NOMINATIM_REVERSE_URL: "https://nominatim.openstreetmap.org/reverse",
    WIKIPEDIA_REST_API: "https://en.wikipedia.org/api/rest_v1/page/summary",
    WIKIMEDIA_SEARCH_API: "https://commons.wikimedia.org/w/api.php",

    // Optional API Keys (Leave blank to use robust keyless defaults)
    OPENWEATHER_API_KEY: "",
    UNSPLASH_ACCESS_KEY: "",

    // Default settings
    DEFAULTS: {
        CITY: "Bhubaneswar",
        COUNTRY: "India",
        LATITUDE: 20.2961,
        LONGITUDE: 85.8245,
        TIMEZONE: "Asia/Kolkata",
        TEMP_UNIT: "C", // 'C' or 'F'
        WIND_UNIT: "kmh", // 'kmh' or 'mph'
        THEME: "auto", // 'auto', 'dark', 'light'
        AUTO_REFRESH_INTERVAL_MS: 10 * 60 * 1000 // 10 minutes
    },

    STORAGE_KEYS: {
        FAVORITES: "aetheria_weather_favorites_v2",
        RECENT_SEARCHES: "aetheria_weather_recent_v2",
        PREFERENCES: "aetheria_weather_preferences_v2",
        LAST_LOCATION: "aetheria_weather_last_location_v2"
    }
};

// Export for module or global use
if (typeof window !== "undefined") {
    window.CONFIG = CONFIG;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = CONFIG;
}