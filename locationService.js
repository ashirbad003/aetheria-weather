/**
 * Location Service
 * Handles Geocoding, Reverse Geocoding, Disambiguation, and Browser Geolocation.
 */
class LocationService {
    constructor() {
        this.cache = new Map();
        this.currentAbortController = null;
    }

    /**
     * Helper to fetch with a timeout
     */
    async fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const signal = options.signal || controller.signal;
            return await fetch(url, { ...options, signal });
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Search for locations matching a query string.
     * Returns an array of canonical locations for user selection / auto-selection.
     */
    async searchLocations(query) {
        if (!query || typeof query !== "string" || query.trim().length === 0) {
            throw new Error("Please enter a city, state, or country name.");
        }

        const cleanQuery = query.trim();
        const cacheKey = `search_${cleanQuery.toLowerCase()}`;

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Cancel in-flight search request if any
        if (this.currentAbortController) {
            this.currentAbortController.abort();
        }
        this.currentAbortController = new AbortController();

        try {
            // Build search terms list (including common phonetic/alternate spellings)
            const searchTerms = [cleanQuery];
            const lower = cleanQuery.toLowerCase();
            if (lower === "berhampur" || lower === "berhampura") {
                searchTerms.push("Brahmapur");
            }

            const fetchPromises = searchTerms.map(term => {
                const url = `${CONFIG.OPEN_METEO_GEOCODING_URL}?name=${encodeURIComponent(term)}&count=10&language=en&format=json`;
                return this.fetchWithTimeout(url, { signal: this.currentAbortController.signal })
                    .then(res => (res.ok ? res.json() : { results: [] }))
                    .catch(() => ({ results: [] }));
            });

            const resultsSets = await Promise.all(fetchPromises);
            const mergedResults = [];
            const seenIds = new Set();

            for (const data of resultsSets) {
                if (data.results && Array.isArray(data.results)) {
                    for (const item of data.results) {
                        const uniqueKey = `${item.latitude.toFixed(3)}_${item.longitude.toFixed(3)}`;
                        if (!seenIds.has(uniqueKey)) {
                            seenIds.add(uniqueKey);
                            mergedResults.push(item);
                        }
                    }
                }
            }

            if (mergedResults.length === 0) {
                return [];
            }

            // Sort by population descending so major cities / municipal corporations are prioritized
            mergedResults.sort((a, b) => (b.population || 0) - (a.population || 0));

            const formatted = mergedResults.map(item => ({
                id: item.id || `${item.latitude}_${item.longitude}`,
                name: item.name,
                admin1: item.admin1 || "", // State/Region
                admin2: item.admin2 || "", // County/District
                country: item.country || "",
                country_code: (item.country_code || "").toUpperCase(),
                latitude: item.latitude,
                longitude: item.longitude,
                timezone: item.timezone || "auto",
                elevation: item.elevation || 0,
                population: item.population || 0,
                displayName: this.formatDisplayName(item)
            }));

            this.cache.set(cacheKey, formatted);
            return formatted;
        } catch (error) {
            if (error.name === "AbortError") {
                return [];
            }
            console.error("Location search error:", error);
            throw error;
        }
    }

    /**
     * Reverse geocode latitude and longitude to get canonical city and country.
     */
    async reverseGeocode(latitude, longitude) {
        const cacheKey = `rev_${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Primary reverse geocode provider: BigDataCloud (Client-side free, fast)
            const bdcUrl = `${CONFIG.REVERSE_GEOCODE_URL}?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
            const response = await this.fetchWithTimeout(bdcUrl);

            if (response.ok) {
                const data = await response.json();
                const cityName = data.city || data.locality || data.principalSubdivision || "Selected Location";
                const adminName = data.principalSubdivision || "";
                const countryName = data.countryName || "";
                const countryCode = (data.countryCode || "").toUpperCase();

                const location = {
                    id: `${latitude.toFixed(4)}_${longitude.toFixed(4)}`,
                    name: cityName,
                    admin1: adminName,
                    country: countryName,
                    country_code: countryCode,
                    latitude: latitude,
                    longitude: longitude,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "auto",
                    displayName: [cityName, adminName, countryName].filter(Boolean).join(", ")
                };

                this.cache.set(cacheKey, location);
                return location;
            }
        } catch (err) {
            console.warn("Primary reverse geocode failed, trying fallback...", err);
        }

        // Fallback: OpenStreetMap Nominatim
        try {
            const nomUrl = `${CONFIG.NOMINATIM_REVERSE_URL}?lat=${latitude}&lon=${longitude}&format=json&zoom=10&addressdetails=1`;
            const response = await this.fetchWithTimeout(nomUrl, {
                headers: { "Accept-Language": "en" }
            });

            if (response.ok) {
                const data = await response.json();
                const addr = data.address || {};
                const cityName = addr.city || addr.town || addr.village || addr.municipality || addr.county || "Selected Location";
                const adminName = addr.state || addr.region || "";
                const countryName = addr.country || "";
                const countryCode = (addr.country_code || "").toUpperCase();

                const location = {
                    id: `${latitude.toFixed(4)}_${longitude.toFixed(4)}`,
                    name: cityName,
                    admin1: adminName,
                    country: countryName,
                    country_code: countryCode,
                    latitude: latitude,
                    longitude: longitude,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "auto",
                    displayName: [cityName, adminName, countryName].filter(Boolean).join(", ")
                };

                this.cache.set(cacheKey, location);
                return location;
            }
        } catch (err) {
            console.error("Nominatim reverse geocode failed:", err);
        }

        // Generic fallback when offline or unavailable
        return {
            id: `${latitude.toFixed(4)}_${longitude.toFixed(4)}`,
            name: `Lat: ${latitude.toFixed(2)}°, Lon: ${longitude.toFixed(2)}°`,
            admin1: "",
            country: "",
            country_code: "",
            latitude: latitude,
            longitude: longitude,
            timezone: "auto",
            displayName: `Coordinates (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`
        };
    }

    /**
     * Request browser geolocation
     */
    getCurrentPosition(options = { timeout: 10000, enableHighAccuracy: true }) {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Geolocation is not supported by your browser."));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                position => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                error => {
                    let msg = "Unable to retrieve your location.";
                    if (error.code === error.PERMISSION_DENIED) {
                        msg = "Location access was denied. Search for a city manually.";
                    } else if (error.code === error.POSITION_UNAVAILABLE) {
                        msg = "Location information is currently unavailable.";
                    } else if (error.code === error.TIMEOUT) {
                        msg = "Location request timed out. Please try again or search manually.";
                    }
                    const err = new Error(msg);
                    err.code = error.code;
                    reject(err);
                },
                options
            );
        });
    }

    /**
     * Helper to format readable display label
     */
    formatDisplayName(item) {
        const parts = [item.name];
        if (item.admin2 && item.admin2 !== item.name && item.admin2 !== item.admin1) {
            parts.push(item.admin2);
        }
        if (item.admin1 && item.admin1 !== item.name) {
            parts.push(item.admin1);
        }
        if (item.country) {
            parts.push(item.country);
        }
        return parts.join(", ");
    }
}

// Global instance
window.locationService = new LocationService();
