/**
 * ==========================================================================
 * AETHERIA 3D GLOBAL WEATHER APPLICATION
 * Master Application Controller & Orchestrator
 * Designed & Developed by Ashirbad Pattnaik
 * ==========================================================================
 */

class WeatherApp {
    constructor() {
        // Application State
        this.currentLocation = null;
        this.currentWeatherData = null;
        this.currentImage = null;
        this.preferences = storageService.getPreferences(); // { tempUnit: 'C', windUnit: 'kmh', theme: 'auto' }
        this.activeChartTab = "temp";
        this.chartInstance = null;
        // Map & Layer State
        this.mapInstance = null;
        this.mapMarker = null;
        this.placeMapMarker = null;
        this.mapLayers = {};
        this.activeMapLayer = "satellite"; // Default to Satellite view

        this.localTimeInterval = null;
        this.autoRefreshInterval = null;
        this.debounceSearchTimeout = null;

        // Canvas Particle Engine State
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.animationFrameId = null;
        this.currentAtmosphereType = "clear-day";

        // Parallax State
        this.parallaxRAF = null;
        this.mousePos = { targetX: 0, targetY: 0, currentX: 0, currentY: 0 };

        // DOM Element Cache
        this.dom = {};
    }

    /**
     * Initialize Application
     */
    async init() {
        this.cacheDomElements();
        this.initAtmosphereCanvas();
        this.init3DTilt();
        this.initBackgroundParallax();
        this.initEventListeners();
        this.initMap();
        this.renderRecentSearches();
        this.renderFavorites();
        this.applyUnitPreferences();
        this.initPwa();

        // Network status monitor
        this.initNetworkMonitoring();

        // Start Auto Refresh Timer (Every 10 minutes)
        this.autoRefreshInterval = setInterval(() => {
            if (this.currentLocation && navigator.onLine) {
                this.loadLocationWeather(this.currentLocation, { isSilentRefresh: true });
            }
        }, CONFIG.DEFAULTS.AUTO_REFRESH_INTERVAL_MS);

        // Load initial city (Last searched or default)
        const initialLocation = storageService.getLastLocation() || {
            name: CONFIG.DEFAULTS.CITY,
            country: CONFIG.DEFAULTS.COUNTRY,
            latitude: CONFIG.DEFAULTS.LATITUDE,
            longitude: CONFIG.DEFAULTS.LONGITUDE,
            timezone: CONFIG.DEFAULTS.TIMEZONE,
            displayName: `${CONFIG.DEFAULTS.CITY}, ${CONFIG.DEFAULTS.COUNTRY}`
        };

        await this.loadLocationWeather(initialLocation);
    }

    /**
     * Cache DOM references for performant lookups
     */
    cacheDomElements() {
        this.dom = {
            // Inputs & Header
            searchForm: document.getElementById("searchForm"),
            cityInput: document.getElementById("cityInput"),
            clearSearchBtn: document.getElementById("clearSearchBtn"),
            searchBtn: document.getElementById("searchBtn"),
            geoBtn: document.getElementById("geoBtn"),
            suggestionsDropdown: document.getElementById("suggestionsDropdown"),
            unitCelsiusBtn: document.getElementById("unitCelsiusBtn"),
            unitFahrenheitBtn: document.getElementById("unitFahrenheitBtn"),
            refreshBtn: document.getElementById("refreshBtn"),
            shareBtn: document.getElementById("shareBtn"),
            snapshotBtn: document.getElementById("snapshotBtn"),
            offlineBanner: document.getElementById("offlineBanner"),
            statusToast: document.getElementById("statusToast"),
            statusIcon: document.getElementById("statusIcon"),
            statusMessage: document.getElementById("statusMessage"),
            statusCloseBtn: document.getElementById("statusCloseBtn"),

            // Recent Searches
            recentSection: document.getElementById("recentSearchesSection"),
            recentList: document.getElementById("recentSearchesList"),
            clearRecentBtn: document.getElementById("clearRecentBtn"),

            // City Photo Card
            cityPhotoCard: document.getElementById("cityPhotoCard"),
            photoSkeleton: document.getElementById("photoSkeleton"),
            cityImage: document.getElementById("cityImage"),
            photoFallback: document.getElementById("photoFallback"),
            resolvedCityName: document.getElementById("resolvedCityName"),
            resolvedRegionCountry: document.getElementById("resolvedRegionCountry"),
            favoriteToggleBtn: document.getElementById("favoriteToggleBtn"),
            favoriteStarIcon: document.getElementById("favoriteStarIcon"),
            localTimeDisplay: document.getElementById("localTimeDisplay"),
            timezoneLabel: document.getElementById("timezoneLabel"),
            photoAttribution: document.getElementById("photoAttribution"),
            lastUpdatedLabel: document.getElementById("lastUpdatedLabel"),

            // 3D Weather Master Card
            weatherMasterCard: document.getElementById("weatherMasterCard"),
            weatherIconLarge: document.getElementById("weatherIconLarge"),
            conditionText: document.getElementById("conditionText"),
            conditionDescription: document.getElementById("conditionDescription"),
            dayNightPill: document.getElementById("dayNightPill"),
            dayNightIcon: document.getElementById("dayNightIcon"),
            dayNightText: document.getElementById("dayNightText"),
            currentTempLarge: document.getElementById("currentTempLarge"),
            tempUnitSymbol: document.getElementById("tempUnitSymbol"),
            feelsLikeTemp: document.getElementById("feelsLikeTemp"),
            todayMaxTemp: document.getElementById("todayMaxTemp"),
            todayMinTemp: document.getElementById("todayMinTemp"),
            quickPrecip: document.getElementById("quickPrecip"),
            quickGusts: document.getElementById("quickGusts"),
            quickElevation: document.getElementById("quickElevation"),

            // Favorites Drawer
            favoritesCount: document.getElementById("favoritesCount"),
            favoritesList: document.getElementById("favoritesList"),
            favoritesEmptyState: document.getElementById("favoritesEmptyState"),

            // Metrics Grid
            metricHumidity: document.getElementById("metricHumidity"),
            humidityBar: document.getElementById("humidityBar"),
            humidityStatus: document.getElementById("humidityStatus"),
            metricWindSpeed: document.getElementById("metricWindSpeed"),
            compassNeedle: document.getElementById("compassNeedle"),
            metricWindDirection: document.getElementById("metricWindDirection"),
            metricUvIndex: document.getElementById("metricUvIndex"),
            uvBadge: document.getElementById("uvBadge"),
            uvRecommendation: document.getElementById("uvRecommendation"),
            metricPressure: document.getElementById("metricPressure"),
            pressureStatus: document.getElementById("pressureStatus"),
            metricVisibility: document.getElementById("metricVisibility"),
            visibilityStatus: document.getElementById("visibilityStatus"),
            metricCloudCover: document.getElementById("metricCloudCover"),
            cloudBar: document.getElementById("cloudBar"),
            cloudStatus: document.getElementById("cloudStatus"),

            // Air Quality Metrics
            aqiCard: document.getElementById("aqiCard"),
            metricAqiValue: document.getElementById("metricAqiValue"),
            aqiBadge: document.getElementById("aqiBadge"),
            aqiGuidance: document.getElementById("aqiGuidance"),
            pollutantPm25: document.getElementById("pollutantPm25"),
            pollutantPm10: document.getElementById("pollutantPm10"),
            pollutantNo2: document.getElementById("pollutantNo2"),
            pollutantO3: document.getElementById("pollutantO3"),

            // Solar Card
            dayLengthLabel: document.getElementById("dayLengthLabel"),
            sunriseTime: document.getElementById("sunriseTime"),
            solarNoonTime: document.getElementById("solarNoonTime"),
            sunsetTime: document.getElementById("sunsetTime"),
            sunIndicator: document.getElementById("sunIndicator"),

            // Hourly, Rain Timeline, 7-Day & Insights
            hourlyContainer: document.getElementById("hourlyContainer"),
            rainTimelineContainer: document.getElementById("rainTimelineContainer"),
            dailyForecastContainer: document.getElementById("dailyForecastContainer"),
            insightsContainer: document.getElementById("insightsContainer"),
            pwaInstallBtn: document.getElementById("pwaInstallBtn"),

            // Famous Places Section ("Explore <Location>")
            placesSection: document.getElementById("placesSection"),
            placesHeading: document.getElementById("placesHeading"),
            placesSubheading: document.getElementById("placesSubheading"),
            placesWeatherPill: document.getElementById("placesWeatherPill"),
            placesWeatherIcon: document.getElementById("placesWeatherIcon"),
            placesWeatherMsg: document.getElementById("placesWeatherMsg"),
            placesContainer: document.getElementById("placesContainer"),

            // Place Details Modal
            placeDetailsModal: document.getElementById("placeDetailsModal"),
            closePlaceModalBtn: document.getElementById("closePlaceModalBtn"),
            placeModalIcon: document.getElementById("placeModalIcon"),
            placeModalTitle: document.getElementById("placeModalTitle"),
            placeModalCategory: document.getElementById("placeModalCategory"),
            placeModalImage: document.getElementById("placeModalImage"),
            placeModalImageFallback: document.getElementById("placeModalImageFallback"),
            placeModalDistance: document.getElementById("placeModalDistance"),
            placeModalExtract: document.getElementById("placeModalExtract"),
            placeModalCity: document.getElementById("placeModalCity"),
            placeModalCoords: document.getElementById("placeModalCoords"),
            placeModalWeather: document.getElementById("placeModalWeather"),
            placeModalViewMapBtn: document.getElementById("placeModalViewMapBtn"),
            placeModalDirectionsLink: document.getElementById("placeModalDirectionsLink"),
            placeModalWikiLink: document.getElementById("placeModalWikiLink"),

            // Charts
            chartCanvas: document.getElementById("weatherChart"),
            chartTabs: document.querySelectorAll(".chart-tab"),

            // 3D Weather Environment Backdrop
            weatherBackdrop: document.getElementById("weatherBackdrop"),
            skyAtmosphere: document.getElementById("skyAtmosphere"),
            sunGlowLayer: document.getElementById("sunGlowLayer"),
            cloudBackdropLayer: document.getElementById("cloudBackdropLayer"),
            cloudLayer1: document.getElementById("cloudLayer1"),
            cloudLayer2: document.getElementById("cloudLayer2"),
            atmosphereCanvas: document.getElementById("atmosphereCanvas"),

            // Premium Map Controls & Layers
            mapContainer: document.getElementById("leafletMap"),
            mapCoordinatesLabel: document.getElementById("mapCoordinatesLabel"),
            mapLayerStandardBtn: document.getElementById("mapLayerStandardBtn"),
            mapLayerSatelliteBtn: document.getElementById("mapLayerSatelliteBtn"),
            mapRecenterBtn: document.getElementById("mapRecenterBtn"),
            mapAtmosphereOverlay: document.getElementById("mapAtmosphereOverlay"),
            mapLoadingOverlay: document.getElementById("mapLoadingOverlay"),

            // Snapshot Modal
            snapshotModal: document.getElementById("snapshotModal"),
            closeSnapshotBtn: document.getElementById("closeSnapshotBtn"),
            snapshotCity: document.getElementById("snapshotCity"),
            snapshotDate: document.getElementById("snapshotDate"),
            snapshotCondition: document.getElementById("snapshotCondition"),
            snapshotIcon: document.getElementById("snapshotIcon"),
            snapshotTemp: document.getElementById("snapshotTemp"),
            snapshotFeels: document.getElementById("snapshotFeels"),
            snapshotHumidity: document.getElementById("snapshotHumidity"),
            snapshotWind: document.getElementById("snapshotWind"),
            snapshotUv: document.getElementById("snapshotUv"),
            copySnapshotTextBtn: document.getElementById("copySnapshotTextBtn"),
            nativeShareSnapshotBtn: document.getElementById("nativeShareSnapshotBtn")
        };
    }

    /**
     * Attach all user and system event listeners
     */
    initEventListeners() {
        // Search Form Submit
        this.dom.searchForm.addEventListener("submit", (e) => {
            e.preventDefault();
            this.handleSearchSubmit();
        });

        // Search Input Input & Debouncing
        this.dom.cityInput.addEventListener("input", () => {
            const val = this.dom.cityInput.value.trim();
            this.dom.clearSearchBtn.classList.toggle("hidden", val.length === 0);

            clearTimeout(this.debounceSearchTimeout);
            if (val.length >= 2) {
                this.debounceSearchTimeout = setTimeout(() => {
                    this.fetchAndShowSuggestions(val);
                }, 300);
            } else {
                this.hideSuggestions();
            }
        });

        // Clear Search Button
        this.dom.clearSearchBtn.addEventListener("click", () => {
            this.dom.cityInput.value = "";
            this.dom.clearSearchBtn.classList.add("hidden");
            this.hideSuggestions();
            this.dom.cityInput.focus();
        });

        // Click outside suggestions to close
        document.addEventListener("click", (e) => {
            if (!this.dom.searchForm.contains(e.target) && !this.dom.suggestionsDropdown.contains(e.target)) {
                this.hideSuggestions();
            }
        });

        // Use My Location
        this.dom.geoBtn.addEventListener("click", () => this.handleGeolocation());

        // Unit Switchers
        this.dom.unitCelsiusBtn.addEventListener("click", () => this.setTemperatureUnit("C"));
        this.dom.unitFahrenheitBtn.addEventListener("click", () => this.setTemperatureUnit("F"));

        // Refresh Button
        this.dom.refreshBtn.addEventListener("click", () => {
            if (this.currentLocation) {
                this.loadLocationWeather(this.currentLocation, { isManualRefresh: true });
            }
        });

        // Favorite Toggle Button
        this.dom.favoriteToggleBtn.addEventListener("click", () => this.toggleCurrentFavorite());

        // Clear Recent Searches
        this.dom.clearRecentBtn.addEventListener("click", () => {
            storageService.clearRecentSearches();
            this.renderRecentSearches();
            this.showToast("Recent searches cleared.", "info");
        });

        // Chart Tab Switches
        this.dom.chartTabs.forEach(tab => {
            tab.addEventListener("click", (e) => {
                const chartType = e.currentTarget.dataset.chart;
                this.dom.chartTabs.forEach(t => {
                    t.classList.remove("active");
                    t.setAttribute("aria-selected", "false");
                });
                e.currentTarget.classList.add("active");
                e.currentTarget.setAttribute("aria-selected", "true");
                this.activeChartTab = chartType;
                this.renderWeatherChart();
            });
        });

        // Share & Snapshot Modals
        this.dom.shareBtn.addEventListener("click", () => this.handleShareWeather());
        this.dom.snapshotBtn.addEventListener("click", () => this.openSnapshotModal());
        this.dom.closeSnapshotBtn.addEventListener("click", () => this.closeSnapshotModal());
        this.dom.snapshotModal.addEventListener("click", (e) => {
            if (e.target === this.dom.snapshotModal) this.closeSnapshotModal();
        });

        this.dom.copySnapshotTextBtn.addEventListener("click", () => this.copySnapshotText());
        this.dom.nativeShareSnapshotBtn.addEventListener("click", () => this.handleShareWeather());

        // Place Details Modal
        this.dom.closePlaceModalBtn.addEventListener("click", () => this.closePlaceDetailsModal());
        this.dom.placeDetailsModal.addEventListener("click", (e) => {
            if (e.target === this.dom.placeDetailsModal) this.closePlaceDetailsModal();
        });
        this.dom.placeModalViewMapBtn.addEventListener("click", () => {
            if (this.selectedPlace) {
                this.viewPlaceOnMap(this.selectedPlace);
            }
        });

        // Map Layer Switchers (Standard & Satellite Only)
        if (this.dom.mapLayerStandardBtn) {
            this.dom.mapLayerStandardBtn.addEventListener("click", () => this.setMapLayer("standard"));
        }
        if (this.dom.mapLayerSatelliteBtn) {
            this.dom.mapLayerSatelliteBtn.addEventListener("click", () => this.setMapLayer("satellite"));
        }
        if (this.dom.mapRecenterBtn) {
            this.dom.mapRecenterBtn.addEventListener("click", () => {
                if (this.currentLocation && this.mapInstance) {
                    this.mapInstance.flyTo([this.currentLocation.latitude, this.currentLocation.longitude], 12, {
                        animate: true,
                        duration: 1.2
                    });
                    this.showToast(`Centered map on ${this.currentLocation.name}`, "info");
                }
            });
        }

        // Toast Close
        this.dom.statusCloseBtn.addEventListener("click", () => {
            this.dom.statusToast.classList.add("hidden");
        });

        // Keyboard navigation escape
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                this.hideSuggestions();
                this.closeSnapshotModal();
                this.closePlaceDetailsModal();
            }
        });
    }

    /**
     * Handle Manual Search Input Submit
     */
    async handleSearchSubmit() {
        const query = this.dom.cityInput.value.trim();
        if (!query) {
            this.showToast("Please enter a city or country name.", "warning");
            return;
        }

        this.hideSuggestions();
        this.setSearchLoading(true);

        try {
            const locations = await locationService.searchLocations(query);

            if (locations.length === 0) {
                this.showToast(`Location "${query}" not found. Please verify spelling.`, "error");
                return;
            }

            if (locations.length === 1) {
                // Single clear match
                await this.loadLocationWeather(locations[0]);
            } else {
                // Show disambiguation suggestions list
                this.renderDisambiguationDropdown(locations);
            }
        } catch (error) {
            console.error("Search error:", error);
            this.showToast("Unable to reach geocoding service. Please check network.", "error");
        } finally {
            this.setSearchLoading(false);
        }
    }

    /**
     * Fetch and show live debounced search suggestions
     */
    async fetchAndShowSuggestions(query) {
        try {
            const locations = await locationService.searchLocations(query);
            if (locations.length === 0) {
                this.hideSuggestions();
                return;
            }
            this.renderDisambiguationDropdown(locations);
        } catch (e) {
            this.hideSuggestions();
        }
    }

    /**
     * Render suggestions / disambiguation dropdown
     */
    renderDisambiguationDropdown(locations) {
        const dropdown = this.dom.suggestionsDropdown;
        dropdown.innerHTML = "";

        locations.forEach(loc => {
            const item = document.createElement("div");
            item.className = "suggestion-item";
            item.setAttribute("role", "option");

            const info = document.createElement("div");
            info.className = "suggestion-info";

            const city = document.createElement("span");
            city.className = "suggestion-city";
            city.textContent = loc.name;

            const region = document.createElement("span");
            region.className = "suggestion-region";
            region.textContent = [loc.admin1, loc.country].filter(Boolean).join(", ");

            info.appendChild(city);
            info.appendChild(region);

            const badge = document.createElement("span");
            badge.className = "suggestion-badge";
            badge.textContent = loc.country_code || "LOC";

            item.appendChild(info);
            item.appendChild(badge);

            item.addEventListener("click", () => {
                this.dom.cityInput.value = loc.displayName;
                this.hideSuggestions();
                this.loadLocationWeather(loc);
            });

            dropdown.appendChild(item);
        });

        dropdown.classList.remove("hidden");
    }

    hideSuggestions() {
        this.dom.suggestionsDropdown.classList.add("hidden");
        this.dom.suggestionsDropdown.innerHTML = "";
    }

    /**
     * Geolocation Handler
     */
    async handleGeolocation() {
        this.showToast("Acquiring current GPS coordinates...", "info");
        this.dom.geoBtn.disabled = true;

        try {
            const pos = await locationService.getCurrentPosition();
            this.showToast("Resolving location details...", "info");

            const loc = await locationService.reverseGeocode(pos.latitude, pos.longitude);
            await this.loadLocationWeather(loc);
            this.showToast(`Location detected: ${loc.name}`, "success");
        } catch (error) {
            console.error("Geolocation error:", error);
            this.showToast(error.message || "Failed to retrieve your current location.", "error");
        } finally {
            this.dom.geoBtn.disabled = false;
        }
    }

    /**
     * Master Data Loading Pipeline:
     * 1. Updates state & storage
     * 2. Fetches Real Weather from Open-Meteo
     * 3. Fetches Dynamic City Image in parallel
     * 4. Updates all UI components, charts, atmospheric themes, and maps
     */
    async loadLocationWeather(location, options = {}) {
        if (!location || typeof location.latitude !== "number" || typeof location.longitude !== "number") {
            this.showToast("Invalid location coordinates.", "error");
            return;
        }

        const isManual = options.isManualRefresh || false;
        const isSilent = options.isSilentRefresh || false;

        if (isManual) {
            this.dom.refreshBtn.querySelector(".refresh-icon")?.classList.add("spinning");
        }

        if (!isSilent) {
            this.showToast(`Fetching live weather for ${location.name}...`, "info");
        }

        // Show photo skeleton immediately & update city name label
        this.showPhotoSkeleton();
        this.renderPlacesSkeletons(location.name);
        this.dom.resolvedCityName.textContent = location.name;
        const regionCountry = [location.admin1, location.country].filter(Boolean).join(", ");
        this.dom.resolvedRegionCountry.textContent = regionCountry || "Global Location";

        // Asynchronously fetch city photograph independently so weather is never blocked or delayed
        const locationKey = `${location.latitude.toFixed(4)}_${location.longitude.toFixed(4)}`;
        imageService.fetchCityImage(location).then(imageData => {
            if (this.currentLocation && `${this.currentLocation.latitude.toFixed(4)}_${this.currentLocation.longitude.toFixed(4)}` === locationKey) {
                this.currentImage = imageData;
                this.renderCityPhoto();
            }
        }).catch(err => {
            console.warn("City image fetch error, showing fallback:", err);
            if (this.currentLocation && `${this.currentLocation.latitude.toFixed(4)}_${this.currentLocation.longitude.toFixed(4)}` === locationKey) {
                this.currentImage = { url: null, isFallback: true };
                this.renderCityPhoto();
            }
        });

        try {
            // Fetch Real Weather Data (fresh live request)
            const weatherData = await weatherService.fetchWeather(location.latitude, location.longitude, location.timezone, true);

            if (!weatherData) {
                throw new Error("No weather data returned from meteorological provider.");
            }

            // Update Active State
            this.currentLocation = location;
            this.currentWeatherData = weatherData;

            // Persist to recent searches and last active location
            storageService.saveLastLocation(location);
            storageService.addRecentSearch(location);
            this.renderRecentSearches();

            // Render all UI components
            this.renderLocationInfo();
            this.renderMasterWeatherCard();
            this.renderMetrics();
            this.renderSolarTracker();
            this.renderHourlyForecast();
            this.renderRainTimeline();
            this.renderDailyForecast();
            this.renderInsights();
            this.renderWeatherChart();
            this.updateMap();
            this.updateAtmosphericTheme();
            this.startLocalTimeClock();

            // Load Air Quality & Famous Places for this searched location asynchronously
            this.loadAirQuality(location);
            this.loadLocationPlaces(location, weatherData);

            // Update Favorite Star
            this.updateFavoriteStarIcon();

            const updateTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            this.dom.lastUpdatedLabel.textContent = `Last updated: ${updateTime}`;

            if (!isSilent) {
                this.showToast(`Updated live weather for ${location.name} ✅`, "success");
            }
        } catch (error) {
            console.error("Load weather error:", error);
            this.showToast(error.message || "Failed to load weather data.", "error");
        } finally {
            if (isManual) {
                setTimeout(() => {
                    this.dom.refreshBtn.querySelector(".refresh-icon")?.classList.remove("spinning");
                }, 500);
            }
        }
    }

    /**
     * Render Location & Timezone info in photo overlay
     */
    renderLocationInfo() {
        const loc = this.currentLocation;
        this.dom.resolvedCityName.textContent = loc.name;
        
        const regionCountry = [loc.admin1, loc.country].filter(Boolean).join(", ");
        this.dom.resolvedRegionCountry.textContent = regionCountry || "Global Location";
        this.dom.timezoneLabel.textContent = this.currentWeatherData.timezone || "UTC";
    }

    /**
     * Render City Photograph with skeleton, fallback, and alt text
     */
    renderCityPhoto() {
        const imgData = this.currentImage;
        const imgEl = this.dom.cityImage;
        const skeleton = this.dom.photoSkeleton;
        const fallback = this.dom.photoFallback;

        if (imgData && imgData.url) {
            // Real image available
            imgEl.referrerPolicy = "no-referrer";
            imgEl.onload = () => {
                skeleton.classList.add("hidden");
                fallback.classList.add("hidden");
                imgEl.classList.remove("hidden");
            };
            imgEl.onerror = () => {
                skeleton.classList.add("hidden");
                imgEl.classList.add("hidden");
                fallback.classList.remove("hidden");
            };
            imgEl.src = imgData.url;
            imgEl.alt = imgData.altText || `Representative photograph of ${this.currentLocation?.name || 'City'}`;
            this.dom.photoAttribution.textContent = imgData.source ? `Photo via ${imgData.source}` : "";
        } else {
            // Clean Fallback Gradient Card
            skeleton.classList.add("hidden");
            imgEl.classList.add("hidden");
            fallback.classList.remove("hidden");
            this.dom.photoAttribution.textContent = "";
        }
    }

    showPhotoSkeleton() {
        this.dom.photoSkeleton.classList.remove("hidden");
        this.dom.cityImage.classList.add("hidden");
        this.dom.photoFallback.classList.add("hidden");
    }

    /**
     * Render 3D Master Weather Card
     */
    renderMasterWeatherCard() {
        const cur = this.currentWeatherData.current;
        const unit = this.preferences.tempUnit;

        // Large Temperature & Condition
        const tempDisplay = unit === "F" ? Math.round(weatherService.cToF(cur.tempC)) : Math.round(cur.tempC);
        this.dom.currentTempLarge.textContent = tempDisplay;
        this.dom.tempUnitSymbol.textContent = `°${unit}`;

        this.dom.weatherIconLarge.textContent = cur.wmo.icon;
        this.dom.conditionText.textContent = cur.wmo.condition;
        this.dom.conditionDescription.textContent = cur.wmo.description;

        // Day / Night Pill
        if (cur.isDay) {
            this.dom.dayNightIcon.textContent = "☀️";
            this.dom.dayNightText.textContent = "Daytime";
        } else {
            this.dom.dayNightIcon.textContent = "🌙";
            this.dom.dayNightText.textContent = "Night";
        }

        // Feels Like
        const feelDisplay = unit === "F" ? Math.round(weatherService.cToF(cur.apparentTempC)) : Math.round(cur.apparentTempC);
        this.dom.feelsLikeTemp.textContent = `${feelDisplay}°${unit}`;

        // High / Low for today
        if (this.currentWeatherData.daily.length > 0) {
            const today = this.currentWeatherData.daily[0];
            const maxDisplay = unit === "F" ? Math.round(weatherService.cToF(today.maxTempC)) : Math.round(today.maxTempC);
            const minDisplay = unit === "F" ? Math.round(weatherService.cToF(today.minTempC)) : Math.round(today.minTempC);
            this.dom.todayMaxTemp.textContent = `${maxDisplay}°`;
            this.dom.todayMinTemp.textContent = `${minDisplay}°`;
        }

        // Quick Highlights
        this.dom.quickPrecip.textContent = `${cur.precipitationMm.toFixed(1)} mm`;
        const windGust = this.preferences.windUnit === "mph" ? `${Math.round(weatherService.kmhToMph(cur.windGustsKmh))} mph` : `${Math.round(cur.windGustsKmh)} km/h`;
        this.dom.quickGusts.textContent = windGust;
        this.dom.quickElevation.textContent = `${Math.round(cur.elevation || 0)} m`;
    }

    /**
     * Render Detailed Metrics (Humidity, Wind, UV, Pressure, Visibility, Cloud)
     */
    renderMetrics() {
        const cur = this.currentWeatherData.current;

        // 1. Humidity
        this.dom.metricHumidity.textContent = `${cur.humidity}%`;
        this.dom.humidityBar.style.width = `${Math.min(100, Math.max(0, cur.humidity))}%`;
        if (cur.humidity < 35) {
            this.dom.humidityStatus.textContent = "Dry air";
        } else if (cur.humidity <= 65) {
            this.dom.humidityStatus.textContent = "Comfortable humidity";
        } else {
            this.dom.humidityStatus.textContent = "High humidity / muggy";
        }

        // 2. Wind
        const windVal = this.preferences.windUnit === "mph" 
            ? `${Math.round(weatherService.kmhToMph(cur.windSpeedKmh))} mph`
            : `${Math.round(cur.windSpeedKmh)} km/h`;
        this.dom.metricWindSpeed.textContent = windVal;
        this.dom.compassNeedle.style.transform = `rotate(${cur.windDirectionDeg}deg)`;
        this.dom.metricWindDirection.textContent = `Direction: ${weatherService.degToCompass(cur.windDirectionDeg)} (${cur.windDirectionDeg}°)`;

        // 3. UV Index
        this.dom.metricUvIndex.textContent = cur.uvIndex !== undefined ? cur.uvIndex.toFixed(1) : "--";
        const uvRating = weatherService.getUvRating(cur.uvIndex || 0);
        this.dom.uvBadge.textContent = uvRating.label;
        this.dom.uvBadge.className = `uv-badge uv-${uvRating.label.toLowerCase().replace(/\s+/g, '-')}`;
        if (cur.uvIndex >= 6) {
            this.dom.uvRecommendation.textContent = "Sun protection required";
        } else if (cur.uvIndex >= 3) {
            this.dom.uvRecommendation.textContent = "Moderate midday UV";
        } else {
            this.dom.uvRecommendation.textContent = "Minimal protection needed";
        }

        // 4. Pressure
        this.dom.metricPressure.textContent = `${Math.round(cur.pressureHpa)} hPa`;
        if (cur.pressureHpa < 1005) {
            this.dom.pressureStatus.textContent = "Low barometric pressure";
        } else if (cur.pressureHpa > 1022) {
            this.dom.pressureStatus.textContent = "High barometric pressure";
        } else {
            this.dom.pressureStatus.textContent = "Normal barometric pressure";
        }

        // 5. Visibility
        const visVal = this.preferences.windUnit === "mph"
            ? `${weatherService.kmToMiles(cur.visibilityKm).toFixed(1)} mi`
            : `${cur.visibilityKm.toFixed(1)} km`;
        this.dom.metricVisibility.textContent = visVal;
        if (cur.visibilityKm >= 10) {
            this.dom.visibilityStatus.textContent = "Crystal clear horizon";
        } else if (cur.visibilityKm >= 5) {
            this.dom.visibilityStatus.textContent = "Moderate visibility";
        } else {
            this.dom.visibilityStatus.textContent = "Reduced visibility / haze";
        }

        // 6. Cloud Cover
        this.dom.metricCloudCover.textContent = `${cur.cloudCover}%`;
        this.dom.cloudBar.style.width = `${Math.min(100, Math.max(0, cur.cloudCover))}%`;
        if (cur.cloudCover <= 20) {
            this.dom.cloudStatus.textContent = "Clear skies";
        } else if (cur.cloudCover <= 70) {
            this.dom.cloudStatus.textContent = "Scattered clouds";
        } else {
            this.dom.cloudStatus.textContent = "Overcast cloud ceiling";
        }
    }

    /**
     * Load Real Air Quality Data (AQI, PM2.5, PM10, NO2, O3, SO2) from Open-Meteo
     */
    async loadAirQuality(location) {
        if (!location || !this.dom.aqiCard) return;

        // Reset to analyzing state
        if (this.dom.metricAqiValue) this.dom.metricAqiValue.textContent = "--";
        if (this.dom.aqiBadge) {
            this.dom.aqiBadge.textContent = "Analyzing...";
            this.dom.aqiBadge.className = "aqi-badge aqi-moderate";
        }
        if (this.dom.aqiGuidance) this.dom.aqiGuidance.textContent = "Fetching atmospheric sensor data...";
        if (this.dom.pollutantPm25) this.dom.pollutantPm25.textContent = "--";
        if (this.dom.pollutantPm10) this.dom.pollutantPm10.textContent = "--";
        if (this.dom.pollutantNo2) this.dom.pollutantNo2.textContent = "--";
        if (this.dom.pollutantO3) this.dom.pollutantO3.textContent = "--";

        try {
            const aqiData = await weatherService.fetchAirQuality(location.latitude, location.longitude);
            if (aqiData) {
                this.renderAirQuality(aqiData);
            }
        } catch (err) {
            console.warn("Air quality load warning:", err);
            if (this.dom.metricAqiValue) this.dom.metricAqiValue.textContent = "N/A";
            if (this.dom.aqiBadge) {
                this.dom.aqiBadge.textContent = "Unavailable";
                this.dom.aqiBadge.className = "aqi-badge aqi-good";
            }
            if (this.dom.aqiGuidance) this.dom.aqiGuidance.textContent = "Air quality sensors unavailable for this region.";
        }
    }

    /**
     * Render Air Quality Data & Categorical Health Index
     */
    renderAirQuality(aqiData) {
        if (!this.dom.aqiCard || !aqiData) return;

        const usAqi = aqiData.usAqi;
        const rating = aqiData.rating || weatherService.getAqiRating(usAqi, aqiData.europeanAqi);

        if (this.dom.metricAqiValue) {
            this.dom.metricAqiValue.textContent = usAqi !== null && usAqi !== undefined 
                ? Math.round(usAqi) 
                : (aqiData.europeanAqi !== null && aqiData.europeanAqi !== undefined ? Math.round(aqiData.europeanAqi) : "--");
        }
        if (this.dom.aqiBadge) {
            this.dom.aqiBadge.textContent = rating.label.toUpperCase();
            this.dom.aqiBadge.className = `aqi-badge aqi-${rating.className}`;
        }
        if (this.dom.aqiGuidance) {
            this.dom.aqiGuidance.textContent = rating.guidance;
        }

        if (this.dom.pollutantPm25) {
            this.dom.pollutantPm25.textContent = aqiData.pm25 !== null && aqiData.pm25 !== undefined ? `${aqiData.pm25.toFixed(1)} µg/m³` : "N/A";
        }
        if (this.dom.pollutantPm10) {
            this.dom.pollutantPm10.textContent = aqiData.pm10 !== null && aqiData.pm10 !== undefined ? `${aqiData.pm10.toFixed(1)} µg/m³` : "N/A";
        }
        if (this.dom.pollutantNo2) {
            this.dom.pollutantNo2.textContent = aqiData.no2 !== null && aqiData.no2 !== undefined ? `${aqiData.no2.toFixed(1)} µg/m³` : "N/A";
        }
        if (this.dom.pollutantO3) {
            this.dom.pollutantO3.textContent = aqiData.o3 !== null && aqiData.o3 !== undefined ? `${aqiData.o3.toFixed(1)} µg/m³` : "N/A";
        }
    }

    /**
     * Render Solar Tracker (Sunrise, Sunset, and moving Sun/Moon indicator along quadratic bezier arc)
     */
    renderSolarTracker() {
        const cur = this.currentWeatherData.current;
        const tz = this.currentWeatherData.timezone;

        if (!cur.sunrise || !cur.sunset) {
            this.dom.sunriseTime.textContent = "--:--";
            this.dom.sunsetTime.textContent = "--:--";
            this.dom.solarNoonTime.textContent = "--:--";
            this.dom.dayLengthLabel.textContent = "Daylight: --";
            return;
        }

        const sunriseDate = new Date(cur.sunrise);
        const sunsetDate = new Date(cur.sunset);
        const now = new Date();

        const timeFormatter = new Intl.DateTimeFormat([], {
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        this.dom.sunriseTime.textContent = timeFormatter.format(sunriseDate);
        this.dom.sunsetTime.textContent = timeFormatter.format(sunsetDate);

        // Calculate Daylight duration
        const diffMs = sunsetDate.getTime() - sunriseDate.getTime();
        if (diffMs > 0) {
            const hrs = Math.floor(diffMs / (1000 * 60 * 60));
            const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            this.dom.dayLengthLabel.textContent = `Daylight: ${hrs}h ${mins}m`;

            const noonDate = new Date(sunriseDate.getTime() + diffMs / 2);
            this.dom.solarNoonTime.textContent = timeFormatter.format(noonDate);

            // Compute Sun position along bezier arc (M 50 130 Q 250 15 450 130)
            const currentMs = now.getTime();
            let progress = (currentMs - sunriseDate.getTime()) / diffMs;
            progress = Math.max(0, Math.min(1, progress));

            // Quadratic Bezier interpolation for P0=(50,130), P1=(250,15), P2=(450,130)
            const t = progress;
            const cx = (1 - t) * (1 - t) * 50 + 2 * (1 - t) * t * 250 + t * t * 450;
            const cy = (1 - t) * (1 - t) * 130 + 2 * (1 - t) * t * 15 + t * t * 130;

            this.dom.sunIndicator.setAttribute("cx", cx.toFixed(1));
            this.dom.sunIndicator.setAttribute("cy", cy.toFixed(1));

            if (cur.isDay) {
                this.dom.sunIndicator.setAttribute("fill", "#facc15");
                this.dom.sunIndicator.setAttribute("filter", "drop-shadow(0 0 10px rgba(250,204,21,0.9))");
            } else {
                this.dom.sunIndicator.setAttribute("fill", "#e2e8f0");
                this.dom.sunIndicator.setAttribute("filter", "drop-shadow(0 0 8px rgba(226,232,240,0.6))");
            }
        }
    }

    /**
     * Render Hourly Forecast Carousel (24 Hours)
     */
    renderHourlyForecast() {
        const container = this.dom.hourlyContainer;
        container.innerHTML = "";

        const hourly = this.currentWeatherData.hourly;
        const tz = this.currentWeatherData.timezone;
        const unit = this.preferences.tempUnit;

        hourly.forEach((h, index) => {
            const card = document.createElement("div");
            card.className = `hourly-item-card ${index === 0 ? 'is-now' : ''}`;

            const hourDate = new Date(h.time);
            const timeLabel = index === 0 ? "Now" : hourDate.toLocaleTimeString([], {
                timeZone: tz,
                hour: 'numeric',
                hour12: true
            });

            const temp = unit === "F" ? Math.round(weatherService.cToF(h.tempC)) : Math.round(h.tempC);

            card.innerHTML = `
                <span class="hour-time">${timeLabel}</span>
                <span class="hour-icon" title="${h.wmo.condition}">${h.wmo.icon}</span>
                <strong class="hour-temp">${temp}°</strong>
                ${h.precipProb > 10 ? `<span class="hour-rain">💧 ${h.precipProb}%</span>` : `<span class="hour-rain" style="opacity:0.4;">💧 0%</span>`}
            `;

            container.appendChild(card);
        });
    }

    /**
     * Render Rain Probability Timeline (Hourly 24-hour sequence with real precip prob % and mm)
     */
    renderRainTimeline() {
        if (!this.dom.rainTimelineContainer || !this.currentWeatherData) return;
        const container = this.dom.rainTimelineContainer;
        container.innerHTML = "";

        const hourly = this.currentWeatherData.hourly || [];
        const tz = this.currentWeatherData.timezone;

        if (hourly.length === 0) {
            container.innerHTML = `<div style="padding: 1rem; color: var(--color-text-muted); font-size: 0.85rem;">Hourly precipitation data unavailable.</div>`;
            return;
        }

        hourly.slice(0, 24).forEach((h, index) => {
            const item = document.createElement("div");
            item.className = `rain-timeline-item ${index === 0 ? 'is-now' : ''}`;

            const hourDate = new Date(h.time);
            const timeLabel = index === 0 ? "Now" : hourDate.toLocaleTimeString([], {
                timeZone: tz,
                hour: 'numeric',
                hour12: true
            });

            const prob = typeof h.precipProb === "number" ? Math.round(h.precipProb) : 0;
            const vol = typeof h.precipitationMm === "number" ? h.precipitationMm : 0;
            const unit = this.preferences.tempUnit;
            const temp = unit === "F" ? Math.round(weatherService.cToF(h.tempC)) : Math.round(h.tempC);

            item.innerHTML = `
                <span class="rain-timeline-time">${timeLabel}</span>
                <span class="rain-timeline-icon" title="${h.wmo.condition}">${h.wmo.icon}</span>
                <span class="rain-timeline-temp">${temp}°</span>
                <div class="rain-bar-track">
                    <div class="rain-bar-fill" style="height: ${Math.max(4, Math.min(100, prob))}%;"></div>
                </div>
                <span class="rain-timeline-prob">${prob}%</span>
                ${vol > 0 ? `<span class="rain-timeline-vol">${vol.toFixed(1)}mm</span>` : `<span class="rain-timeline-vol" style="opacity:0.3;">0mm</span>`}
            `;

            container.appendChild(item);
        });
    }

    /**
     * Render 7-Day Extended Forecast
     */
    renderDailyForecast() {
        const container = this.dom.dailyForecastContainer;
        container.innerHTML = "";

        const daily = this.currentWeatherData.daily;
        const tz = this.currentWeatherData.timezone;
        const unit = this.preferences.tempUnit;

        // Find min and max across all days for normalized temperature bar
        let globalMin = Infinity;
        let globalMax = -Infinity;
        daily.forEach(d => {
            if (d.minTempC < globalMin) globalMin = d.minTempC;
            if (d.maxTempC > globalMax) globalMax = d.maxTempC;
        });
        const tempSpan = Math.max(1, globalMax - globalMin);

        daily.forEach((d, idx) => {
            const row = document.createElement("div");
            row.className = "daily-row";

            const dayDate = new Date(d.date + "T00:00:00");
            const dayName = idx === 0 ? "Today" : dayDate.toLocaleDateString([], { timeZone: tz, weekday: 'short' });
            const dateSub = dayDate.toLocaleDateString([], { timeZone: tz, month: 'short', day: 'numeric' });

            const minTemp = unit === "F" ? Math.round(weatherService.cToF(d.minTempC)) : Math.round(d.minTempC);
            const maxTemp = unit === "F" ? Math.round(weatherService.cToF(d.maxTempC)) : Math.round(d.maxTempC);

            // Compute percentage offsets for bar fill
            const leftPct = ((d.minTempC - globalMin) / tempSpan) * 100;
            const widthPct = Math.max(10, ((d.maxTempC - d.minTempC) / tempSpan) * 100);

            row.innerHTML = `
                <div>
                    <div class="daily-name">${dayName}</div>
                    <div class="daily-date-sub">${dateSub}</div>
                </div>
                <div class="daily-icon" title="${d.wmo.condition}">${d.wmo.icon}</div>
                <div class="daily-condition-label">${d.wmo.condition} ${d.precipProbMax > 20 ? `<span style="color:#38bdf8;">(${d.precipProbMax}%)</span>` : ''}</div>
                <div class="daily-temps-bar-wrap">
                    <span class="daily-min">${minTemp}°</span>
                    <div class="daily-bar-track">
                        <div class="daily-bar-fill" style="left: ${leftPct}%; width: ${widthPct}%;"></div>
                    </div>
                    <span class="daily-max">${maxTemp}°</span>
                </div>
            `;

            container.appendChild(row);
        });
    }

    /**
     * Render Deterministic Weather Insights
     */
    renderInsights() {
        const container = this.dom.insightsContainer;
        container.innerHTML = "";

        const insights = this.currentWeatherData.insights || [];
        if (insights.length === 0) {
            container.innerHTML = `<p style="color:var(--color-text-muted); font-size:0.85rem;">Standard meteorological conditions detected across all sensors.</p>`;
            return;
        }

        insights.forEach(item => {
            const el = document.createElement("div");
            el.className = "insight-item";
            el.innerHTML = `
                <span class="insight-icon">${item.icon}</span>
                <div>
                    <span class="insight-cat">${item.category}</span>
                    <p class="insight-text">${item.text}</p>
                </div>
            `;
            container.appendChild(el);
        });
    }

    /**
     * Render Interactive Weather Charts with Chart.js
     */
    /**
     * Render Interactive Weather Charts with Chart.js
     */
    renderWeatherChart() {
        if (!this.currentWeatherData) return;

        if (!window.Chart) {
            setTimeout(() => this.renderWeatherChart(), 250);
            return;
        }

        const canvas = this.dom.chartCanvas || document.getElementById("weatherChart");
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        const hourly = this.currentWeatherData.hourly || [];
        const tz = this.currentWeatherData.timezone || "auto";
        const unit = this.preferences.tempUnit;

        // Destroy existing chart instance to prevent memory leaks / duplicates
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }

        if (hourly.length === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#94a3b8";
            ctx.font = "14px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("Data unavailable for this location", canvas.width / 2, canvas.height / 2);
            return;
        }

        const labels = hourly.map((h, i) => {
            if (i === 0) return "Now";
            try {
                return new Date(h.time).toLocaleTimeString([], { timeZone: tz, hour: 'numeric', hour12: true });
            } catch (e) {
                return new Date(h.time).toLocaleTimeString([], { hour: 'numeric', hour12: true });
            }
        });

        let datasets = [];

        if (this.activeChartTab === "temp") {
            const tempData = hourly.map(h => unit === "F" ? Math.round(weatherService.cToF(h.tempC)) : Math.round(h.tempC));
            const feelData = hourly.map(h => unit === "F" ? Math.round(weatherService.cToF(h.apparentTempC)) : Math.round(h.apparentTempC));

            const tempGradient = ctx.createLinearGradient(0, 0, 0, 240);
            tempGradient.addColorStop(0, "rgba(56, 189, 248, 0.45)");
            tempGradient.addColorStop(1, "rgba(56, 189, 248, 0.0)");

            datasets = [
                {
                    label: `Temperature (°${unit})`,
                    data: tempData,
                    borderColor: "#38bdf8",
                    backgroundColor: tempGradient,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: "#ffffff",
                    pointBorderColor: "#38bdf8",
                    pointBorderWidth: 2
                },
                {
                    label: `Feels Like (°${unit})`,
                    data: feelData,
                    borderColor: "rgba(245, 158, 11, 0.8)",
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }
            ];
        } else if (this.activeChartTab === "humidity") {
            const humidityData = hourly.map(h => h.humidity !== undefined ? h.humidity : 0);
            const precipProbData = hourly.map(h => h.precipProb !== undefined ? h.precipProb : 0);

            datasets = [
                {
                    label: "Humidity (%)",
                    data: humidityData,
                    borderColor: "#38bdf8",
                    backgroundColor: "rgba(56, 189, 248, 0.2)",
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    yAxisID: "y"
                },
                {
                    label: "Precipitation Probability (%)",
                    data: precipProbData,
                    borderColor: "#a855f7",
                    backgroundColor: "rgba(168, 85, 247, 0.4)",
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    yAxisID: "y"
                }
            ];
        } else if (this.activeChartTab === "wind") {
            const windData = hourly.map(h => this.preferences.windUnit === "mph" ? Math.round(weatherService.kmhToMph(h.windSpeedKmh)) : Math.round(h.windSpeedKmh));

            const windGradient = ctx.createLinearGradient(0, 0, 0, 240);
            windGradient.addColorStop(0, "rgba(16, 185, 129, 0.4)");
            windGradient.addColorStop(1, "rgba(16, 185, 129, 0.0)");

            datasets = [
                {
                    label: `Wind Speed (${this.preferences.windUnit === "mph" ? "mph" : "km/h"})`,
                    data: windData,
                    borderColor: "#10b981",
                    backgroundColor: windGradient,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6
                }
            ];
        }

        try {
            this.chartInstance = new Chart(ctx, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 600
                    },
                    interaction: {
                        mode: "index",
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            display: true,
                            labels: {
                                color: "#94a3b8",
                                font: { family: "Inter", size: 11 }
                            }
                        },
                        tooltip: {
                            backgroundColor: "rgba(15, 23, 42, 0.9)",
                            titleColor: "#ffffff",
                            bodyColor: "#f8fafc",
                            borderColor: "rgba(56, 189, 248, 0.3)",
                            borderWidth: 1,
                            padding: 10,
                            boxPadding: 4,
                            cornerRadius: 8,
                            titleFont: { family: "Outfit", weight: "bold" },
                            bodyFont: { family: "Inter" }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: "rgba(255, 255, 255, 0.05)" },
                            ticks: { color: "#94a3b8", font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }
                        },
                        y: {
                            grid: { color: "rgba(255, 255, 255, 0.05)" },
                            ticks: { color: "#94a3b8", font: { size: 10 } }
                        }
                    }
                }
            });
        } catch (err) {
            console.error("Chart creation error:", err);
        }
    }

    /**
     * ==========================================================================
     * PREMIUM LEAFLET GEOGRAPHIC MAP & SATELLITE ENGINE
     * ==========================================================================
     */

    /**
     * Initialize Leaflet Geographic Map with Real Satellite & Standard Layers
     */
    initMap() {
        if (!this.dom.mapContainer) return;

        if (!window.L) {
            setTimeout(() => this.initMap(), 250);
            return;
        }

        try {
            const initialLat = this.currentLocation ? this.currentLocation.latitude : CONFIG.DEFAULTS.LATITUDE;
            const initialLon = this.currentLocation ? this.currentLocation.longitude : CONFIG.DEFAULTS.LONGITUDE;

            // Initialize Map Instance
            this.mapInstance = L.map(this.dom.mapContainer, {
                zoomControl: true,
                attributionControl: true,
                scrollWheelZoom: true
            }).setView([initialLat, initialLon], 11);

            // 1. Legitimate Satellite Imagery Layer (Esri World Imagery)
            this.mapLayers.satellite = L.tileLayer(
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                {
                    maxZoom: 19,
                    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                }
            );

            // 2. Legitimate Standard OpenStreetMap Layer
            this.mapLayers.standard = L.tileLayer(
                "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                {
                    maxZoom: 19,
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
                }
            );

            // Attach loading feedback & error fallback on tile layers
            Object.values(this.mapLayers).forEach(layer => {
                if (typeof layer.on === "function") {
                    layer.on("loading", () => {
                        if (this.dom.mapLoadingOverlay) {
                            this.dom.mapLoadingOverlay.classList.remove("hidden");
                        }
                    });
                    layer.on("load", () => {
                        if (this.dom.mapLoadingOverlay) {
                            this.dom.mapLoadingOverlay.classList.add("hidden");
                        }
                    });
                    layer.on("tileerror", () => {
                        if (this.dom.mapLoadingOverlay) {
                            this.dom.mapLoadingOverlay.classList.add("hidden");
                        }
                    });
                }
            });

            // Default to Satellite view
            this.mapLayers[this.activeMapLayer].addTo(this.mapInstance);

            // Create initial custom weather radar marker
            this.renderCustomMapMarker(initialLat, initialLon);

            // Trigger size refresh
            setTimeout(() => {
                if (this.mapInstance) this.mapInstance.invalidateSize();
            }, 300);
        } catch (err) {
            console.warn("Leaflet map initialization error:", err);
        }
    }

    /**
     * Switch Active Tile Layer (Standard | Satellite)
     */
    setMapLayer(layerKey) {
        if (!this.mapInstance || !this.mapLayers[layerKey] || this.activeMapLayer === layerKey) return;

        try {
            // Remove previous active layer
            if (this.mapLayers[this.activeMapLayer]) {
                this.mapInstance.removeLayer(this.mapLayers[this.activeMapLayer]);
            }

            // Add new active layer
            this.mapLayers[layerKey].addTo(this.mapInstance);
            this.activeMapLayer = layerKey;

            // Ensure markers stay on top
            if (this.mapMarker && this.mapMarker._icon) {
                this.mapMarker.setZIndexOffset(1000);
            }
            if (this.placeMapMarker && this.placeMapMarker._icon) {
                this.placeMapMarker.setZIndexOffset(1000);
            }

            // Update button active states
            if (this.dom.mapLayerSatelliteBtn) {
                this.dom.mapLayerSatelliteBtn.classList.toggle("active", layerKey === "satellite");
                this.dom.mapLayerSatelliteBtn.setAttribute("aria-selected", layerKey === "satellite" ? "true" : "false");
            }
            if (this.dom.mapLayerStandardBtn) {
                this.dom.mapLayerStandardBtn.classList.toggle("active", layerKey === "standard");
                this.dom.mapLayerStandardBtn.setAttribute("aria-selected", layerKey === "standard" ? "true" : "false");
            }

            this.showToast(`Switched map layer to ${layerKey.toUpperCase()}`, "info");
        } catch (e) {
            console.error("Error switching map layer:", e);
        }
    }

    /**
     * Create or update custom pulsing weather radar marker
     */
    renderCustomMapMarker(lat, lon) {
        if (!this.mapInstance) return;

        const cur = this.currentWeatherData?.current;
        const tempStr = cur ? (
            this.preferences.tempUnit === "F"
                ? `${Math.round(weatherService.cToF(cur.tempC))}°F`
                : `${Math.round(cur.tempC)}°C`
        ) : "";
        const weatherIcon = cur?.wmo?.icon || "🌤️";
        const cityName = this.currentLocation?.name || "Target Location";

        const customIcon = L.divIcon({
            className: "weather-map-marker-container",
            html: `
                <div class="weather-map-marker">
                    <div class="marker-pulse-ring"></div>
                    <div class="marker-pulse-core"></div>
                    ${tempStr ? `
                    <div class="marker-temp-badge">
                        <span class="marker-badge-icon">${weatherIcon}</span>
                        <span class="marker-badge-temp">${tempStr}</span>
                    </div>` : ''}
                </div>
            `,
            iconSize: [60, 60],
            iconAnchor: [30, 30]
        });

        if (this.mapMarker) {
            this.mapMarker.setLatLng([lat, lon]);
            this.mapMarker.setIcon(customIcon);
        } else {
            this.mapMarker = L.marker([lat, lon], { icon: customIcon }).addTo(this.mapInstance);
        }

        const conditionDesc = cur?.wmo?.condition || "Live weather";
        this.mapMarker.bindPopup(`
            <div style="font-family: Outfit, Inter, sans-serif; padding: 4px 6px;">
                <div style="font-weight: 700; font-size: 1.05rem; color: #0f172a; display: flex; align-items: center; gap: 6px;">
                    <span>${weatherIcon}</span> <span>${cityName}</span>
                </div>
                <div style="color: #0284c7; font-weight: 600; font-size: 0.95rem; margin-top: 2px;">
                    ${tempStr} • ${conditionDesc}
                </div>
                <div style="color: #64748b; font-size: 0.75rem; margin-top: 4px;">
                    ${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E
                </div>
            </div>
        `);
    }

    /**
     * Update Leaflet Map Marker and Smoothly Fly to New Viewport
     */
    updateMap() {
        if (!this.currentLocation) return;

        if (!this.mapInstance) {
            this.initMap();
            return;
        }

        const lat = this.currentLocation.latitude;
        const lon = this.currentLocation.longitude;

        this.dom.mapCoordinatesLabel.textContent = `Lat: ${lat.toFixed(4)}°, Lon: ${lon.toFixed(4)}°`;

        // Smooth cinematic flyTo transition to new coordinates
        this.mapInstance.flyTo([lat, lon], 12, {
            animate: true,
            duration: 1.5,
            easeLinearity: 0.25
        });

        // Update custom marker
        this.renderCustomMapMarker(lat, lon);

        // Update atmospheric map overlay tint
        this.updateMapAtmosphereOverlay();

        // Invalidate map size to ensure all tiles render crisp without gray gaps
        setTimeout(() => {
            if (this.mapInstance) this.mapInstance.invalidateSize();
        }, 300);
    }

    /**
     * Update subtle atmospheric tint overlay on top of map
     */
    updateMapAtmosphereOverlay() {
        if (!this.dom.mapAtmosphereOverlay || !this.currentWeatherData) return;
        const cur = this.currentWeatherData.current;
        const theme = cur.wmo.theme || "clear-day";

        this.dom.mapAtmosphereOverlay.className = "map-atmosphere-overlay";

        if (theme === "rain" || theme === "drizzle") {
            this.dom.mapAtmosphereOverlay.classList.add("map-rain");
        } else if (theme === "thunderstorm") {
            this.dom.mapAtmosphereOverlay.classList.add("map-thunderstorm");
        } else if (theme === "snow") {
            this.dom.mapAtmosphereOverlay.classList.add("map-snow");
        } else if (theme === "fog" || theme === "mist") {
            this.dom.mapAtmosphereOverlay.classList.add("map-fog");
        } else if (theme === "clear-night" || theme === "partly-cloudy-night") {
            this.dom.mapAtmosphereOverlay.classList.add("map-night");
        } else if (theme === "cloudy") {
            this.dom.mapAtmosphereOverlay.classList.add("map-cloudy");
        } else {
            this.dom.mapAtmosphereOverlay.classList.add("map-clear");
        }
    }

    /**
     * Live Local Time Clock for Selected City's Timezone
     */
    startLocalTimeClock() {
        clearInterval(this.localTimeInterval);

        const updateClock = () => {
            if (!this.currentWeatherData || !this.currentWeatherData.timezone) return;
            try {
                const now = new Date();
                const formatted = new Intl.DateTimeFormat([], {
                    timeZone: this.currentWeatherData.timezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                }).format(now);

                this.dom.localTimeDisplay.textContent = formatted;
            } catch (e) {
                this.dom.localTimeDisplay.textContent = new Date().toLocaleTimeString();
            }
        };

        updateClock();
        this.localTimeInterval = setInterval(updateClock, 1000);
    }

    /**
     * ==========================================================================
     * 3D ANIMATED WEATHER BACKGROUND & MULTI-DEPTH PARTICLE ENGINE
     * ==========================================================================
     */

    /**
     * Dynamic Weather Atmosphere & Theme Adaptor
     */
    updateAtmosphericTheme() {
        if (!this.currentWeatherData) return;
        const cur = this.currentWeatherData.current;
        const theme = cur.wmo.theme || (cur.isDay ? "clear-day" : "clear-night");

        // Remove all previous theme classes on body
        document.body.className = "";
        document.body.classList.add(`theme-${theme}`);

        // Update 3D Sky Atmosphere classes
        if (this.dom.skyAtmosphere) {
            this.dom.skyAtmosphere.className = "sky-atmosphere";
            if (theme === "clear-day") {
                this.dom.skyAtmosphere.classList.add("atmosphere-clear-day");
            } else if (theme === "clear-night") {
                this.dom.skyAtmosphere.classList.add("atmosphere-clear-night");
            } else if (theme === "rain" || theme === "drizzle") {
                this.dom.skyAtmosphere.classList.add("atmosphere-rain");
            } else if (theme === "thunderstorm") {
                this.dom.skyAtmosphere.classList.add("atmosphere-thunderstorm");
            } else if (theme === "snow") {
                this.dom.skyAtmosphere.classList.add("atmosphere-snow");
            } else if (theme === "fog" || theme === "mist") {
                this.dom.skyAtmosphere.classList.add("atmosphere-fog");
            } else {
                this.dom.skyAtmosphere.classList.add("atmosphere-cloudy");
            }
        }

        // Configure Sun / Moon glow layer visibility
        if (this.dom.sunGlowLayer) {
            if (theme === "clear-day" || theme === "partly-cloudy-day") {
                this.dom.sunGlowLayer.style.opacity = "0.8";
                this.dom.sunGlowLayer.style.background = "radial-gradient(circle at 75% 15%, rgba(251, 191, 36, 0.35) 0%, rgba(245, 158, 11, 0.12) 40%, transparent 70%)";
            } else if (theme === "clear-night" || theme === "partly-cloudy-night") {
                this.dom.sunGlowLayer.style.opacity = "0.6";
                this.dom.sunGlowLayer.style.background = "radial-gradient(circle at 80% 20%, rgba(224, 242, 254, 0.28) 0%, rgba(186, 230, 253, 0.08) 35%, transparent 65%)";
            } else {
                this.dom.sunGlowLayer.style.opacity = "0.15";
            }
        }

        // Configure Cloud backdrop visibility
        if (this.dom.cloudBackdropLayer) {
            if (theme === "clear-day" || theme === "clear-night") {
                this.dom.cloudBackdropLayer.style.opacity = "0.2";
            } else if (theme === "partly-cloudy-day" || theme === "partly-cloudy-night") {
                this.dom.cloudBackdropLayer.style.opacity = "0.45";
            } else {
                this.dom.cloudBackdropLayer.style.opacity = "0.85";
            }
        }

        this.currentAtmosphereType = theme;
        this.resetParticlesForAtmosphere(theme);
    }

    /**
     * Canvas Atmospheric Particle Engine
     * Generates subtle, elegant live multi-depth physics for Rain, Snow, Thunderstorm, Mist, Sun glow, and Clear Night Stars
     */
    initAtmosphereCanvas() {
        this.canvas = document.getElementById("atmosphereCanvas");
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext("2d");
        this.resizeCanvas();
        window.addEventListener("resize", () => this.resizeCanvas());

        this.animateAtmosphere();
    }

    resizeCanvas() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.resetParticlesForAtmosphere(this.currentAtmosphereType);
    }

    /**
     * Reset and generate 3D Depth-Layered Particles according to weather condition
     */
    resetParticlesForAtmosphere(type) {
        if (!this.canvas) return;
        this.particles = [];
        const w = this.canvas.width;
        const h = this.canvas.height;
        const isMobile = window.innerWidth < 768;

        if (type === "rain" || type === "thunderstorm" || type === "drizzle") {
            // Multi-depth rain: Foreground (fast/bright), Midground (medium), Background (slow/faint)
            const count = isMobile ? 60 : Math.min(130, Math.floor(w / 12));
            for (let i = 0; i < count; i++) {
                const depth = Math.random(); // 0 = background, 1 = foreground
                this.particles.push({
                    x: Math.random() * (w + 100),
                    y: Math.random() * h,
                    length: depth > 0.7 ? (Math.random() * 15 + 20) : (depth > 0.3 ? Math.random() * 10 + 12 : Math.random() * 6 + 8),
                    speed: depth > 0.7 ? (Math.random() * 6 + 18) : (depth > 0.3 ? Math.random() * 4 + 12 : Math.random() * 3 + 8),
                    opacity: depth > 0.7 ? 0.5 : (depth > 0.3 ? 0.3 : 0.15),
                    depth: depth,
                    slant: -1.2
                });
            }
        } else if (type === "snow") {
            // Layered 3D Snow: Foreground (large flakes), Midground, Background (tiny drifting powder)
            const count = isMobile ? 40 : Math.min(90, Math.floor(w / 16));
            for (let i = 0; i < count; i++) {
                const depth = Math.random();
                this.particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    radius: depth > 0.7 ? (Math.random() * 2 + 3) : (depth > 0.3 ? Math.random() * 1.5 + 1.5 : Math.random() * 1 + 0.8),
                    speedY: depth > 0.7 ? (Math.random() * 1 + 1.6) : (depth > 0.3 ? Math.random() * 0.8 + 1.0 : Math.random() * 0.5 + 0.6),
                    speedX: (Math.random() - 0.5) * 0.6,
                    swayOffset: Math.random() * Math.PI * 2,
                    swaySpeed: Math.random() * 0.02 + 0.01,
                    opacity: depth > 0.7 ? 0.75 : (depth > 0.3 ? 0.5 : 0.25),
                    depth: depth
                });
            }
        } else if (type === "fog" || type === "mist") {
            // Layered drifting atmospheric mist particles
            const count = isMobile ? 15 : 30;
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    radius: Math.random() * 80 + 50,
                    speedX: Math.random() * 0.3 + 0.1,
                    speedY: (Math.random() - 0.5) * 0.1,
                    opacity: Math.random() * 0.06 + 0.02
                });
            }
        } else if (type === "clear-night" || type === "partly-cloudy-night") {
            // Multi-depth twinkling celestial stars & gentle stardust
            const count = isMobile ? 45 : Math.min(100, Math.floor(w / 14));
            for (let i = 0; i < count; i++) {
                const depth = Math.random();
                this.particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    radius: depth > 0.8 ? (Math.random() * 1 + 1.5) : (depth > 0.3 ? Math.random() * 0.8 + 0.8 : 0.5),
                    twinkleSpeed: Math.random() * 0.03 + 0.01,
                    phase: Math.random() * Math.PI * 2,
                    baseAlpha: depth > 0.8 ? 0.8 : (depth > 0.3 ? 0.5 : 0.3),
                    depth: depth
                });
            }
        } else if (type === "clear-day" || type === "partly-cloudy-day") {
            // Soft floating sunbeam particles & atmospheric dust motes
            const count = isMobile ? 20 : Math.min(45, Math.floor(w / 28));
            for (let i = 0; i < count; i++) {
                const depth = Math.random();
                this.particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    radius: Math.random() * 2 + 1,
                    speedY: (Math.random() - 0.5) * 0.35,
                    speedX: (Math.random() - 0.5) * 0.35,
                    opacity: depth > 0.6 ? 0.25 : 0.12,
                    depth: depth
                });
            }
        } else {
            // Cloudy / Overcast: Subtle floating mist motes
            const count = isMobile ? 15 : 30;
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    radius: Math.random() * 2.5 + 1,
                    speedY: (Math.random() - 0.5) * 0.2,
                    speedX: (Math.random() - 0.5) * 0.3,
                    opacity: 0.1
                });
            }
        }
    }

    /**
     * Cinematic Frame-by-Frame Atmospheric Renderer
     */
    animateAtmosphere() {
        if (!this.ctx || !this.canvas) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const w = this.canvas.width;
        const h = this.canvas.height;
        const type = this.currentAtmosphereType;

        if (type === "rain" || type === "thunderstorm" || type === "drizzle") {
            for (const p of this.particles) {
                this.ctx.strokeStyle = `rgba(186, 230, 253, ${p.opacity})`;
                this.ctx.lineWidth = p.depth > 0.7 ? 1.4 : (p.depth > 0.3 ? 1.0 : 0.7);
                this.ctx.beginPath();
                this.ctx.moveTo(p.x, p.y);
                this.ctx.lineTo(p.x + p.slant, p.y + p.length);
                this.ctx.stroke();

                p.y += p.speed;
                p.x += p.slant;

                if (p.y > h) {
                    p.y = -25;
                    p.x = Math.random() * (w + 100);
                }
            }

            // Thunderstorm subtle, rare atmospheric illumination flash
            if (type === "thunderstorm" && Math.random() < 0.003) {
                this.ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
                this.ctx.fillRect(0, 0, w, h);
            }
        } else if (type === "snow") {
            for (const p of this.particles) {
                p.swayOffset += p.swaySpeed;
                const currentX = p.x + Math.sin(p.swayOffset) * 1.5;

                this.ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
                this.ctx.beginPath();
                this.ctx.arc(currentX, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fill();

                p.y += p.speedY;
                p.x += p.speedX;

                if (p.y > h) {
                    p.y = -10;
                    p.x = Math.random() * w;
                }
            }
        } else if (type === "fog" || type === "mist") {
            for (const p of this.particles) {
                const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
                grad.addColorStop(0, `rgba(226, 232, 240, ${p.opacity})`);
                grad.addColorStop(1, "transparent");

                this.ctx.fillStyle = grad;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fill();

                p.x += p.speedX;
                p.y += p.speedY;

                if (p.x - p.radius > w) p.x = -p.radius;
                if (p.y - p.radius > h) p.y = -p.radius;
                if (p.y + p.radius < 0) p.y = h + p.radius;
            }
        } else if (type === "clear-night" || type === "partly-cloudy-night") {
            for (const p of this.particles) {
                p.phase += p.twinkleSpeed;
                const alpha = (Math.sin(p.phase) + 1) / 2 * p.baseAlpha + 0.15;
                this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        } else if (type === "clear-day" || type === "partly-cloudy-day") {
            for (const p of this.particles) {
                this.ctx.fillStyle = `rgba(254, 240, 138, ${p.opacity})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fill();

                p.x += p.speedX;
                p.y += p.speedY;

                if (p.x < 0) p.x = w;
                if (p.x > w) p.x = 0;
                if (p.y < 0) p.y = h;
                if (p.y > h) p.y = 0;
            }
        } else {
            // General cloudy particles
            for (const p of this.particles) {
                this.ctx.fillStyle = `rgba(203, 213, 225, ${p.opacity})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fill();

                p.x += p.speedX;
                p.y += p.speedY;

                if (p.x < 0) p.x = w;
                if (p.x > w) p.x = 0;
                if (p.y < 0) p.y = h;
                if (p.y > h) p.y = 0;
            }
        }

        this.animationFrameId = requestAnimationFrame(() => this.animateAtmosphere());
    }

    /**
     * Smooth 3D Background Parallax (Moves atmospheric layers at different depths)
     */
    initBackgroundParallax() {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

        window.addEventListener("mousemove", (e) => {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            this.mousePos.targetX = (e.clientX - centerX) / centerX; // Range: -1 to 1
            this.mousePos.targetY = (e.clientY - centerY) / centerY; // Range: -1 to 1

            if (!this.parallaxRAF) {
                this.parallaxRAF = requestAnimationFrame(() => this.updateParallaxLayers());
            }
        });
    }

    updateParallaxLayers() {
        // Smooth lerp interpolation
        this.mousePos.currentX += (this.mousePos.targetX - this.mousePos.currentX) * 0.05;
        this.mousePos.currentY += (this.mousePos.targetY - this.mousePos.currentY) * 0.05;

        const x = this.mousePos.currentX;
        const y = this.mousePos.currentY;

        // Layer 1: Sky Atmosphere (Far depth)
        if (this.dom.skyAtmosphere) {
            this.dom.skyAtmosphere.style.transform = `translate3d(${(x * 8).toFixed(1)}px, ${(y * 6).toFixed(1)}px, 0)`;
        }

        // Layer 2: Sun Glow / Celestial Light (Mid-far depth)
        if (this.dom.sunGlowLayer) {
            this.dom.sunGlowLayer.style.transform = `translate3d(${(x * 14).toFixed(1)}px, ${(y * 10).toFixed(1)}px, 0)`;
        }

        // Layer 3: Cloud Backdrop (Mid depth)
        if (this.dom.cloudBackdropLayer) {
            this.dom.cloudBackdropLayer.style.transform = `translate3d(${(x * 20).toFixed(1)}px, ${(y * 14).toFixed(1)}px, 0)`;
        }

        // Layer 4: Particle Canvas (Foreground depth)
        if (this.canvas) {
            this.canvas.style.transform = `translate3d(${(x * 26).toFixed(1)}px, ${(y * 18).toFixed(1)}px, 0)`;
        }

        const delta = Math.abs(this.mousePos.targetX - this.mousePos.currentX) + Math.abs(this.mousePos.targetY - this.mousePos.currentY);
        if (delta > 0.001) {
            this.parallaxRAF = requestAnimationFrame(() => this.updateParallaxLayers());
        } else {
            this.parallaxRAF = null;
        }
    }

    /**
     * 3D Card Tilt Interaction with Smooth Physics (Desktop Only)
     */
    init3DTilt() {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

        const tiltCards = document.querySelectorAll("[data-tilt]");

        tiltCards.forEach(card => {
            card.addEventListener("mousemove", (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = ((y - centerY) / centerY) * -6;
                const rotateY = ((x - centerX) / centerX) * 6;

                card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`;
            });

            card.addEventListener("mouseleave", () => {
                card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
            });
        });
    }

    /**
     * Favorites System
     */
    toggleCurrentFavorite() {
        if (!this.currentLocation) return;
        const isFav = storageService.toggleFavorite(this.currentLocation);
        this.updateFavoriteStarIcon();
        this.renderFavorites();
        this.showToast(isFav ? `Added ${this.currentLocation.name} to favorites ⭐` : `Removed ${this.currentLocation.name} from favorites.`, "info");
    }

    updateFavoriteStarIcon() {
        const isFav = storageService.isFavorite(this.currentLocation);
        this.dom.favoriteToggleBtn.classList.toggle("favorited", isFav);
        this.dom.favoriteStarIcon.textContent = isFav ? "★" : "☆";
    }

    renderFavorites() {
        const list = this.dom.favoritesList;
        const favorites = storageService.getFavorites();
        this.dom.favoritesCount.textContent = `${favorites.length} saved`;

        if (favorites.length === 0) {
            this.dom.favoritesEmptyState.classList.remove("hidden");
            list.innerHTML = "";
            list.appendChild(this.dom.favoritesEmptyState);
            return;
        }

        this.dom.favoritesEmptyState.classList.add("hidden");
        list.innerHTML = "";

        favorites.forEach(fav => {
            const card = document.createElement("div");
            card.className = "favorite-item-card";

            card.innerHTML = `
                <div>
                    <div class="fav-city-title">📍 ${fav.name}</div>
                    <div class="fav-country-sub">${[fav.admin1, fav.country].filter(Boolean).join(", ")}</div>
                </div>
                <div class="fav-weather-right">
                    <button class="fav-remove-btn" title="Remove favorite" aria-label="Remove favorite">✕</button>
                </div>
            `;

            // Click to load
            card.addEventListener("click", (e) => {
                if (e.target.closest(".fav-remove-btn")) return;
                this.loadLocationWeather(fav);
            });

            // Remove button
            const removeBtn = card.querySelector(".fav-remove-btn");
            removeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                storageService.removeFavorite(fav);
                this.renderFavorites();
                this.updateFavoriteStarIcon();
            });

            list.appendChild(card);
        });
    }

    /**
     * Recent Searches
     */
    renderRecentSearches() {
        const recents = storageService.getRecentSearches();
        const container = this.dom.recentList;
        container.innerHTML = "";

        if (recents.length === 0) {
            this.dom.recentSection.classList.add("hidden");
            return;
        }

        this.dom.recentSection.classList.remove("hidden");

        recents.forEach(item => {
            const tag = document.createElement("button");
            tag.className = "recent-tag";
            tag.innerHTML = `<span>📍 ${item.name}</span>`;

            tag.addEventListener("click", () => {
                this.loadLocationWeather(item);
            });

            container.appendChild(tag);
        });
    }

    /**
     * Unit Conversion Toggle
     */
    setTemperatureUnit(unit) {
        if (this.preferences.tempUnit === unit) return;
        this.preferences.tempUnit = unit;
        storageService.savePreferences({ tempUnit: unit });
        this.applyUnitPreferences();

        if (this.currentWeatherData) {
            this.renderMasterWeatherCard();
            this.renderHourlyForecast();
            this.renderDailyForecast();
            this.renderWeatherChart();
        }
    }

    applyUnitPreferences() {
        const unit = this.preferences.tempUnit;
        this.dom.unitCelsiusBtn.classList.toggle("active", unit === "C");
        this.dom.unitCelsiusBtn.setAttribute("aria-pressed", unit === "C" ? "true" : "false");
        this.dom.unitFahrenheitBtn.classList.toggle("active", unit === "F");
        this.dom.unitFahrenheitBtn.setAttribute("aria-pressed", unit === "F" ? "true" : "false");
    }

    /**
     * Weather Sharing & Snapshot
     */
    async handleShareWeather() {
        if (!this.currentLocation || !this.currentWeatherData) return;

        const cur = this.currentWeatherData.current;
        const loc = this.currentLocation;
        const unit = this.preferences.tempUnit;
        const temp = unit === "F" ? Math.round(weatherService.cToF(cur.tempC)) : Math.round(cur.tempC);

        const shareText = `🌍 ${loc.name}, ${loc.country} — ${temp}°${unit}, ${cur.wmo.condition} ${cur.wmo.icon}\nHumidity: ${cur.humidity}% | Wind: ${Math.round(cur.windSpeedKmh)} km/h\nCaptured via Aetheria 3D Weather by Ashirbad Pattnaik`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Weather in ${loc.name}`,
                    text: shareText
                });
                this.showToast("Weather shared successfully!", "success");
            } catch (err) {
                if (err.name !== "AbortError") {
                    this.fallbackCopyToClipboard(shareText);
                }
            }
        } else {
            this.fallbackCopyToClipboard(shareText);
        }
    }

    /**
     * ==========================================================================
     * FAMOUS PLACES & NOTABLE ATTRACTIONS MANAGEMENT
     * ==========================================================================
     */

    /**
     * Render Places Loading Skeleton Cards
     */
    renderPlacesSkeletons(cityName) {
        if (!this.dom.placesSection || !this.dom.placesContainer) return;

        this.dom.placesHeading.textContent = `Explore ${cityName}`;
        this.dom.placesSubheading.textContent = `Discovering famous landmarks & attractions in ${cityName}...`;
        this.dom.placesWeatherPill.classList.add("hidden");

        const container = this.dom.placesContainer;
        container.innerHTML = "";

        for (let i = 0; i < 4; i++) {
            const skel = document.createElement("div");
            skel.className = "place-skeleton-card";
            skel.innerHTML = `
                <div class="place-skeleton-img"></div>
                <div class="place-skeleton-body">
                    <div class="place-skeleton-line" style="width: 70%;"></div>
                    <div class="place-skeleton-line" style="width: 90%;"></div>
                    <div class="place-skeleton-line" style="width: 50%;"></div>
                </div>
            `;
            container.appendChild(skel);
        }
    }

    /**
     * Asynchronously discover and load notable places for the canonical location
     */
    async loadLocationPlaces(location, weatherData) {
        if (!location) return;
        const reqKey = `${location.latitude.toFixed(3)}_${location.longitude.toFixed(3)}`;

        try {
            const placesData = await placesService.fetchPlacesForLocation(location, weatherData);

            // Guard against race conditions if user rapidly switched location
            if (this.currentLocation && `${this.currentLocation.latitude.toFixed(3)}_${this.currentLocation.longitude.toFixed(3)}` === reqKey) {
                this.currentPlaces = placesData;
                this.renderPlaces(placesData);
            }
        } catch (error) {
            console.warn("Places discovery error:", error);
            if (this.currentLocation && `${this.currentLocation.latitude.toFixed(3)}_${this.currentLocation.longitude.toFixed(3)}` === reqKey) {
                this.renderPlacesError(location.name);
            }
        }
    }

    /**
     * Render Discovered Notable Places Cards
     */
    renderPlaces(placesData) {
        if (!this.dom.placesContainer) return;

        const container = this.dom.placesContainer;
        container.innerHTML = "";

        if (!placesData || !placesData.places || placesData.places.length === 0) {
            this.dom.placesHeading.textContent = `Explore ${placesData?.cityName || 'Location'}`;
            this.dom.placesSubheading.textContent = "No notable places found for this location.";
            this.dom.placesWeatherPill.classList.add("hidden");

            const empty = document.createElement("div");
            empty.className = "places-empty-state";
            empty.innerHTML = `
                <span class="places-empty-icon">📍</span>
                <h4>No Notable Places Found</h4>
                <p>No encyclopedic landmarks or tourist attractions registered nearby.</p>
            `;
            container.appendChild(empty);
            return;
        }

        // Update Section Header & Weather Context Pill
        this.dom.placesHeading.textContent = `Explore ${placesData.cityName}`;
        this.dom.placesSubheading.textContent = `Discover famous landmarks, heritage, and attractions around ${placesData.cityName}`;

        if (placesData.weatherContext) {
            this.dom.placesWeatherIcon.textContent = placesData.weatherContext.icon || "🌤️";
            this.dom.placesWeatherMsg.textContent = placesData.weatherContext.message || "Live conditions updated";
            this.dom.placesWeatherPill.classList.remove("hidden");
        } else {
            this.dom.placesWeatherPill.classList.add("hidden");
        }

        // Render Place Cards
        placesData.places.forEach(place => {
            const card = document.createElement("div");
            card.className = "place-card";

            const distLabel = place.distanceKm !== null ? `📍 ${place.distanceKm} km away` : "";

            const imgHtml = place.imageUrl 
                ? `<img class="place-card-img" src="${place.imageUrl}" alt="${place.title}" loading="lazy" referrerpolicy="no-referrer" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
                   <div class="place-image-fallback hidden"><span>${place.icon || '🏛️'}</span></div>`
                : `<div class="place-image-fallback"><span>${place.icon || '🏛️'}</span></div>`;

            card.innerHTML = `
                <div class="place-card-image-wrap">
                    ${imgHtml}
                    <div class="place-category-pill">
                        <span>${place.icon}</span>
                        <span>${place.category}</span>
                    </div>
                    ${distLabel ? `<div class="place-distance-pill">${distLabel}</div>` : ''}
                </div>
                <div class="place-card-body">
                    <h4 class="place-card-title" title="${place.title}">${place.title}</h4>
                    <p class="place-card-desc">${place.extract || 'Notable historical landmark and tourist attraction.'}</p>
                    <div class="place-card-footer">
                        <button class="place-view-btn" aria-label="View details for ${place.title}">
                            <span>🔍 View Details</span>
                        </button>
                    </div>
                </div>
            `;

            card.querySelector(".place-view-btn").addEventListener("click", () => {
                this.openPlaceDetailsModal(place);
            });

            container.appendChild(card);
        });
    }

    /**
     * Render Places Error State
     */
    renderPlacesError(cityName) {
        if (!this.dom.placesContainer) return;
        this.dom.placesHeading.textContent = `Explore ${cityName}`;
        this.dom.placesSubheading.textContent = "Places are temporarily unavailable.";
        this.dom.placesWeatherPill.classList.add("hidden");

        const container = this.dom.placesContainer;
        container.innerHTML = `
            <div class="places-error-state">
                <span class="places-empty-icon">⚠️</span>
                <h4>Places Temporarily Unavailable</h4>
                <p>Could not retrieve landmark data at this moment. Weather dashboard remains live.</p>
            </div>
        `;
    }

    /**
     * Open Place Details Modal
     */
    openPlaceDetailsModal(place) {
        if (!place) return;
        this.selectedPlace = place;

        this.dom.placeModalTitle.textContent = place.title;
        this.dom.placeModalCategory.textContent = place.category;
        this.dom.placeModalIcon.textContent = place.icon || "📍";
        this.dom.placeModalExtract.textContent = place.extract || "No extended summary available.";
        this.dom.placeModalCity.textContent = this.currentLocation?.name || "Selected Location";
        this.dom.placeModalCoords.textContent = `${place.latitude.toFixed(4)}°, ${place.longitude.toFixed(4)}°`;

        if (place.distanceKm !== null) {
            this.dom.placeModalDistance.textContent = `📍 ${place.distanceKm} km away`;
            this.dom.placeModalDistance.classList.remove("hidden");
        } else {
            this.dom.placeModalDistance.classList.add("hidden");
        }

        // Weather Context in Modal
        if (this.currentWeatherData && this.currentWeatherData.current) {
            const cur = this.currentWeatherData.current;
            this.dom.placeModalWeather.textContent = `${cur.wmo.icon} ${cur.wmo.condition} (${Math.round(cur.tempC)}°C)`;
        } else {
            this.dom.placeModalWeather.textContent = "Weather data unavailable";
        }

        // Image Handling
        if (place.imageUrl) {
            this.dom.placeModalImage.src = place.imageUrl;
            this.dom.placeModalImage.alt = place.title;
            this.dom.placeModalImage.classList.remove("hidden");
            this.dom.placeModalImageFallback.classList.add("hidden");
            this.dom.placeModalImage.onerror = () => {
                this.dom.placeModalImage.classList.add("hidden");
                this.dom.placeModalImageFallback.classList.remove("hidden");
            };
        } else {
            this.dom.placeModalImage.classList.add("hidden");
            this.dom.placeModalImageFallback.classList.remove("hidden");
        }

        // Links
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
        this.dom.placeModalDirectionsLink.href = directionsUrl;
        this.dom.placeModalWikiLink.href = place.pageUrl || `https://en.wikipedia.org/?curid=${place.id}`;

        this.dom.placeDetailsModal.classList.remove("hidden");
    }

    /**
     * Close Place Details Modal
     */
    closePlaceDetailsModal() {
        this.dom.placeDetailsModal.classList.add("hidden");
    }

    /**
     * View Selected Place on Leaflet Geographic Map
     */
    viewPlaceOnMap(place) {
        if (!place) return;
        this.closePlaceDetailsModal();

        if (!this.mapInstance) {
            this.initMap();
        }

        if (this.mapInstance && typeof place.latitude === "number" && typeof place.longitude === "number") {
            // Smooth cinematic flyTo to landmark
            this.mapInstance.flyTo([place.latitude, place.longitude], 14, {
                animate: true,
                duration: 1.5,
                easeLinearity: 0.25
            });

            // Remove prior place marker if existing
            if (this.placeMapMarker) {
                this.mapInstance.removeLayer(this.placeMapMarker);
            }

            // Create custom pulsing landmark marker
            const landmarkIcon = L.divIcon({
                className: "custom-leaflet-poi-icon",
                html: `
                    <div class="poi-map-marker">
                        <div class="poi-pulse-ring"></div>
                        <div class="poi-core"><span>${place.icon || '📍'}</span></div>
                    </div>
                `,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });

            this.placeMapMarker = L.marker([place.latitude, place.longitude], { icon: landmarkIcon })
                .addTo(this.mapInstance)
                .bindPopup(`
                    <div style="font-family: Outfit, Inter, sans-serif; padding: 4px;">
                        <div style="font-weight: 700; font-size: 1.05rem; color: #0f172a; display: flex; align-items: center; gap: 6px;">
                            <span>${place.icon}</span> <span>${place.title}</span>
                        </div>
                        <div style="color: #475569; font-size: 0.85rem; margin-top: 3px;">
                            ${place.category} ${place.distanceKm !== null ? `• ${place.distanceKm} km away` : ''}
                        </div>
                    </div>
                `)
                .openPopup();

            // Smooth scroll down to map container
            this.dom.mapContainer.scrollIntoView({ behavior: "smooth", block: "center" });
            this.showToast(`Navigated map to ${place.title} 📍`, "info");
        }
    }

    openSnapshotModal() {
        if (!this.currentLocation || !this.currentWeatherData) return;

        const cur = this.currentWeatherData.current;
        const loc = this.currentLocation;
        const unit = this.preferences.tempUnit;
        const temp = unit === "F" ? Math.round(weatherService.cToF(cur.tempC)) : Math.round(cur.tempC);
        const feel = unit === "F" ? Math.round(weatherService.cToF(cur.apparentTempC)) : Math.round(cur.apparentTempC);

        this.dom.snapshotCity.textContent = `${loc.name}, ${loc.country}`;
        this.dom.snapshotDate.textContent = new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        this.dom.snapshotCondition.textContent = cur.wmo.condition;
        this.dom.snapshotIcon.textContent = cur.wmo.icon;
        this.dom.snapshotTemp.textContent = `${temp}°${unit}`;
        this.dom.snapshotFeels.textContent = `${feel}°${unit}`;
        this.dom.snapshotHumidity.textContent = `${cur.humidity}%`;
        this.dom.snapshotWind.textContent = `${Math.round(cur.windSpeedKmh)} km/h`;
        this.dom.snapshotUv.textContent = cur.uvIndex !== undefined ? cur.uvIndex.toFixed(1) : "--";

        this.dom.snapshotModal.classList.remove("hidden");
    }

    closeSnapshotModal() {
        this.dom.snapshotModal.classList.add("hidden");
    }

    copySnapshotText() {
        if (!this.currentLocation || !this.currentWeatherData) return;
        const cur = this.currentWeatherData.current;
        const loc = this.currentLocation;
        const unit = this.preferences.tempUnit;
        const temp = unit === "F" ? Math.round(weatherService.cToF(cur.tempC)) : Math.round(cur.tempC);

        const text = `📸 AETHERIA WEATHER SNAPSHOT\n📍 ${loc.name}, ${loc.country}\n🌡️ ${temp}°${unit} (${cur.wmo.condition} ${cur.wmo.icon})\n💧 Humidity: ${cur.humidity}%\n💨 Wind: ${Math.round(cur.windSpeedKmh)} km/h\nDesigned and Developed by Ashirbad Pattnaik`;
        this.fallbackCopyToClipboard(text);
        this.closeSnapshotModal();
    }

    fallbackCopyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast("Weather summary copied to clipboard! 📋", "success");
        }).catch(() => {
            this.showToast("Unable to copy to clipboard.", "error");
        });
    }

    /**
     * Offline Network Monitor
     */
    initNetworkMonitoring() {
        const updateOnlineStatus = () => {
            const isOffline = !navigator.onLine;
            this.dom.offlineBanner.classList.toggle("hidden", !isOffline);
            if (isOffline) {
                this.showToast("You are offline. Showing cached weather.", "warning");
            } else {
                this.showToast("Network restored. Weather live.", "success");
                if (this.currentLocation) {
                    this.loadLocationWeather(this.currentLocation, { isSilentRefresh: true });
                }
            }
        };

        window.addEventListener("online", updateOnlineStatus);
        window.addEventListener("offline", updateOnlineStatus);
        updateOnlineStatus();
    }

    /**
     * Non-blocking Toast Notification System
     */
    showToast(message, type = "info") {
        const toast = this.dom.statusToast;
        const msgEl = this.dom.statusMessage;
        const iconEl = this.dom.statusIcon;

        const iconMap = {
            info: "ℹ️",
            success: "✅",
            warning: "⚠️",
            error: "❌"
        };

        iconEl.textContent = iconMap[type] || "ℹ️";
        msgEl.textContent = message;

        toast.className = `status-toast ${type}`;
        toast.classList.remove("hidden");

        clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            toast.classList.add("hidden");
        }, 4000);
    }

    /**
     * Initialize Progressive Web App (PWA) Service Worker and Install Banner
     */
    initPwa() {
        // Register service worker if supported
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./service-worker.js')
                    .then((reg) => {
                        console.log('Aetheria ServiceWorker registered:', reg.scope);
                    })
                    .catch((err) => {
                        console.warn('Aetheria ServiceWorker registration error:', err);
                    });
            });
        }

        // Handle PWA Install Prompt
        let deferredPrompt;
        const installBtn = this.dom.pwaInstallBtn;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            if (installBtn) {
                installBtn.classList.remove('hidden');
                installBtn.addEventListener('click', async () => {
                    installBtn.classList.add('hidden');
                    if (deferredPrompt) {
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        if (outcome === 'accepted') {
                            this.showToast('Thank you for installing Aetheria Weather! 🌟', 'success');
                        }
                        deferredPrompt = null;
                    }
                });
            }
        });

        window.addEventListener('appinstalled', () => {
            if (installBtn) installBtn.classList.add('hidden');
            this.showToast('Aetheria Weather is installed and ready for offline use.', 'success');
        });
    }

    setSearchLoading(loading) {
        const btn = this.dom.searchBtn;
        const spinner = btn.querySelector(".btn-spinner");
        const text = btn.querySelector(".btn-text");

        if (loading) {
            spinner?.classList.remove("hidden");
            if (text) text.textContent = "...";
            btn.disabled = true;
        } else {
            spinner?.classList.add("hidden");
            if (text) text.textContent = "Search";
            btn.disabled = false;
        }
    }
}

// Instantiate and Mount Application when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    window.app = new WeatherApp();
    window.app.init();
});