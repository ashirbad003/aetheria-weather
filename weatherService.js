/**
 * Weather Service
 * Connects to Open-Meteo API for real, accurate global current weather, hourly forecast,
 * 7-day daily forecast, WMO code interpretation, units conversion, and deterministic insights.
 */
class WeatherService {
    constructor() {
        this.cache = new Map();
        this.currentAbortController = null;
    }

    /**
     * Fetch complete weather dataset for given coordinates and timezone.
     */
    /**
     * Fetch complete weather dataset for given coordinates and timezone.
     */
    async fetchWeather(latitude, longitude, timezone = "auto", bypassCache = false) {
        if (typeof latitude !== "number" || typeof longitude !== "number") {
            throw new Error("Valid numerical coordinates are required.");
        }

        const cacheKey = `wx_${latitude.toFixed(4)}_${longitude.toFixed(4)}_${timezone}`;
        const now = Date.now();

        if (!bypassCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            // Cache valid for 3 minutes for snappy UI during fast toggles
            if (now - cached.timestamp < 3 * 60 * 1000) {
                return cached.data;
            }
        }

        if (this.currentAbortController) {
            this.currentAbortController.abort();
        }
        this.currentAbortController = new AbortController();

        try {
            const params = new URLSearchParams({
                latitude: latitude.toString(),
                longitude: longitude.toString(),
                current: [
                    "temperature_2m",
                    "relative_humidity_2m",
                    "apparent_temperature",
                    "is_day",
                    "precipitation",
                    "rain",
                    "showers",
                    "snowfall",
                    "weather_code",
                    "cloud_cover",
                    "pressure_msl",
                    "surface_pressure",
                    "wind_speed_10m",
                    "wind_direction_10m",
                    "wind_gusts_10m"
                ].join(","),
                hourly: [
                    "temperature_2m",
                    "relative_humidity_2m",
                    "dew_point_2m",
                    "apparent_temperature",
                    "precipitation_probability",
                    "precipitation",
                    "weather_code",
                    "surface_pressure",
                    "cloud_cover",
                    "visibility",
                    "wind_speed_10m",
                    "wind_direction_10m",
                    "uv_index",
                    "is_day"
                ].join(","),
                daily: [
                    "weather_code",
                    "temperature_2m_max",
                    "temperature_2m_min",
                    "apparent_temperature_max",
                    "apparent_temperature_min",
                    "sunrise",
                    "sunset",
                    "uv_index_max",
                    "precipitation_sum",
                    "precipitation_probability_max",
                    "wind_speed_10m_max",
                    "wind_direction_10m_dominant"
                ].join(","),
                timezone: timezone || "auto",
                forecast_days: "7"
            });

            const url = `${CONFIG.OPEN_METEO_WEATHER_URL}?${params.toString()}`;
            const timeoutId = setTimeout(() => {
                if (this.currentAbortController) this.currentAbortController.abort();
            }, 10000);

            let response;
            try {
                response = await fetch(url, { signal: this.currentAbortController.signal });
            } finally {
                clearTimeout(timeoutId);
            }

            if (!response.ok) {
                if (response.status === 400) {
                    throw new Error("Invalid coordinate parameters provided to weather service.");
                } else if (response.status >= 500) {
                    throw new Error("Weather provider is temporarily experiencing server issues.");
                }
                throw new Error(`Weather service responded with status ${response.status}`);
            }

            const rawData = await response.json();
            const parsed = this.parseWeatherData(rawData);

            // Safe Debug Logging (B15 - no secrets or keys)
            console.log("=== WEATHER DEBUG ===");
            console.log(`Coordinates: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`);
            console.log(`Timezone: ${parsed.timezone}`);
            console.log(`API Timestamp: ${parsed.current.time}`);
            console.log(`Temperature: ${parsed.current.tempC}°C (Feels like ${parsed.current.apparentTempC}°C)`);
            console.log(`Condition: ${parsed.current.wmo.condition} (Code ${rawData.current?.weather_code})`);
            console.log(`Humidity: ${parsed.current.humidity}% | Wind: ${parsed.current.windSpeedKmh} km/h`);
            console.log(`Precipitation: ${parsed.current.precipitationMm} mm`);
            console.log("=====================");

            this.cache.set(cacheKey, {
                timestamp: now,
                data: parsed
            });

            return parsed;
        } catch (error) {
            if (error.name === "AbortError") {
                return null;
            }
            console.error("Weather fetch error:", error);
            throw error;
        }
    }

    /**
     * Structure raw Open-Meteo response into clean domain model
     */
    parseWeatherData(raw) {
        const cur = raw.current || {};
        const hourly = raw.hourly || {};
        const daily = raw.daily || {};
        const tz = raw.timezone || "UTC";

        const isDay = cur.is_day === 1;
        const wmoInfo = this.getWmoInfo(cur.weather_code, isDay);

        // Find current hour index in hourly array
        const currentIso = cur.time;
        let startIndex = 0;
        if (hourly.time && hourly.time.length > 0) {
            const idx = hourly.time.findIndex(t => t >= currentIso);
            if (idx !== -1) startIndex = idx;
        }

        // Slice next 24 hourly data points
        const hourlyList = [];
        const maxHours = Math.min(24, (hourly.time || []).length - startIndex);
        for (let i = 0; i < maxHours; i++) {
            const idx = startIndex + i;
            const hourIsDay = (hourly.is_day && hourly.is_day[idx] !== undefined) ? hourly.is_day[idx] === 1 : true;
            const code = hourly.weather_code ? hourly.weather_code[idx] : 0;
            const hourWmo = this.getWmoInfo(code, hourIsDay);

            hourlyList.push({
                time: hourly.time[idx],
                tempC: hourly.temperature_2m[idx],
                apparentTempC: hourly.apparent_temperature ? hourly.apparent_temperature[idx] : hourly.temperature_2m[idx],
                humidity: hourly.relative_humidity_2m ? hourly.relative_humidity_2m[idx] : 0,
                precipProb: hourly.precipitation_probability ? hourly.precipitation_probability[idx] : 0,
                precipMm: hourly.precipitation ? hourly.precipitation[idx] : 0,
                windSpeedKmh: hourly.wind_speed_10m ? hourly.wind_speed_10m[idx] : 0,
                windDirectionDeg: hourly.wind_direction_10m ? hourly.wind_direction_10m[idx] : 0,
                uvIndex: hourly.uv_index ? hourly.uv_index[idx] : 0,
                cloudCover: hourly.cloud_cover ? hourly.cloud_cover[idx] : 0,
                visibilityM: hourly.visibility ? hourly.visibility[idx] : 10000,
                pressureHpa: hourly.surface_pressure ? hourly.surface_pressure[idx] : (cur.surface_pressure || 1013),
                wmo: hourWmo,
                isDay: hourIsDay
            });
        }

        // Parse Daily Forecast (7 days)
        const dailyList = [];
        const dayCount = (daily.time || []).length;
        for (let d = 0; d < dayCount; d++) {
            const code = daily.weather_code ? daily.weather_code[d] : 0;
            const dayWmo = this.getWmoInfo(code, true);

            dailyList.push({
                date: daily.time[d],
                maxTempC: daily.temperature_2m_max[d],
                minTempC: daily.temperature_2m_min[d],
                apparentMaxC: daily.apparent_temperature_max ? daily.apparent_temperature_max[d] : daily.temperature_2m_max[d],
                apparentMinC: daily.apparent_temperature_min ? daily.apparent_temperature_min[d] : daily.temperature_2m_min[d],
                sunrise: daily.sunrise ? daily.sunrise[d] : null,
                sunset: daily.sunset ? daily.sunset[d] : null,
                uvIndexMax: daily.uv_index_max ? daily.uv_index_max[d] : 0,
                precipSumMm: daily.precipitation_sum ? daily.precipitation_sum[d] : 0,
                precipProbMax: daily.precipitation_probability_max ? daily.precipitation_probability_max[d] : 0,
                windSpeedMaxKmh: daily.wind_speed_10m_max ? daily.wind_speed_10m_max[d] : 0,
                windDirectionDeg: daily.wind_direction_10m_dominant ? daily.wind_direction_10m_dominant[d] : 0,
                wmo: dayWmo
            });
        }

        // Calculate UV Index from hourly or daily
        const currentUv = (hourlyList.length > 0 && hourlyList[0].uvIndex !== undefined)
            ? hourlyList[0].uvIndex
            : (dailyList.length > 0 ? dailyList[0].uvIndexMax : 0);

        // Visibility in meters to km
        const currentVisibilityKm = (hourlyList.length > 0 && hourlyList[0].visibilityM !== undefined)
            ? (hourlyList[0].visibilityM / 1000)
            : 10.0;

        const currentData = {
            time: cur.time,
            tempC: cur.temperature_2m,
            apparentTempC: cur.apparent_temperature,
            humidity: cur.relative_humidity_2m,
            pressureHpa: cur.surface_pressure || cur.pressure_msl || 1013,
            windSpeedKmh: cur.wind_speed_10m,
            windDirectionDeg: cur.wind_direction_10m,
            windGustsKmh: cur.wind_gusts_10m || cur.wind_speed_10m,
            cloudCover: cur.cloud_cover !== undefined ? cur.cloud_cover : 0,
            precipitationMm: cur.precipitation || 0,
            uvIndex: currentUv,
            visibilityKm: currentVisibilityKm,
            isDay: isDay,
            wmo: wmoInfo,
            timezone: tz,
            elevation: raw.elevation || 0,
            sunrise: dailyList.length > 0 ? dailyList[0].sunrise : null,
            sunset: dailyList.length > 0 ? dailyList[0].sunset : null
        };

        const insights = this.generateDeterministicInsights(currentData, hourlyList, dailyList);

        return {
            current: currentData,
            hourly: hourlyList,
            daily: dailyList,
            insights: insights,
            timezone: tz,
            fetchedAt: new Date().toISOString()
        };
    }

    /**
     * WMO Weather Interpretation Codes (WMO 4677)
     * Maps codes (0-99) into human descriptions, icons, SVG representations, and theme vibes.
     */
    getWmoInfo(code, isDay = true) {
        // Fallback for null/undefined
        const wmoCode = typeof code === "number" ? code : 0;

        const wmoMap = {
            0: {
                condition: "Clear Sky",
                icon: isDay ? "☀️" : "🌙",
                iconType: isDay ? "sun" : "moon",
                theme: isDay ? "clear-day" : "clear-night",
                description: isDay ? "Sunny and clear skies" : "Clear starry night"
            },
            1: {
                condition: "Mainly Clear",
                icon: isDay ? "🌤️" : "🌤️",
                iconType: isDay ? "partly-cloudy-day" : "partly-cloudy-night",
                theme: isDay ? "partly-cloudy-day" : "partly-cloudy-night",
                description: "Scattered light clouds"
            },
            2: {
                condition: "Partly Cloudy",
                icon: isDay ? "⛅" : "☁️",
                iconType: isDay ? "partly-cloudy-day" : "partly-cloudy-night",
                theme: isDay ? "partly-cloudy-day" : "partly-cloudy-night",
                description: "Partly cloudy skies"
            },
            3: {
                condition: "Overcast",
                icon: "☁️",
                iconType: "cloudy",
                theme: "cloudy",
                description: "Dense cloud cover"
            },
            45: {
                condition: "Fog",
                icon: "🌫️",
                iconType: "fog",
                theme: "fog",
                description: "Reduced visibility in fog"
            },
            48: {
                condition: "Depositing Rime Fog",
                icon: "🌫️",
                iconType: "fog",
                theme: "fog",
                description: "Freezing rime fog"
            },
            51: {
                condition: "Light Drizzle",
                icon: "🌦️",
                iconType: "drizzle",
                theme: "rain",
                description: "Gentle light drizzle"
            },
            53: {
                condition: "Moderate Drizzle",
                icon: "🌧️",
                iconType: "drizzle",
                theme: "rain",
                description: "Steady drizzle"
            },
            55: {
                condition: "Dense Drizzle",
                icon: "🌧️",
                iconType: "drizzle",
                theme: "rain",
                description: "Heavy drizzle"
            },
            56: {
                condition: "Freezing Drizzle",
                icon: "🌨️",
                iconType: "sleet",
                theme: "snow",
                description: "Freezing light drizzle"
            },
            57: {
                condition: "Dense Freezing Drizzle",
                icon: "🌨️",
                iconType: "sleet",
                theme: "snow",
                description: "Heavy freezing drizzle"
            },
            61: {
                condition: "Slight Rain",
                icon: "🌦️",
                iconType: "rain",
                theme: "rain",
                description: "Intermittent light rain"
            },
            63: {
                condition: "Moderate Rain",
                icon: "🌧️",
                iconType: "rain",
                theme: "rain",
                description: "Steady rainfall"
            },
            65: {
                condition: "Heavy Rain",
                icon: "🌧️",
                iconType: "heavy-rain",
                theme: "rain",
                description: "Intense heavy rain"
            },
            66: {
                condition: "Light Freezing Rain",
                icon: "🌨️",
                iconType: "sleet",
                theme: "snow",
                description: "Light freezing rain"
            },
            67: {
                condition: "Heavy Freezing Rain",
                icon: "🌨️",
                iconType: "sleet",
                theme: "snow",
                description: "Heavy freezing rain"
            },
            71: {
                condition: "Slight Snow Fall",
                icon: "🌨️",
                iconType: "snow",
                theme: "snow",
                description: "Flurries and light snowfall"
            },
            73: {
                condition: "Moderate Snow Fall",
                icon: "❄️",
                iconType: "snow",
                theme: "snow",
                description: "Steady snowfall"
            },
            75: {
                condition: "Heavy Snow Fall",
                icon: "❄️",
                iconType: "blizzard",
                theme: "snow",
                description: "Heavy snow accumulations"
            },
            77: {
                condition: "Snow Grains",
                icon: "❄️",
                iconType: "snow",
                theme: "snow",
                description: "Frozen granular snow"
            },
            80: {
                condition: "Slight Rain Showers",
                icon: "🌦️",
                iconType: "rain",
                theme: "rain",
                description: "Passing rain showers"
            },
            81: {
                condition: "Moderate Rain Showers",
                icon: "🌧️",
                iconType: "rain",
                theme: "rain",
                description: "Moderate rain showers"
            },
            82: {
                condition: "Violent Rain Showers",
                icon: "⛈️",
                iconType: "heavy-rain",
                theme: "rain",
                description: "Torrential downpours"
            },
            85: {
                condition: "Slight Snow Showers",
                icon: "🌨️",
                iconType: "snow",
                theme: "snow",
                description: "Brief snow showers"
            },
            86: {
                condition: "Heavy Snow Showers",
                icon: "❄️",
                iconType: "blizzard",
                theme: "snow",
                description: "Severe snow showers"
            },
            95: {
                condition: "Thunderstorm",
                icon: "⛈️",
                iconType: "thunderstorm",
                theme: "thunderstorm",
                description: "Thunderstorm with lightning"
            },
            96: {
                condition: "Thunderstorm with Slight Hail",
                icon: "⛈️",
                iconType: "thunderstorm-hail",
                theme: "thunderstorm",
                description: "Thunderstorm with small hail"
            },
            99: {
                condition: "Thunderstorm with Heavy Hail",
                icon: "⛈️",
                iconType: "thunderstorm-hail",
                theme: "thunderstorm",
                description: "Severe thunderstorm with large hail"
            }
        };

        if (wmoMap[wmoCode]) {
            return wmoMap[wmoCode];
        }

        // Generic fallback for unlisted codes
        if (wmoCode >= 1 && wmoCode <= 3) {
            return wmoMap[2];
        } else if (wmoCode >= 51 && wmoCode <= 67) {
            return wmoMap[63];
        } else if (wmoCode >= 71 && wmoCode <= 86) {
            return wmoMap[73];
        } else if (wmoCode >= 95) {
            return wmoMap[95];
        }

        return wmoMap[0];
    }

    /**
     * Generate 100% deterministic, data-backed insights based on actual retrieved numbers.
     * No hallucinations, no LLM fictions, purely mathematical and meteorologically factual.
     */
    generateDeterministicInsights(cur, hourly, daily) {
        const insights = [];

        // 1. Current Temperature & Feel Analysis
        const tempDiff = cur.apparentTempC - cur.tempC;
        if (Math.abs(tempDiff) >= 2) {
            if (tempDiff > 0) {
                insights.push({
                    category: "Comfort",
                    icon: "🌡️",
                    text: `Feels like ${Math.round(cur.apparentTempC)}°C due to ${cur.humidity}% humidity (${Math.abs(Math.round(tempDiff))}°C higher than ambient).`
                });
            } else {
                insights.push({
                    category: "Comfort",
                    icon: "💨",
                    text: `Wind chill makes it feel like ${Math.round(cur.apparentTempC)}°C (${Math.abs(Math.round(tempDiff))}°C cooler than actual).`
                });
            }
        }

        // 2. Precipitation Probability & Timing in next 12 hours
        const next12Hours = hourly.slice(0, 12);
        const maxRainHour = next12Hours.reduce((max, h) => (h.precipProb > (max ? max.precipProb : -1) ? h : max), null);
        if (maxRainHour && maxRainHour.precipProb >= 35) {
            const hourFormatted = new Date(maxRainHour.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            insights.push({
                category: "Precipitation",
                icon: "🌧️",
                text: `${maxRainHour.precipProb}% chance of rain peaking around ${hourFormatted}. Carrying an umbrella is advised.`
            });
        } else {
            insights.push({
                category: "Precipitation",
                icon: "☂️",
                text: "No significant precipitation expected over the next 12 hours."
            });
        }

        // 3. UV Index Insight
        if (cur.uvIndex !== undefined) {
            if (cur.uvIndex >= 8) {
                insights.push({
                    category: "UV Protection",
                    icon: "☀️",
                    text: `Very High UV Index (${cur.uvIndex.toFixed(1)}). SPF 50+, hat, and sunglasses strongly recommended.`
                });
            } else if (cur.uvIndex >= 6) {
                insights.push({
                    category: "UV Protection",
                    icon: "🧴",
                    text: `High UV Index (${cur.uvIndex.toFixed(1)}). Sun protection is advised during midday hours.`
                });
            } else if (cur.uvIndex >= 3) {
                insights.push({
                    category: "UV Index",
                    icon: "🕶️",
                    text: `Moderate UV Index (${cur.uvIndex.toFixed(1)}). Wear sunglasses on clear days.`
                });
            } else if (cur.isDay) {
                insights.push({
                    category: "UV Index",
                    icon: "🌿",
                    text: `Low UV Index (${cur.uvIndex.toFixed(1)}). Minimal sun protection required.`
                });
            }
        }

        // 4. Wind Insight
        if (cur.windSpeedKmh >= 35) {
            insights.push({
                category: "Wind",
                icon: "🚩",
                text: `Strong winds at ${Math.round(cur.windSpeedKmh)} km/h with gusts up to ${Math.round(cur.windGustsKmh)} km/h.`
            });
        } else if (cur.windSpeedKmh >= 20) {
            insights.push({
                category: "Wind",
                icon: "🍃",
                text: `Moderate breeze at ${Math.round(cur.windSpeedKmh)} km/h from ${this.degToCompass(cur.windDirectionDeg)}.`
            });
        }

        // 5. Day Temperature Range Insight from Daily
        if (daily && daily.length > 0) {
            const today = daily[0];
            const range = Math.round(today.maxTempC - today.minTempC);
            insights.push({
                category: "Daily Outlook",
                icon: "📊",
                text: `Today's temperature spans from ${Math.round(today.minTempC)}°C to ${Math.round(today.maxTempC)}°C (${range}°C diurnal range).`
            });
        }

        return insights;
    }

    /**
     * Fetch Live Air Quality Data from Open-Meteo Air Quality API
     */
    async fetchAirQuality(latitude, longitude) {
        if (typeof latitude !== "number" || typeof longitude !== "number") {
            return null;
        }

        const cacheKey = `aqi_${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
        const now = Date.now();

        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (now - cached.timestamp < 10 * 60 * 1000) { // 10 min cache
                return cached.data;
            }
        }

        try {
            const params = new URLSearchParams({
                latitude: latitude.toString(),
                longitude: longitude.toString(),
                current: [
                    "european_aqi",
                    "us_aqi",
                    "pm10",
                    "pm2_5",
                    "nitrogen_dioxide",
                    "ozone",
                    "sulphur_dioxide"
                ].join(",")
            });

            const url = `${CONFIG.OPEN_METEO_AIR_QUALITY_URL}?${params.toString()}`;
            const res = await fetch(url);
            if (!res.ok) {
                console.warn(`Air quality API returned ${res.status}`);
                return null;
            }

            const data = await res.json();
            const cur = data.current || {};

            const usAqi = typeof cur.us_aqi === "number" ? Math.round(cur.us_aqi) : null;
            const euAqi = typeof cur.european_aqi === "number" ? Math.round(cur.european_aqi) : null;
            const aqiRating = this.getAqiRating(usAqi, euAqi);

            const result = {
                aqi: usAqi !== null ? usAqi : (euAqi !== null ? euAqi : "--"),
                aqiStandard: usAqi !== null ? "US AQI" : "European AQI",
                category: aqiRating.category,
                color: aqiRating.color,
                guidance: aqiRating.guidance,
                pollutants: {
                    pm25: typeof cur.pm2_5 === "number" ? cur.pm2_5.toFixed(1) : null,
                    pm10: typeof cur.pm10 === "number" ? cur.pm10.toFixed(1) : null,
                    no2: typeof cur.nitrogen_dioxide === "number" ? cur.nitrogen_dioxide.toFixed(1) : null,
                    o3: typeof cur.ozone === "number" ? cur.ozone.toFixed(1) : null,
                    so2: typeof cur.sulphur_dioxide === "number" ? cur.sulphur_dioxide.toFixed(1) : null
                },
                time: cur.time
            };

            this.cache.set(cacheKey, {
                timestamp: now,
                data: result
            });

            return result;
        } catch (err) {
            console.warn("Air quality fetch error:", err);
            return null;
        }
    }

    /**
     * Determine AQI Category, Color, and Guidance based on standard thresholds
     */
    getAqiRating(usAqi, euAqi) {
        if (usAqi !== null) {
            if (usAqi <= 50) return { category: "Good", color: "#10b981", guidance: "Air quality is satisfactory with little or no risk." };
            if (usAqi <= 100) return { category: "Moderate", color: "#f59e0b", guidance: "Acceptable quality; sensitive individuals should take care." };
            if (usAqi <= 150) return { category: "Unhealthy for Sensitive Groups", color: "#f97316", guidance: "General public not likely affected; sensitive groups may experience irritation." };
            if (usAqi <= 200) return { category: "Unhealthy", color: "#ef4444", guidance: "Increased likelihood of adverse effects in general public." };
            if (usAqi <= 300) return { category: "Very Unhealthy", color: "#8b5cf6", guidance: "Health alert: The risk of health effects is increased for everyone." };
            return { category: "Hazardous", color: "#be185d", guidance: "Health warning of emergency conditions: Avoid outdoor exertion." };
        }

        if (euAqi !== null) {
            if (euAqi <= 20) return { category: "Good", color: "#10b981", guidance: "Clean and pleasant air quality." };
            if (euAqi <= 40) return { category: "Fair", color: "#f59e0b", guidance: "Moderate air quality." };
            if (euAqi <= 60) return { category: "Moderate", color: "#f97316", guidance: "Moderate pollution levels." };
            if (euAqi <= 80) return { category: "Poor", color: "#ef4444", guidance: "High pollution levels." };
            return { category: "Very Poor", color: "#be185d", guidance: "Hazardous pollutant levels." };
        }

        return { category: "Unavailable", color: "#64748b", guidance: "Air quality telemetry unavailable for this coordinate." };
    }

    /**
     * Convert Wind degree to Compass cardinal direction
     */
    degToCompass(num) {
        const val = Math.floor((num / 22.5) + 0.5);
        const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
        return arr[(val % 16)];
    }

    /**
     * UV index rating descriptor
     */
    getUvRating(uv) {
        if (uv <= 2) return { label: "Low", color: "#10b981", guidance: "Minimal protection needed. Safe for outdoor activities." };
        if (uv <= 5) return { label: "Moderate", color: "#f59e0b", guidance: "Wear sunglasses, SPF 30+, and stay in shade during midday." };
        if (uv <= 7) return { label: "High", color: "#f97316", guidance: "Cover up, wear SPF 50+, hat, and sunglasses. Reduce sun exposure 11am-4pm." };
        if (uv <= 10) return { label: "Very High", color: "#ef4444", guidance: "Take extra precautions. Skin and eyes can burn quickly." };
        return { label: "Extreme", color: "#8b5cf6", guidance: "Avoid outdoor sun exposure during midday hours. Intense UV radiation." };
    }

    /**
     * Convert Celsius to Fahrenheit
     */
    cToF(c) {
        return (c * 9) / 5 + 32;
    }

    /**
     * Convert Fahrenheit to Celsius
     */
    fToC(f) {
        return ((f - 32) * 5) / 9;
    }

    /**
     * Convert km/h to mph
     */
    kmhToMph(kmh) {
        return kmh * 0.621371;
    }

    /**
     * Convert km to miles
     */
    kmToMiles(km) {
        return km * 0.621371;
    }
}

// Global instance
window.weatherService = new WeatherService();

