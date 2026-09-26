/**
 * ==========================================================================
 * AETHERIA WEATHER - PLACES & NOTABLE ATTRACTIONS SERVICE
 * Dynamically discovers famous places, historical landmarks, temples,
 * nature spots, museums, and notable POIs for any searched location coordinates.
 * Strictly keyless, free, authentic data with no hardcoded city-to-place mappings.
 * ==========================================================================
 */

class PlacesService {
    constructor() {
        this.cache = new Map();
        this.currentAbortController = null;
    }

    /**
     * Helper to fetch with timeout and CORS origin headers
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
     * Calculate Great Circle distance between two points using Haversine formula (in km)
     */
    calculateDistanceKm(lat1, lon1, lat2, lon2) {
        if (typeof lat1 !== "number" || typeof lon1 !== "number" ||
            typeof lat2 !== "number" || typeof lon2 !== "number") {
            return null;
        }
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return parseFloat((R * c).toFixed(1));
    }

    /**
     * Classify landmark / attraction based on title and encyclopedic extract
     */
    classifyPlace(title, extract) {
        const text = `${title} ${extract || ""}`.toLowerCase();

        // 1. Religious Heritage
        if (/temple|mandir|church|cathedral|mosque|shrine|monastery|pagoda|basilica|gurdwara|synagogue|sanctum|deity|hindu|buddhist|christian|islamic|abbey|chapel/.test(text)) {
            return { category: "Religious Heritage", icon: "🛕", type: "religious" };
        }
        // 2. Historical & Heritage
        if (/fort|palace|castle|monument|tomb|mausoleum|citadel|heritage|archaeolog|ancient|ruin|memorial|historic|dynasty|empire|gate|pillar|amphitheatre|colosseum/.test(text)) {
            return { category: "Historical Landmark", icon: "🏰", type: "historical" };
        }
        // 3. Nature & Scenic
        if (/beach|waterfall|lake|river|hill|mountain|peak|island|forest|valley|sanctuary|wildlife|park|garden|botanical|nature|reef|cliff|caves|gorge|lagoon/.test(text)) {
            return { category: "Nature & Scenic", icon: "🌿", type: "nature" };
        }
        // 4. Cultural & Arts
        if (/museum|gallery|theatre|theater|exhibition|cultural|art|planetarium|aquarium|observatory|opera|library|concert hall/.test(text)) {
            return { category: "Cultural & Arts", icon: "🏛️", type: "cultural" };
        }
        // 5. Notable Landmarks & Public Architecture
        if (/tower|bridge|square|plaza|promenade|market|bazaar|ferris|statue|center|landmark|viewpoint|lookout|stadium|arena|arch/.test(text)) {
            return { category: "Notable Landmark", icon: "📍", type: "landmark" };
        }

        return { category: "Attraction & Leisure", icon: "⭐", type: "attraction" };
    }

    /**
     * Generate weather-aware context message for places based on actual current weather
     */
    getWeatherContext(weatherData) {
        if (!weatherData || !weatherData.current) {
            return { icon: "🌤️", message: "Live conditions updated." };
        }
        const cur = weatherData.current;
        const code = cur.wmo?.iconType || "";

        if (cur.tempC >= 36) {
            return { icon: "🌡️", message: `High temperature (${Math.round(cur.tempC)}°C) reported — stay hydrated.` };
        }
        if (code.includes("rain") || code.includes("drizzle")) {
            return { icon: "🌧️", message: "Rain is currently reported — indoor visits advised." };
        }
        if (code.includes("thunderstorm")) {
            return { icon: "⛈️", message: "Thunderstorm activity reported in region." };
        }
        if (code.includes("snow") || code.includes("blizzard")) {
            return { icon: "❄️", message: "Snow conditions reported in area." };
        }
        if (code.includes("fog")) {
            return { icon: "🌫️", message: "Reduced visibility due to mist/fog." };
        }
        if (code.includes("cloud")) {
            return { icon: "☁️", message: "Cloudy skies reported." };
        }
        return { icon: "☀️", message: "Current skies are clear." };
    }

    /**
     * Master Discovery Function:
     * Discovers notable places belonging to the canonical searched location.
     */
    async fetchPlacesForLocation(location, weatherData = null) {
        if (!location || typeof location.latitude !== "number" || typeof location.longitude !== "number") {
            throw new Error("Valid canonical location coordinates are required for place discovery.");
        }

        const cacheKey = `places_${location.latitude.toFixed(3)}_${location.longitude.toFixed(3)}`;
        const now = Date.now();

        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (now - cached.timestamp < 10 * 60 * 1000) { // 10 min cache
                return cached.data;
            }
        }

        // Cancel previous pending search
        if (this.currentAbortController) {
            this.currentAbortController.abort();
        }
        this.currentAbortController = new AbortController();

        try {
            const lat = location.latitude;
            const lon = location.longitude;
            const cityName = location.name;

            // 1. Wikipedia Geosearch around coordinates (10,000m max supported radius)
            const geoUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${lat}|${lon}&ggsradius=10000&ggslimit=45&prop=pageimages|extracts|info|coordinates&piprop=thumbnail&pithumbsize=600&exintro=1&explaintext=1&exchars=280&inprop=url&format=json&origin=*`;

            // 2. City landmark & notable places search
            const searchTerms = `${cityName} landmarks OR attractions OR tourist OR monuments OR museum OR temple OR fort`;
            const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchTerms)}&gsrlimit=25&prop=pageimages|extracts|info|coordinates&piprop=thumbnail&pithumbsize=600&exintro=1&explaintext=1&exchars=280&inprop=url&format=json&origin=*`;

            const [geoRes, searchRes] = await Promise.all([
                this.fetchWithTimeout(geoUrl, { signal: this.currentAbortController.signal })
                    .then(res => (res.ok ? res.json() : {}))
                    .catch(() => ({})),
                this.fetchWithTimeout(searchUrl, { signal: this.currentAbortController.signal })
                    .then(res => (res.ok ? res.json() : {}))
                    .catch(() => ({}))
            ]);

            const allPages = {
                ...(geoRes.query?.pages || {}),
                ...(searchRes.query?.pages || {})
            };

            const excludeRegex = /^(list of|history of|geography of|demographics of|economy of|politics of|climate of|transport in|education in|neighbourhoods in|timeline of|flag of|seal of|mayors of|elections in|crime in|cuisine of|media in|culture of|tourism in|outline of|sports in|index of)/i;

            const candidates = [];
            const seenTitles = new Set();

            for (const p of Object.values(allPages)) {
                if (!p.title || !p.extract) continue;
                const tLower = p.title.toLowerCase().trim();

                // Exclude duplicate titles, overview city pages, and administrative articles
                if (seenTitles.has(tLower) ||
                    tLower === cityName.toLowerCase() ||
                    tLower === `${cityName.toLowerCase()} district` ||
                    tLower === `${cityName.toLowerCase()} (city)` ||
                    excludeRegex.test(tLower)) {
                    continue;
                }

                // Filter out non-attractions (railway stations, constituencies, political events, companies, wars, biographies)
                if (/station|constituency|election|ministry|department of|derailment|accident|epidemic|treaty|government of|police|lok sabha|vidhan sabha|consulate|embassy|air force|regiment/i.test(tLower)) {
                    continue;
                }

                const extractLower = (p.extract || "").toLowerCase();
                if (/was a french revolution|was a battle|was a war|was an empire|was a rebellion|was a military|was a siege|was an election|is a company|is an airline|is a television|is a radio|is a newspaper|is a political party|is a franchise|is an agency|is a politician|was a politician/i.test(extractLower)) {
                    continue;
                }

                const pLat = p.coordinates?.[0]?.lat;
                const pLon = p.coordinates?.[0]?.lon;
                let distKm = null;

                if (typeof pLat === "number" && typeof pLon === "number") {
                    distKm = this.calculateDistanceKm(lat, lon, pLat, pLon);
                    // Filter out landmarks farther than 35km from searched city center
                    if (distKm > 35) continue;
                } else {
                    // If no coordinates in article, ensure extract mentions the city
                    if (!p.extract.toLowerCase().includes(cityName.toLowerCase())) {
                        continue;
                    }
                }

                const classification = this.classifyPlace(p.title, p.extract);
                seenTitles.add(tLower);

                // Calculate relevance score
                let score = 0;
                if (p.thumbnail?.source) score += 10;
                if (classification.category === "Religious Heritage") score += 9;
                if (classification.category === "Historical Landmark") score += 9;
                if (classification.category === "Nature & Scenic") score += 8;
                if (classification.category === "Cultural & Arts") score += 8;
                if (classification.category === "Notable Landmark") score += 7;

                if (distKm !== null) {
                    if (distKm <= 5) score += 8;
                    else if (distKm <= 15) score += 5;
                    else if (distKm <= 25) score += 2;
                }

                // Clean title suffix
                const cleanTitle = p.title.replace(/\s*\([^)]*\)$/, "").trim();

                candidates.push({
                    id: p.pageid,
                    title: cleanTitle,
                    fullTitle: p.title,
                    category: classification.category,
                    icon: classification.icon,
                    type: classification.type,
                    extract: p.extract.trim(),
                    imageUrl: p.thumbnail?.source || null,
                    pageUrl: p.fullurl || `https://en.wikipedia.org/?curid=${p.pageid}`,
                    latitude: typeof pLat === "number" ? pLat : lat,
                    longitude: typeof pLon === "number" ? pLon : lon,
                    distanceKm: distKm !== null ? parseFloat(distKm.toFixed(1)) : null,
                    score: score
                });
            }

            // Sort by score descending
            candidates.sort((a, b) => b.score - a.score);
            const topPlaces = candidates.slice(0, 9);

            const result = {
                cityName: cityName,
                location: location,
                places: topPlaces,
                weatherContext: this.getWeatherContext(weatherData),
                fetchedAt: new Date().toISOString()
            };

            this.cache.set(cacheKey, {
                timestamp: now,
                data: result
            });

            return result;
        } catch (error) {
            if (error.name === "AbortError") {
                return null;
            }
            console.error("Places discovery error:", error);
            throw error;
        }
    }
}

// Global instance
if (typeof window !== "undefined") {
    window.placesService = new PlacesService();
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = PlacesService;
}
