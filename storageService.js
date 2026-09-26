/**
 * Storage Service
 * Manages persistent state using localStorage with safety fallbacks
 * for private browsing, quota limits, and data serialization.
 */
class StorageService {
    constructor() {
        this.inMemoryFallback = new Map();
    }

    /**
     * Safe LocalStorage Getter
     */
    getItem(key, defaultValue = null) {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null) return defaultValue;
            return JSON.parse(raw);
        } catch (e) {
            console.warn(`LocalStorage read failed for ${key}, using memory fallback:`, e);
            return this.inMemoryFallback.has(key) ? this.inMemoryFallback.get(key) : defaultValue;
        }
    }

    /**
     * Safe LocalStorage Setter
     */
    setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn(`LocalStorage write failed for ${key}, storing in memory:`, e);
            this.inMemoryFallback.set(key, value);
        }
    }

    // ================= FAVORITES =================

    getFavorites() {
        return this.getItem(CONFIG.STORAGE_KEYS.FAVORITES, []);
    }

    isFavorite(location) {
        if (!location) return false;
        const favorites = this.getFavorites();
        const id = location.id || `${location.latitude?.toFixed(2)}_${location.longitude?.toFixed(2)}`;
        return favorites.some(fav => fav.id === id || (fav.name === location.name && fav.country === location.country));
    }

    addFavorite(location) {
        if (!location || !location.name) return;
        const favorites = this.getFavorites();
        const id = location.id || `${location.latitude?.toFixed(2)}_${location.longitude?.toFixed(2)}`;

        // Check if already exists
        const exists = favorites.some(fav => fav.id === id || (fav.name === location.name && fav.country === location.country));
        if (!exists) {
            favorites.unshift({
                id: id,
                name: location.name,
                admin1: location.admin1 || "",
                country: location.country || "",
                country_code: location.country_code || "",
                latitude: location.latitude,
                longitude: location.longitude,
                timezone: location.timezone || "auto",
                addedAt: new Date().toISOString()
            });
            this.setItem(CONFIG.STORAGE_KEYS.FAVORITES, favorites);
        }
        return favorites;
    }

    removeFavorite(location) {
        if (!location) return;
        let favorites = this.getFavorites();
        const id = location.id || `${location.latitude?.toFixed(2)}_${location.longitude?.toFixed(2)}`;

        favorites = favorites.filter(fav => fav.id !== id && !(fav.name === location.name && fav.country === location.country));
        this.setItem(CONFIG.STORAGE_KEYS.FAVORITES, favorites);
        return favorites;
    }

    toggleFavorite(location) {
        if (this.isFavorite(location)) {
            this.removeFavorite(location);
            return false;
        } else {
            this.addFavorite(location);
            return true;
        }
    }

    // ================= RECENT SEARCHES =================

    getRecentSearches() {
        return this.getItem(CONFIG.STORAGE_KEYS.RECENT_SEARCHES, []);
    }

    addRecentSearch(location) {
        if (!location || !location.name) return;
        let recents = this.getRecentSearches();
        const id = location.id || `${location.latitude?.toFixed(2)}_${location.longitude?.toFixed(2)}`;

        // Remove existing duplicate
        recents = recents.filter(item => item.id !== id && !(item.name === location.name && item.country === location.country));

        // Add to front
        recents.unshift({
            id: id,
            name: location.name,
            admin1: location.admin1 || "",
            country: location.country || "",
            country_code: location.country_code || "",
            latitude: location.latitude,
            longitude: location.longitude,
            timezone: location.timezone || "auto",
            searchedAt: new Date().toISOString()
        });

        // Limit to 8 items
        if (recents.length > 8) {
            recents = recents.slice(0, 8);
        }

        this.setItem(CONFIG.STORAGE_KEYS.RECENT_SEARCHES, recents);
        return recents;
    }

    clearRecentSearches() {
        this.setItem(CONFIG.STORAGE_KEYS.RECENT_SEARCHES, []);
        return [];
    }

    // ================= PREFERENCES =================

    getPreferences() {
        const defaults = {
            tempUnit: CONFIG.DEFAULTS.TEMP_UNIT,
            windUnit: CONFIG.DEFAULTS.WIND_UNIT,
            theme: CONFIG.DEFAULTS.THEME
        };
        return { ...defaults, ...this.getItem(CONFIG.STORAGE_KEYS.PREFERENCES, {}) };
    }

    savePreferences(prefs) {
        const current = this.getPreferences();
        const updated = { ...current, ...prefs };
        this.setItem(CONFIG.STORAGE_KEYS.PREFERENCES, updated);
        return updated;
    }

    // ================= LAST LOCATION =================

    getLastLocation() {
        return this.getItem(CONFIG.STORAGE_KEYS.LAST_LOCATION, null);
    }

    saveLastLocation(location) {
        if (!location) return;
        this.setItem(CONFIG.STORAGE_KEYS.LAST_LOCATION, location);
    }
}

// Global instance
window.storageService = new StorageService();
