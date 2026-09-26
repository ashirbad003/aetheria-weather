/**
 * Image Service
 * Dynamically fetches representative licensed photographs for any city/location
 * using the Wikipedia REST API and Wikimedia Commons API.
 * Never hardcodes city images. Handles skeletons, alt text, and graceful fallbacks.
 */
class ImageService {
    constructor() {
        this.cache = new Map();
        this.currentAbortController = null;
    }

    /**
     * Helper to fetch with a timeout
     */
    async fetchWithTimeout(url, timeoutMs = 8000) {
        const timeoutId = setTimeout(() => {
            if (this.currentAbortController) this.currentAbortController.abort();
        }, timeoutMs);
        try {
            return await fetch(url, { signal: this.currentAbortController.signal });
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Fetch a high-quality representative city photograph
     * @param {Object} location - { name, admin1, country }
     * @returns {Promise<Object|null>} - { url, title, description, altText, source }
     */
    async fetchCityImage(location) {
        if (!location || !location.name) {
            return null;
        }

        const cityName = location.name.trim();
        const countryName = (location.country || "").trim();
        const cacheKey = `img_${cityName.toLowerCase()}_${countryName.toLowerCase()}`;

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        if (this.currentAbortController) {
            this.currentAbortController.abort();
        }
        this.currentAbortController = new AbortController();

        const altText = `Representative photograph of ${cityName}${countryName ? ', ' + countryName : ''}`;

        // Attempt 1: Wikipedia REST API by exact city name
        try {
            const wikiTitle = encodeURIComponent(cityName.replace(/\s+/g, '_'));
            const url = `${CONFIG.WIKIPEDIA_REST_API}/${wikiTitle}`;
            const response = await this.fetchWithTimeout(url);

            if (response.ok) {
                const data = await response.json();
                if (data.originalimage && data.originalimage.source) {
                    const result = {
                        url: data.originalimage.source,
                        thumbnailUrl: (data.thumbnail && data.thumbnail.source) ? data.thumbnail.source : data.originalimage.source,
                        title: data.title || cityName,
                        description: data.description || `${cityName}, ${countryName}`,
                        altText: altText,
                        source: "Wikipedia"
                    };
                    this.cache.set(cacheKey, result);
                    return result;
                }
            }
        } catch (err) {
            if (err.name !== "AbortError") {
                console.warn("Wikipedia direct lookup attempt 1 failed:", err);
            }
        }

        // Attempt 2: Wikipedia Search API for disambiguated titles (e.g. "Brahmapur, Odisha" or "Berhampur")
        try {
            const searchQuery = encodeURIComponent(`${cityName} ${countryName}`.trim());
            const searchApiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${searchQuery}&gsrlimit=5&prop=pageimages|extracts&pithumbsize=1200&format=json&origin=*`;
            const response = await this.fetchWithTimeout(searchApiUrl);

            if (response.ok) {
                const data = await response.json();
                if (data.query && data.query.pages) {
                    const pages = Object.values(data.query.pages);
                    for (const page of pages) {
                        if (page.thumbnail && page.thumbnail.source) {
                            const result = {
                                url: page.thumbnail.source,
                                thumbnailUrl: page.thumbnail.source,
                                title: page.title || cityName,
                                description: `${page.title || cityName}, ${countryName}`,
                                altText: altText,
                                source: "Wikipedia"
                            };
                            this.cache.set(cacheKey, result);
                            return result;
                        }
                    }
                }
            }
        } catch (err) {
            if (err.name !== "AbortError") {
                console.warn("Wikipedia search generator attempt failed:", err);
            }
        }

        // Attempt 3: Wikipedia REST API with "City, Country"
        if (countryName) {
            try {
                const combinedTitle = encodeURIComponent(`${cityName},_${countryName}`.replace(/\s+/g, '_'));
                const url = `${CONFIG.WIKIPEDIA_REST_API}/${combinedTitle}`;
                const response = await this.fetchWithTimeout(url);

                if (response.ok) {
                    const data = await response.json();
                    if (data.originalimage && data.originalimage.source) {
                        const result = {
                            url: data.originalimage.source,
                            thumbnailUrl: (data.thumbnail && data.thumbnail.source) ? data.thumbnail.source : data.originalimage.source,
                            title: data.title || `${cityName}, ${countryName}`,
                            description: data.description || `${cityName}, ${countryName}`,
                            altText: altText,
                            source: "Wikipedia"
                        };
                        this.cache.set(cacheKey, result);
                        return result;
                    }
                }
            } catch (err) {
                if (err.name !== "AbortError") {
                    console.warn("Wikipedia lookup attempt 3 failed:", err);
                }
            }
        }

        // Attempt 4: Wikimedia Commons API search query
        try {
            const query = encodeURIComponent(`${cityName} ${countryName} skyline landmark city view`);
            const commonsUrl = `${CONFIG.WIKIMEDIA_SEARCH_API}?action=query&generator=search&gsrsearch=${query}&gsrlimit=5&prop=pageimages|imageinfo&pithumbsize=1200&iiprop=url&format=json&origin=*`;
            const response = await this.fetchWithTimeout(commonsUrl);

            if (response.ok) {
                const data = await response.json();
                if (data.query && data.query.pages) {
                    const pages = Object.values(data.query.pages);
                    for (const page of pages) {
                        if (page.thumbnail && page.thumbnail.source) {
                            const result = {
                                url: page.thumbnail.source,
                                thumbnailUrl: page.thumbnail.source,
                                title: page.title || cityName,
                                description: `${cityName} landmark photography`,
                                altText: altText,
                                source: "Wikimedia Commons"
                            };
                            this.cache.set(cacheKey, result);
                            return result;
                        }
                    }
                }
            }
        } catch (err) {
            if (err.name !== "AbortError") {
                console.warn("Wikimedia Commons search failed:", err);
            }
        }

        // Fallback: Return null to trigger the atmospheric gradient banner (No broken images)
        const fallback = {
            url: null,
            title: cityName,
            description: "Atmospheric location banner",
            altText: `Atmospheric visualization for ${cityName}`,
            isFallback: true
        };
        this.cache.set(cacheKey, fallback);
        return fallback;
    }
}

// Global instance
window.imageService = new ImageService();
